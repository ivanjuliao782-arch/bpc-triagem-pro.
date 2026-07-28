
import makeWASocket, { 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    downloadMediaMessage,
    normalizeMessageContent
} from '@whiskeysockets/baileys';
import { useSupabaseAuthState } from './src/lib/useSupabaseAuthState';
import { supabase } from './src/lib/supabase';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { SofiaEngine } from './src/sofia';
import pino from 'pino';
import QRCode from 'qrcode';
import * as dotenv from 'dotenv';

dotenv.config();

// Evita duplicação de conexões ativas
let activeSock: any = null;
let isConnecting = false;
const startupTime = Math.floor(Date.now() / 1000);

function isWhisperHallucination(text: string): boolean {
    if (!text) return false;
    const clean = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
    const hallucinations = [
        'obrigado',
        'obrigada',
        'muito obrigado',
        'muito obrigada',
        'thank you',
        'thank you so much',
        'you',
        'subtitles by',
        'assista',
        'youtube',
        'inscreva'
    ];
    return hallucinations.includes(clean);
}

interface UserBuffer {
    texts: string[];
    audioMessages: any[];
    messageKeys: any[];
    timeout: NodeJS.Timeout | null;
}

// Fila/Buffer global na memória do bot para debounce
const messageBuffers = new Map<string, UserBuffer>();

// Set global para travar o processamento ativo por número de telefone e ignorar concorrência
const processing = new Set<string>();

// Cache de IDs de mensagens processadas para evitar duplicidade em reconexões do Baileys
const processedMessageIds = new Set<string>();
const maxMessageIdCacheSize = 1000;
function isMessageDuplicate(msgId: string): boolean {
    if (processedMessageIds.has(msgId)) {
        return true;
    }
    processedMessageIds.add(msgId);
    // Remove o mais antigo se ultrapassar o limite
    if (processedMessageIds.size > maxMessageIdCacheSize) {
        const firstValue = processedMessageIds.values().next().value;
        if (firstValue !== undefined) {
            processedMessageIds.delete(firstValue);
        }
    }
    return false;
}

// Função auxiliar para extrair o conteúdo real de mensagens, tratando mensagens temporárias (ephemeral) e visualização única
function getMessageContent(msg: any) {
    if (!msg.message) return { text: null, isAudio: false, audioMessage: null };
    
    // Desembrulha de forma robusta e nativa todos os wrappers (ephemeral, viewOnce, etc.)
    const messageContent = normalizeMessageContent(msg.message);

    if (!messageContent) return { text: null, isAudio: false, audioMessage: null };

    let text: string | null = null;
    let isAudio = false;
    let audioMessage = null;

    if (messageContent.conversation) {
        text = messageContent.conversation;
    } else if (messageContent.extendedTextMessage?.text) {
        text = messageContent.extendedTextMessage.text;
    } else if (messageContent.imageMessage?.caption) {
        text = messageContent.imageMessage.caption;
    } else if (messageContent.videoMessage?.caption) {
        text = messageContent.videoMessage.caption;
    } else if (messageContent.audioMessage) {
        isAudio = true;
        audioMessage = messageContent.audioMessage;
    }

    return { text, isAudio, audioMessage };
}

async function connectToWhatsApp() {
    if (isConnecting) {
        console.log('⚠️ Tentativa de conexão ao WhatsApp já está em andamento. Ignorando chamada recursiva/duplicada.');
        return;
    }
    isConnecting = true;
    
    try {
        const { state, saveCreds } = await useSupabaseAuthState('sofia_principal');
        const { version } = await fetchLatestBaileysVersion();
        const sofia = new SofiaEngine();

        // Fecha a conexão antiga se houver uma ativa para evitar acúmulo de listeners e sockets abertos
        if (activeSock) {
            console.log('🔄 Fechando conexão anterior do WhatsApp para evitar duplicidade...');
            const oldSock = activeSock;
            activeSock = null; // Desmarca para evitar que o evento 'close' do oldSock dispare reconexão
            try {
                oldSock.ws.close();
            } catch (err) {
                console.error('Erro ao fechar conexão anterior:', err);
            }
        }

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: true,
            logger: pino({ level: 'silent' })
        });

        activeSock = sock;

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('--- GERANDO IMAGEM DO QR CODE ---');
                await QRCode.toFile('./qr.png', qr);
                console.log('✅ Imagem qr.png gerada com sucesso!');
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                console.log(`🔌 Conexão fechada. Código: ${statusCode}`);
                
                // Só reconecta se este socket ainda for o socket ativo
                if (sock === activeSock) {
                    if (statusCode === DisconnectReason.loggedOut) {
                        console.log('🚪 Sessão encerrada.');
                    } else {
                        console.log('🔄 Reconectando WhatsApp em 5 segundos...');
                        setTimeout(() => connectToWhatsApp(), 5000);
                    }
                } else {
                    console.log('ℹ️ Conexão antiga descartada, ignorando reconexão recursiva.');
                }
            } else if (connection === 'open') {
                console.log('✅ LARA CONECTADA E OUVINDO ÁUDIOS!');
                console.log('👤 Usuário conectado:', JSON.stringify(sock.user || {}, null, 2));

                // Inicia a rotina periódica de follow-up (a cada 1 minuto)
                const followupInterval = setInterval(() => {
                    if (activeSock === sock) {
                        checkFollowUps(sock);
                    } else {
                        clearInterval(followupInterval);
                    }
                }, 60000); // Roda a cada minuto
            }
        });

        // Função para acionar o processamento com debounce
        function triggerBufferProcess(fromRaw: string) {
            const buffer = messageBuffers.get(fromRaw);
            if (!buffer) return;

            // Cancela o timeout de debounce anterior para prorrogar o tempo enquanto o cliente envia mensagens
            if (buffer.timeout) {
                clearTimeout(buffer.timeout);
            }

            buffer.timeout = setTimeout(async () => {
                buffer.timeout = null;
                await processBuffer(fromRaw);
            }, 5000); // 5 segundos de debounce
        }

        // Função assíncrona para processar o buffer do usuário
        async function processBuffer(fromRaw: string) {
            const buffer = messageBuffers.get(fromRaw);
            if (!buffer) return;

            // Adiciona o número ao lock de processamento ativo
            processing.add(fromRaw);
            
            let textsToProcess: string[] = [];
            let audiosToProcess: any[] = [];
            let keysToProcess: any[] = [];

            try {
                textsToProcess = [...buffer.texts];
                audiosToProcess = [...buffer.audioMessages];
                keysToProcess = [...buffer.messageKeys];

                const from = fromRaw.replace(/\D/g, '');
                console.log(`🧠 Processando buffer de ${from} com ${textsToProcess.length} textos e ${audiosToProcess.length} áudios...`);

                let consolidatedText = textsToProcess.join(" \n ");

                // Transcreve áudios acumulados sequencialmente
                for (let i = 0; i < audiosToProcess.length; i++) {
                    const audioMsg = audiosToProcess[i];
                    console.log(`🎙️ Baixando/transcrevendo áudio ${i + 1}/${audiosToProcess.length} de ${from}...`);
                    try {
                        const media = await downloadMediaMessage(
                            audioMsg,
                            'buffer',
                            {},
                            { logger: undefined, reuploadRequest: sock.updateMediaMessage }
                        ) as Buffer;
                        if (media) {
                            const transcript = await sofia.transcribeAudio(media);
                            if (transcript) {
                                if (isWhisperHallucination(transcript)) {
                                    console.log(`⚠️ [HALLUCINATION] Ignorando áudio de ${from} por provável alucinação do Whisper: "${transcript}"`);
                                    continue;
                                }
                                if (consolidatedText) {
                                    consolidatedText += ` \n [Áudio ${i + 1} Transcrito]: ${transcript}`;
                                } else {
                                    consolidatedText = transcript;
                                }
                            }
                        }
                    } catch (errDownload) {
                        console.error("Erro ao baixar/transcrever áudio no buffer:", errDownload);
                    }
                }

                if (consolidatedText) {
                    // Marca mensagens como lidas
                    for (const key of keysToProcess) {
                        try {
                            await sock.readMessages([key]);
                        } catch (errRead) {
                            console.warn("Erro ao marcar mensagem como lida:", errRead);
                        }
                    }

                    console.log(`🧠 Lara processando entrada do buffer de ${from}: "${consolidatedText.substring(0, 100)}..."`);
                    const reply = await sofia.processMessage(from, consolidatedText);

                    // Mantém o "digitando..." por 3 segundos
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await sock.sendPresenceUpdate('paused', fromRaw);

                    if (reply) {
                        try {
                            const sent = await sock.sendMessage(fromRaw, { text: reply });
                            console.log(`✅ Resposta enviada com sucesso para ${fromRaw}. Message ID: ${sent?.key?.id}`);
                        } catch (errSend) {
                            console.error(`❌ Erro ao enviar mensagem para ${fromRaw}:`, errSend);
                        }
                    }
                } else {
                    await sock.sendPresenceUpdate('paused', fromRaw);
                }
            } catch (error) {
                console.error(`❌ Erro crítico ao processar buffer do usuário ${fromRaw}:`, error);
            } finally {
                // Remove o número do lock de processamento ativo
                processing.delete(fromRaw);
                
                // Remove apenas as mensagens processadas do buffer
                const buffer = messageBuffers.get(fromRaw);
                if (buffer) {
                    buffer.texts = buffer.texts.slice(textsToProcess.length);
                    buffer.audioMessages = buffer.audioMessages.slice(audiosToProcess.length);
                    buffer.messageKeys = buffer.messageKeys.slice(keysToProcess.length);

                    // Se houver novas mensagens acumuladas no buffer, reagenda o processamento imediato/debounce
                    if (buffer.texts.length > 0 || buffer.audioMessages.length > 0) {
                        console.log(`🔄 Há ${buffer.texts.length} novas mensagens acumuladas no buffer de ${fromRaw}. Reagendando...`);
                        triggerBufferProcess(fromRaw);
                    } else {
                        // Limpa o mapa se o buffer estiver totalmente vazio
                        messageBuffers.delete(fromRaw);
                    }
                }
            }
        }

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            // SEGURANÇA 1: Garante que apenas o socket ativo processe mensagens
            if (sock !== activeSock) {
                console.log("ℹ️ Evento messages.upsert ignorado: pertence a um socket inativo/antigo.");
                return;
            }

            if (type === 'notify' || type === 'append') {
                const nowSeconds = Math.floor(Date.now() / 1000);
                for (const msg of messages) {
                    const selfJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
                    const isSelf = msg.key.remoteJid === selfJid;
                    const content = getMessageContent(msg);
                    const isTestMessage = content.text && content.text.includes('Oi, meu nome é Maria, perdi meu marido há 3 dias');

                    if ((!msg.key.fromMe || (isSelf && isTestMessage)) && msg.message) {
                        console.log("DEBUG MSG KEY:", JSON.stringify(msg.key));
                        let fromRaw = msg.key.remoteJid!;
                        
                        // Se o remoteJid for do tipo @lid, tenta usar o remoteJidAlt ou participantAlt
                        if (fromRaw.endsWith('@lid')) {
                            const altJid = (msg.key as any).remoteJidAlt || (msg.key as any).participantAlt;
                            if (altJid) {
                                console.log(`🔄 Convertendo LID ${fromRaw} para JID normal: ${altJid}`);
                                fromRaw = altJid;
                            }
                        }
                        
                        const from = fromRaw.replace(/\D/g, ''); // Limpa o ID e pega só os números
                        
                        // Se for um grupo ou status, ignora
                        if (fromRaw.includes('@g.us') || fromRaw === 'status@broadcast') continue;

                        // --- SEGURANÇA 3: Ignorar mensagens antigas/históricas no startup ou reconexão ---
                        const msgTime = typeof msg.messageTimestamp === 'number' 
                            ? msg.messageTimestamp 
                            : (msg.messageTimestamp?.low || 0);

                        if (msgTime < startupTime - 15 || nowSeconds - msgTime > 3600) {
                            console.log(`ℹ️ Ignorando mensagem histórica/antiga de ${from} (enviada há ${nowSeconds - msgTime}s)`);
                            continue;
                        }

                        // --- SEGURANÇA 4: Deduplicação de IDs de mensagens em memória ---
                        if (msg.key.id && isMessageDuplicate(msg.key.id)) {
                            console.log(`⚠️ Mensagem duplicada ignorada (ID: ${msg.key.id}) de ${from}`);
                            continue;
                        }

                        // --- Forçar entrega imediata (DOIS RISQUINHOS CINZAS) no celular do cliente (sem await para evitar Yields) ---
                        sock.sendReceipt(fromRaw, msg.key.participant || undefined, [msg.key.id!], 'delivery').catch(errReceipt => {
                            console.warn("Erro ao enviar confirmação de entrega:", errReceipt);
                        });
                        
                        // Inicializa o buffer para esse contato se não existir
                        if (!messageBuffers.has(fromRaw)) {
                            messageBuffers.set(fromRaw, { texts: [], audioMessages: [], timeout: null, messageKeys: [] });
                        }

                        const buffer = messageBuffers.get(fromRaw)!;
                        buffer.messageKeys.push(msg.key);

                        // Verifica e extrai o conteúdo da mensagem (texto ou áudio)
                        const content = getMessageContent(msg);
                        let hasContent = false;

                        if (content.text) {
                            buffer.texts.push(content.text);
                            hasContent = true;
                        } else if (content.isAudio) {
                            console.log(`🎙️ Áudio recebido de ${from}. Adicionado ao buffer.`);
                            buffer.audioMessages.push(msg);
                            hasContent = true;
                        }

                        if (!hasContent) continue;

                        // Mostra status de digitando... para o cliente (sem await para evitar Yields)
                        sock.sendPresenceUpdate('composing', fromRaw).catch(errPresence => {
                            console.warn("Erro ao enviar status de digitando:", errPresence);
                        });

                        // Só aciona o processamento do buffer se não estiver com processamento ativo.
                        // Se estiver ativo, a mensagem permanece no buffer e será disparada no 'finally' do processBuffer
                        if (!processing.has(fromRaw)) {
                            triggerBufferProcess(fromRaw);
                        } else {
                            console.log(`⏳ Mensagem de ${from} acumulada no buffer (processamento ativo ocupado).`);
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error('❌ Erro crítico ao conectar ao WhatsApp:', err);
    } finally {
        isConnecting = false;
    }
}

function getGreetingBrazil(): string {
    const tz = 'America/Sao_Paulo';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: tz,
        hour: 'numeric',
        hour12: false
    });
    const hour = parseInt(formatter.format(now), 10);

    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
}

async function checkFollowUps(sock: any) {
    if (!sock) return;
    try {
        const { data: sessions, error } = await supabase
            .from('sofia_sessions')
            .select('*');

        if (error) {
            console.error('❌ Erro ao buscar sessões para follow-up:', error);
            return;
        }

        const now = Date.now();
        
        // Tempos em milissegundos (parametrizáveis via env para testes)
        // Padrão: 72 horas para enviar o follow-up
        const FOLLOWUP_TIMEOUT = process.env.TEST_FOLLOWUP_TIMEOUT 
            ? parseInt(process.env.TEST_FOLLOWUP_TIMEOUT, 10) 
            : 72 * 60 * 60 * 1000;

        // Padrão: 24 horas para encerrar após o follow-up
        const CLOSE_TIMEOUT = process.env.TEST_CLOSE_TIMEOUT 
            ? parseInt(process.env.TEST_CLOSE_TIMEOUT, 10) 
            : 24 * 60 * 60 * 1000;

        for (const session of sessions) {
            const userData = session.user_data || {};
            const stateFsm = userData.state_fsm;
            const status = userData.status || 'novo_lead';
            
            // Só faz follow-up se não estiver encerrado e não for atendimento humano ativo
            if (stateFsm === 'FINISHED' || status === 'em_atendimento' || status === 'com_advogado' || status === 'perdidos' || status === 'fechados') {
                continue;
            }

            const lastInteractionTime = new Date(session.last_interaction).getTime();
            const timeSinceLastInteraction = now - lastInteractionTime;

            // CASO 1: Enviar o follow-up de 72h
            if (!userData.followup_sent && timeSinceLastInteraction >= FOLLOWUP_TIMEOUT) {
                const phone = session.phone;
                const nome = userData.nome_usuario || 'amigo(a)';
                const saudacao = getGreetingBrazil();
                const textMsg = `${saudacao}, ${nome}! Podemos encerrar o nosso atendimento ou prefere continuar?`;

                console.log(`⏰ [FOLLOW-UP] Enviando follow-up para ${phone} (${timeSinceLastInteraction}ms inativo)...`);
                
                // Envia a mensagem pelo WhatsApp
                try {
                    const jid = `${phone}@s.whatsapp.net`;
                    await sock.sendMessage(jid, { text: textMsg });
                    
                    // Salva no histórico da sessão
                    const oldHistory = userData.history || [];
                    const newHistory = [...oldHistory, { role: 'assistant', content: textMsg }];
                    
                    const updates = {
                        ...userData,
                        followup_sent: true,
                        followup_sent_at: new Date().toISOString(),
                        history: newHistory
                    };

                    await supabase.rpc('save_session_data', {
                        p_phone: phone,
                        p_step: session.step || null,
                        p_user_data_updates: updates
                    });
                    
                    console.log(`✅ [FOLLOW-UP] Mensagem enviada e salva com sucesso para ${phone}.`);
                } catch (sendErr) {
                    console.error(`❌ [FOLLOW-UP] Erro ao enviar mensagem para ${phone}:`, sendErr);
                }
            }
            
            // CASO 2: Encerrar automaticamente 24h após o follow-up
            if (userData.followup_sent && userData.followup_sent_at) {
                const sentTime = new Date(userData.followup_sent_at).getTime();
                const timeSinceSent = now - sentTime;

                if (timeSinceSent >= CLOSE_TIMEOUT) {
                    const phone = session.phone;
                    console.log(`⏰ [FOLLOW-UP] Encerrando sessão de ${phone} por inatividade (${timeSinceSent}ms após follow-up)...`);
                    
                    const updates = {
                        ...userData,
                        state_fsm: 'FINISHED',
                        status: 'perdidos',
                        status_final: 'Reprovado',
                        followup_sent: false,
                        followup_sent_at: null
                    };

                    await supabase.rpc('save_session_data', {
                        p_phone: phone,
                        p_step: 'finished',
                        p_user_data_updates: updates
                    });
                    
                    console.log(`✅ [FOLLOW-UP] Sessão de ${phone} encerrada automaticamente.`);
                }
            }
        }
    } catch (err) {
        console.error('❌ Erro na rotina de checkFollowUps:', err);
    }
}

connectToWhatsApp();

// Mantém o processo vivo
process.stdin.resume();

// Garantia absoluta de que o processo não vai fechar
setInterval(() => {
    // Mantém o event loop ocupado
}, 1000 * 60 * 60);



import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    downloadMediaMessage
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { SofiaEngine } from './src/sofia';
import pino from 'pino';
import QRCode from 'qrcode';
import * as dotenv from 'dotenv';

dotenv.config();

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    const sofia = new SofiaEngine();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('--- GERANDO IMAGEM DO QR CODE ---');
            await QRCode.toFile('./qr.png', qr);
            console.log('✅ Imagem qr.png gerada com sucesso!');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ SOFIA CONECTADA E OUVINDO ÁUDIOS!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                if (!msg.key.fromMe && msg.message) {
                    const fromRaw = msg.key.remoteJid!;
                    const from = fromRaw.replace(/\D/g, ''); // Limpa o ID e pega só os números
                    
                    // Se for um grupo ou status, ignora (opcional, mas bom pra evitar bugs)
                    if (fromRaw.includes('@g.us') || fromRaw === 'status@broadcast') continue;
                    // --- NOVO: Marcar como lida (setinhas azuis) ---
                    await sock.readMessages([msg.key]);
                    
                    let input: string | Buffer = "";

                    if (msg.message.conversation) {
                        input = msg.message.conversation;
                    } else if (msg.message.extendedTextMessage?.text) {
                        input = msg.message.extendedTextMessage.text;
                    } else if (msg.message.audioMessage) {
                        console.log(`🎙️ Áudio recebido de ${from}. Baixando...`);
                        input = await downloadMediaMessage(msg, 'buffer', {}) as Buffer;
                    }

                    if (input) {
                        console.log(`🧠 Sofia processando entrada do telefone ${from} (JID: ${fromRaw})...`);
                        const reply = await sofia.processMessage(from, input); // Aqui vai o número limpo (banco de dados)
                        await sock.sendMessage(fromRaw, { text: reply });     // Aqui vai o ID completo pro WhatsApp entregar
                        console.log(`✅ Resposta enviada para ${fromRaw}`);
                    }
                }
            }
        }
    });
}

connectToWhatsApp();

// Mantém o processo vivo
process.stdin.resume();

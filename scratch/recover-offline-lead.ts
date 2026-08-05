import makeWASocket, { 
    DisconnectReason,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { useSupabaseAuthState } from './src/lib/useSupabaseAuthState';
import { supabase } from './src/lib/supabase';
import pino from 'pino';
import * as dotenv from 'dotenv';
import { SofiaEngine } from './src/sofia';

dotenv.config();

async function runRecovery() {
  console.log('Iniciando script de recuperação de lead offline...');
  
  const { state, saveCreds } = await useSupabaseAuthState();
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });
  
  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log('✅ Conexão com WhatsApp estabelecida para recuperação!');
      
      const targetLid = '278104148856949@lid';
      const targetJid = '553287162409@s.whatsapp.net';
      
      console.log(`Buscando mensagens do LID: ${targetLid}...`);
      try {
        const messagesLid = await sock.fetchMessagesFromWA(targetLid, 5);
        console.log(`Mensagens do LID (${messagesLid.length} encontradas):`);
        for (const msg of messagesLid) {
          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
          console.log(`- [${msg.key.fromMe ? 'Bot' : 'Cliente'}] (ID: ${msg.key.id}): "${text}"`);
        }
      } catch (err: any) {
        console.error('Erro ao buscar mensagens do LID:', err.message || err);
      }
      
      console.log(`\nBuscando mensagens do JID: ${targetJid}...`);
      try {
        const messagesJid = await sock.fetchMessagesFromWA(targetJid, 5);
        console.log(`Mensagens do JID (${messagesJid.length} encontradas):`);
        for (const msg of messagesJid) {
          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
          console.log(`- [${msg.key.fromMe ? 'Bot' : 'Cliente'}] (ID: ${msg.key.id}): "${text}"`);
        }
      } catch (err: any) {
        console.error('Erro ao buscar mensagens do JID:', err.message || err);
      }
      
      // Encerra após buscar
      console.log('\nFinalizando conexão...');
      sock.logout();
      process.exit(0);
    } else if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (!shouldReconnect) {
        console.log('Conexão encerrada pelo script.');
        process.exit(0);
      }
    }
  });
}

runRecovery().catch(console.error);

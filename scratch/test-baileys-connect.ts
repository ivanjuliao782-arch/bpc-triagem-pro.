import makeWASocket, { 
    DisconnectReason, 
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { useSupabaseAuthState } from '../src/lib/useSupabaseAuthState';
import pino from 'pino';

async function testConnection() {
  console.log('🔄 Running connection test with full error logging...');
  const { state } = await useSupabaseAuthState('sofia_principal');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version: [2, 3000, 1044015310],
    browser: ['Windows', 'Chrome', '120.0.0.0'],
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'debug' }) // Enable debug logs to see exact network/auth updates!
  });

  sock.ev.on('connection.update', (update) => {
    console.log('--- CONNECTION UPDATE ---');
    console.log(JSON.stringify(update, null, 2));

    if (update.connection === 'close') {
      const error = update.lastDisconnect?.error;
      console.log('Error details:', error);
      process.exit(1);
    }
  });
}

testConnection();

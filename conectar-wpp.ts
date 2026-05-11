
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { SofiaEngine } from './src/lib/sofia';
import * as dotenv from 'dotenv';

dotenv.config();

const sofia = new SofiaEngine();
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('--- ESCANEIE O QR CODE ABAIXO PARA CONECTAR A SOFIA ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ SOFIA CONECTADA AO WHATSAPP!');
});

client.on('message', async (msg) => {
    // Ignorar mensagens de grupos
    if (msg.from.includes('@g.us')) return;

    console.log(`Mensagem de ${msg.from}: ${msg.body}`);
    
    try {
        const reply = await sofia.processMessage(msg.from, msg.body);
        await msg.reply(reply);
        console.log(`Sofia respondeu: ${reply}`);
    } catch (e) {
        console.error('Erro ao processar mensagem:', e);
    }
});

client.initialize();

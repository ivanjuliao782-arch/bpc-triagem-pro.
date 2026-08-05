import { fetchLatestBaileysVersion } from '@whiskeysockets/baileys';

async function testVersion() {
  try {
    const result = await fetchLatestBaileysVersion();
    console.log('Latest Baileys Version fetched successfully:', result);
  } catch (err: any) {
    console.error('Error fetching version:', err);
  }
}

testVersion();

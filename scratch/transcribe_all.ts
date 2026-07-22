import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const dirPath = "c:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\Lara escritorio Dra. Monica";
  const files = fs.readdirSync(dirPath).sort();
  const outPath = "c:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\scratch\\all_image_transcripts.txt";
  
  // Clean start or read existing
  let processedFiles = new Set<string>();
  if (fs.existsSync(outPath)) {
    const content = fs.readFileSync(outPath, 'utf8');
    const matches = content.match(/=== (.*?) ===/g);
    if (matches) {
      for (const match of matches) {
        const name = match.replace(/=== /g, '').replace(/ ===/g, '').trim();
        processedFiles.add(name);
      }
    }
  }

  for (const file of files) {
    if (!file.endsWith('.jpeg') && !file.endsWith('.png')) continue;
    if (processedFiles.has(file)) {
      console.log(`Skipping already processed: ${file}`);
      continue;
    }
    
    console.log(`Analyzing: ${file}`);
    const filePath = path.join(dirPath, file);
    const imageBuffer = fs.readFileSync(filePath);
    
    let success = false;
    let attempts = 0;
    while (!success && attempts < 3) {
      try {
        attempts++;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([
          {
            inlineData: {
              data: imageBuffer.toString("base64"),
              mimeType: file.endsWith('.png') ? "image/png" : "image/jpeg"
            }
          },
          "Esta é uma imagem de conversa de WhatsApp. Transcreva detalhadamente a conversa contida nela, mostrando quem enviou cada mensagem (remetente/destinatário, verde/branco), o texto exato da mensagem e a hora. Indique também se há emojis nas mensagens."
        ]);
        
        const text = result.response.text();
        const report = `=== ${file} ===\n${text}\n\n`;
        fs.appendFileSync(outPath, report);
        console.log(`Done: ${file}`);
        success = true;
        // Wait 15s to respect rate limits
        await sleep(15000);
      } catch (e: any) {
        console.error(`Error on ${file} (attempt ${attempts}):`, e.message);
        if (e.message.includes("Too Many Requests") || e.message.includes("quota")) {
          console.log("Waiting 35s for quota reset...");
          await sleep(35000);
        } else {
          await sleep(5000);
        }
      }
    }
  }
}

run();

import * as dotenv from 'dotenv';

dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY não encontrada no .env");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

  try {
    console.log("Consultando modelos disponíveis na versão estável (v1) da API da Google...");
    const response = await fetch(url);
    const data = await response.json() as any;

    if (data.error) {
      console.error("❌ Erro retornado pela Google:", data.error.message);
      return;
    }

    if (data.models && data.models.length > 0) {
      console.log("\n✅ Modelos disponíveis para a sua chave:");
      data.models.forEach((m: any) => {
        // Exibe apenas o nome simplificado do modelo
        const shortName = m.name.replace("models/", "");
        console.log(`- ${shortName} (${m.supportedGenerationMethods.join(', ')})`);
      });
    } else {
      console.log("Nenhum modelo listado.");
    }
  } catch (err: any) {
    console.error("❌ Erro ao conectar na API da Google:", err.message);
  }
}

listModels();

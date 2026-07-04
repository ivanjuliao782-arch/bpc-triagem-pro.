import * as dotenv from 'dotenv';

dotenv.config();

async function testRawAPI() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`Chave sendo testada: ${apiKey?.substring(0, 10)}...`);

  // URL estável para verificar se o modelo existe e está acessível com esta chave
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash?key=${apiKey}`;

  try {
    const res = await fetch(url);
    const status = res.status;
    const body = await res.json() as any;

    console.log(`\nStatus HTTP: ${status}`);
    console.log("Resposta bruta da Google:");
    console.log(JSON.stringify(body, null, 2));

    if (status === 200) {
      console.log("\n✅ A CHAVE ESTÁ FUNCIONANDO E O MODELO ESTÁ DISPONÍVEL!");
    } else {
      console.log("\n❌ A CHAVE NÃO TEM ACESSO AO GEMINI.");
      if (body.error?.message?.includes("API key not valid")) {
        console.log("👉 Motivo: A chave copiada é inválida ou tem erro de digitação.");
      } else {
        console.log("👉 Motivo: A API de Linguagem Generativa não está ativa neste projeto/chave.");
      }
    }
  } catch (err: any) {
    console.error("Erro na requisição:", err.message);
  }
}

testRawAPI();

async function getPublicIP() {
  console.log("Consultando o seu IP público atual para a senha do túnel...");
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json() as any;
    console.log(`\n✅ O SEU IP PÚBLICO É: ${data.ip}`);
    console.log("👉 Essa é a senha exata que o localtunnel pede na tela!");
  } catch (err: any) {
    console.error("Erro ao obter IP público:", err.message);
  }
}

getPublicIP();

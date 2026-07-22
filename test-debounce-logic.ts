// Simulação da lógica de debounce de silêncio
const messageBuffers = new Map<string, {
    texts: string[];
    timeout: any;
}>();

function receiveMessageSimulated(fromRaw: string, text: string, onProcess: (consolidated: string) => void) {
    if (!messageBuffers.has(fromRaw)) {
        messageBuffers.set(fromRaw, { texts: [], timeout: null });
    }

    const buffer = messageBuffers.get(fromRaw)!;
    buffer.texts.push(text);

    if (buffer.timeout) {
        clearTimeout(buffer.timeout);
    }

    buffer.timeout = setTimeout(() => {
        const activeBuffer = messageBuffers.get(fromRaw);
        if (!activeBuffer) return;
        messageBuffers.delete(fromRaw);

        const consolidated = activeBuffer.texts.join(" \n ");
        onProcess(consolidated);
    }, 2000); // Usamos 2 segundos na simulação para o teste ser mais rápido
}

console.log("--- INICIANDO SIMULAÇÃO DE DEBOUNCE POR SILÊNCIO ---");
const startTime = Date.now();

const log = (msg: string) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${elapsed}s] ${msg}`);
};

// Envia 5 mensagens, uma a cada 400ms (total de 1.6 segundos enviando mensagens)
const messages = ["Mensagem 1", "Mensagem 2", "Mensagem 3", "Mensagem 4", "Mensagem 5"];
let count = 0;

const interval = setInterval(() => {
    if (count < messages.length) {
        log(`Recebida: "${messages[count]}"`);
        receiveMessageSimulated("cliente-teste", messages[count], (consolidated) => {
            log(`🔥 FOGO! Processando consolidado:\n---\n${consolidated}\n---`);
        });
        count++;
    } else {
        clearInterval(interval);
    }
}, 400);

// Mantém o script rodando tempo suficiente para o timeout disparar após o silêncio
setTimeout(() => {
    console.log("\n--- SIMULAÇÃO CONCLUÍDA ---");
}, 5000);

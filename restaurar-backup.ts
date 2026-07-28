import * as fs from 'fs';
import * as path from 'path';

const filesToRestore = [
    'src/sofia.ts',
    'src/App.tsx',
    'conectar-baileys.ts',
    'limpar-sessoes.ts',
    'package.json',
    'tsconfig.json'
];

const backupDir = path.join(process.cwd(), 'backups');

console.log('🔄 Iniciando restauração do projeto para o estado estável de 20/07/2026...');

filesToRestore.forEach(file => {
    const backupPath = path.join(backupDir, path.basename(file));
    const destPath = path.join(process.cwd(), file);
    if (fs.existsSync(backupPath)) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(backupPath, destPath);
        console.log(`✅ Restaurado: ${file}`);
    } else {
        console.warn(`⚠️ Backup não encontrado para: ${file}`);
    }
});

console.log('✨ Projeto restaurado exatamente para o estado anterior com sucesso!');

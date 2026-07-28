import * as fs from 'fs';
import * as path from 'path';

const filesToBackup = [
    'src/sofia.ts',
    'src/App.tsx',
    'conectar-baileys.ts',
    'limpar-sessoes.ts',
    'package.json',
    'tsconfig.json'
];

const backupDir = path.join(process.cwd(), 'backups');

if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

console.log('📦 Criando backup do estado estável atual do projeto...');

filesToBackup.forEach(file => {
    const srcPath = path.join(process.cwd(), file);
    const destPath = path.join(backupDir, path.basename(file));
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Backup criado para: ${file}`);
    } else {
        console.warn(`⚠️ Arquivo original não encontrado: ${file}`);
    }
});

console.log('✨ Backup concluído com sucesso na pasta /backups!');

import fs from 'fs';
import path from 'path';

const appPath = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\App.tsx';

function fixKPIs() {
  if (!fs.existsSync(appPath)) {
    console.error('App.tsx not found.');
    return;
  }
  
  let content = fs.readFileSync(appPath, 'utf8');
  
  // Find and replace the onClick for Conversões
  const targetPattern = /label="Conversões"[\s\S]*?onClick=\{\(\) => setActiveTab\('leads'\)\}/;
  
  if (targetPattern.test(content)) {
    content = content.replace(
      targetPattern,
      `label="Conversões"\n                  value={kpis.closed}\n                  trend="Fechados"\n                  icon={<CheckCircle2 size={16} />}\n                  color="text-emerald-400"\n                  onClick={() => setActiveTab('relatorios')}`
    );
    fs.writeFileSync(appPath, content, 'utf8');
    console.log('✅ App.tsx Conversões card successfully updated!');
  } else {
    console.error('❌ Could not find the Conversões card match in App.tsx');
  }
}

fixKPIs();

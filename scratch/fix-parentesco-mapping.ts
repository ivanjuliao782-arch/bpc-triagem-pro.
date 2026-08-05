import fs from 'fs';
import path from 'path';

const appPath = 'C:\\Users\\gabri\\Downloads\\bpc-triagem-pro\\src\\App.tsx';

function fixParentesco() {
  if (!fs.existsSync(appPath)) {
    console.error('App.tsx not found');
    return;
  }

  let content = fs.readFileSync(appPath, 'utf8');

  // 1. Add beneficiario_terceiro to Lead interface
  const interfaceTarget = 'bpc_parentesco?: string;';
  if (content.includes(interfaceTarget) && !content.includes('beneficiario_terceiro?: string;')) {
    content = content.replace(
      interfaceTarget,
      `bpc_parentesco?: string;\n  beneficiario_terceiro?: string;`
    );
  }

  // 2. Update mapping in return block of fetchLeads
  const mappingTarget = 'bpc_parentesco: userData.bpc_parentesco || undefined,';
  const mappingReplacement = `bpc_parentesco: userData.bpc_parentesco || userData.beneficiario_terceiro || undefined,\n            beneficiario_terceiro: userData.beneficiario_terceiro || undefined,`;

  if (content.includes(mappingTarget)) {
    content = content.replace(mappingTarget, mappingReplacement);
    fs.writeFileSync(appPath, content, 'utf8');
    console.log('✅ App.tsx parentesco mapping successfully updated!');
  } else {
    console.error('❌ Could not find mappingTarget in App.tsx');
  }
}

fixParentesco();

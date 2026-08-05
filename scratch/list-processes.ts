import { exec } from 'child_process';

exec('wmic process where "name=\'node.exe\'" get ProcessID,CommandLine', (err, stdout, stderr) => {
  if (err) {
    console.error('Error running wmic:', err);
    return;
  }
  console.log('--- RUNNING NODE PROCESSES ---');
  console.log(stdout);
});

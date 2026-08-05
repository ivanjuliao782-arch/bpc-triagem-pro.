async function fetchWppConnectVersion() {
  console.log('Fetching wa-version json from wppconnect-team...');
  try {
    const res = await fetch('https://raw.githubusercontent.com/wppconnect-team/wa-version/main/versions.json');
    const data = await res.json();
    console.log('Found versions data:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Error fetching:', err);
  }
}

fetchWppConnectVersion();

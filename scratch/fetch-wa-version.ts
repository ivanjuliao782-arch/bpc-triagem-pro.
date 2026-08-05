
async function fetchRealWhatsAppVersion() {
  console.log('Fetching web.whatsapp.com to extract current version...');
  try {
    const res = await fetch('https://web.whatsapp.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    
    // Look for patterns like "manifest-x.x.x.json" or version strings in scripts
    const matches = html.match(/manifest-([\d\.]+)\.json/);
    if (matches) {
      console.log('Found manifest version match:', matches[1]);
    } else {
      console.log('Could not find manifest match.');
      // Try another regex for app version in scripts
      const versionMatch = html.match(/\"clientVersion\":\"([\d\.]+)\"/);
      if (versionMatch) {
        console.log('Found clientVersion in script:', versionMatch[1]);
      } else {
        // Let's print first 1000 characters of HTML to inspect
        console.log('HTML snippet:', html.substring(0, 1500));
      }
    }
  } catch (err: any) {
    console.error('Error fetching:', err);
  }
}

fetchRealWhatsAppVersion();

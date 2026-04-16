const https = require('https');
https.get('https://docs.google.com/spreadsheets/d/1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8/edit', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const matches = [...data.matchAll(/class="docs-sheet-tab-name"[^>]*>([^<]+)<\/span>/g)];
    const sheets = matches.map(m => m[1]);
    console.log("SHEETS FOUND:", sheets);
  });
});

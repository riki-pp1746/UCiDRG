const fs = require('fs');
let content = fs.readFileSync('src/pages/ComparisonPage.tsx', 'utf8');
content = content.replace(/rataIDRG/g, 'rataINACBG');
content = content.replace(/selisihNominal/g, 'selisihINACBG');
content = content.replace(/selisihPersen/g, 'selisihPersenINACBG');
content = content.replace(/status/g, 'statusINACBG');
fs.writeFileSync('src/pages/ComparisonPage.tsx', content);

const fs = require('fs');
const files = [
  'src/components/costing/RVUInputForm.tsx',
  'src/pages/ComparisonPage.tsx',
  'src/pages/DashboardPage.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<ResponsiveContainer width="100%"/g, '<ResponsiveContainer width="99%"');
  fs.writeFileSync(file, content);
}

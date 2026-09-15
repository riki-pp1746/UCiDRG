const fs = require('fs');

function repl(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/Tarif iDRG/g, 'Tarif INA-CBG');
  content = content.replace(/vs iDRG/g, 'vs INA-CBG');
  content = content.replace(/INACBG\/iDRG/g, 'INA-CBG');
  content = content.replace(/iDRG\/INACBG/g, 'INA-CBG');
  content = content.replace(/iDRG Info/g, 'INA-CBG Info');
  content = content.replace(/Data INACBG/g, 'Data INA-CBG');
  content = content.replace(/INACBG \(\.TXT\)/g, 'INA-CBG (.TXT)');
  fs.writeFileSync(file, content);
}

repl('src/pages/DashboardPage.tsx');
repl('src/pages/ComparisonPage.tsx');
repl('src/pages/ReportPage.tsx');
repl('src/pages/CostingInputPage.tsx');
repl('src/pages/UploadPage.tsx');
repl('src/components/layout/AppLayout.tsx');

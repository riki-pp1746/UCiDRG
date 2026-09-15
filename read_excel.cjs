const XLSX = require('xlsx');
const workbook = XLSX.readFile('C:/UnitCOSt PRO/Template Costing.xlsx');
const sheet_name_list = workbook.SheetNames;
console.log('Sheets:', sheet_name_list);
for (const sheet of sheet_name_list) {
  const ws = workbook.Sheets[sheet];
  const data = XLSX.utils.sheet_to_json(ws, {header: 1});
  console.log(\n--- Sheet:  ---);
  for (let i=0; i<Math.min(15, data.length); i++) {
    console.log(data[i]);
  }
}

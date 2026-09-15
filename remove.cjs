const fs = require('fs');
let s = fs.readFileSync('src/pages/CostingInputPage.tsx', 'utf8');

const target =   const handleCalculate = () => {
    calculate();
    setCalculated(true);
    setActiveTab('hasil');
  };;

s = s.replace(target, '');
fs.writeFileSync('src/pages/CostingInputPage.tsx', s);

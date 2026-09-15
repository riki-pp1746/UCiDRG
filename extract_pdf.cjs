const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('C:/UnitCOSt PRO/Workshop 22-23.pptx.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('C:/UnitCOSt PRO/Workshop 22-23.txt', data.text);
    console.log('PDF extracted to C:/UnitCOSt PRO/Workshop 22-23.txt');
}).catch(e => console.error(e));

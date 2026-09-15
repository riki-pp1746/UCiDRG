const fs = require('fs');

let r = fs.readFileSync('src/components/costing/RVUInputForm.tsx', 'utf8');

if (!r.includes('Download Template')) {
  // Add icon import
  r = r.replace(/import \{ useState \} from 'react';/, "import { useState } from 'react';\nimport { Download } from 'lucide-react';");

  const btnHtml = <a href="/Template_Costing_Standard.xlsx" download className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl hover:bg-teal-100 font-medium transition-colors">
          <Download className="w-4 h-4" />
          Download Template Excel
        </a>
        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
          Simpan Alokasi
        </button>;

  r = r.replace(/<button onClick=\{handleSave\} className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">\s*Simpan Alokasi\s*<\/button>/, <div className="ml-auto flex gap-3">\n        \n      </div>);
  
  fs.writeFileSync('src/components/costing/RVUInputForm.tsx', r);
}


const fs = require('fs');
let s = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

const replacement = 
      {/* Overhead Config (Legacy Fallback) */}
      <div className="bg-white rounded-2xl p-6 border border-yellow-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-bl-lg">METODE LAMA (FALLBACK)</div>
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2 mt-2">
          <Settings className="w-4 h-4 text-yellow-600" />
          Persentase Overhead (Metode Lama)
        </h2>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed bg-yellow-50 p-3 rounded-lg border border-yellow-100">
          <strong>Perhatian:</strong> Sistem kini menggunakan metode <strong>RVU (Relative Value Unit)</strong> sesuai standar Kemenkes. Parameter persentase di bawah ini <strong>hanya akan digunakan sebagai cadangan (fallback)</strong> apabila Anda belum menginput angka "Total Global Cost" di menu Input Biaya RS (Tab Alokasi E-Klaim).
        </p>
;

s = s.replace(/\{\/\* Overhead Config \*\/\}\n\s*<div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">\n\s*<h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">\n\s*<Settings className="w-4 h-4 text-blue-500" \/>\n\s*Faktor Biaya Tidak Langsung \(Overhead\)\n\s*<\/h2>\n\s*<p className="text-xs text-gray-400 mb-5">\n\s*Persentase overhead yang ditambahkan ke biaya langsung per pasien untuk menghitung unit cost total\.\n\s*Formula: Unit Cost = Biaya Langsung A- \(1 \+ Total Overhead Factor\)\n\s*<\/p>/, replacement);

fs.writeFileSync('src/pages/SettingsPage.tsx', s);

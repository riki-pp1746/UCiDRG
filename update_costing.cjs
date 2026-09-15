const fs = require('fs');
let s = fs.readFileSync('src/pages/CostingInputPage.tsx', 'utf8');

// Replace everything between {!config.isCalculated ? ( and ) : (
// Actually, it's easier to just remove the lines using string replace.

const target =           <div className="space-y-4">
            {!config.isCalculated ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Kalkulasi Otomatis</p>
                <p className="text-gray-400 text-sm mt-1">Nilai sudah dikalkulasi secara realtime. Pastikan Anda telah mengisi biaya pada menu Info RS, Overhead, Penunjang, dan Layanan.</p>
                <button onClick={() => setActiveTab('hasil')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium flex items-center gap-2 mx-auto">
                  <Calculator className="w-4 h-4" /> Lihat Hasil
                </button>
              </div>
            ) : (
              <>;

const replacement =           <div className="space-y-4">
              <>;

s = s.replace(target, replacement);

const endTarget =               </>
            )}
          </div>
        )}
      </div>
    );;

const endReplacement =               </>
          </div>
        )}
      </div>
    );;
s = s.replace(endTarget, endReplacement);

fs.writeFileSync('src/pages/CostingInputPage.tsx', s);

export function CovRivGuide({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="uc-panel space-y-4">
      <summary className="cursor-pointer font-semibold text-teal-950">
        Panduan Batasan Nilai Ideal CoV &amp; Hubungan RIV (ROV) dan CoV dalam Evaluasi Tarif
      </summary>
      <div className="space-y-4 pt-2 text-sm text-slate-700">
        <div className="space-y-2">
          <h3 className="font-semibold text-teal-950">Panduan Batasan Nilai Ideal CoV dalam DRG</h3>
          <div className="uc-table-scroll">
            <table className="uc-table">
              <thead>
                <tr>
                  <th scope="col">Rentang Nilai CoV</th>
                  <th scope="col">Kategori Homogenitas</th>
                  <th scope="col">Makna &amp; Tindakan yang Diperlukan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-semibold whitespace-nowrap">&lt; 0,5 (&lt; 50%)</td>
                  <td className="font-semibold text-emerald-800 whitespace-nowrap">Sangat Homogen</td>
                  <td>Sangat ideal. Biaya pasien di dalam DRG ini sangat seragam dan mudah diprediksi (umum pada tindakan bedah elektif terstandar).</td>
                </tr>
                <tr>
                  <td className="font-semibold whitespace-nowrap">0,5 – 1,0 (50% – 100%)</td>
                  <td className="font-semibold text-teal-800 whitespace-nowrap">Homogen / Dapat Diterima</td>
                  <td>Batas standar yang masih dianggap layak dan stabil dalam penyusunan tarif DRG maupun iDRG.</td>
                </tr>
                <tr>
                  <td className="font-semibold whitespace-nowrap">&gt; 1,0 (&gt; 100%)</td>
                  <td className="font-semibold text-red-700 whitespace-nowrap">Heterogen / Tinggi</td>
                  <td>Sinyal peringatan (<em>red flag</em>). Variasi biaya terlalu lebar; kelompok DRG ini biasanya perlu <strong>dipecah (<em>splitting</em>)</strong> berdasarkan tingkat keparahan atau komorbiditas.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="uc-inset space-y-2">
          <h3 className="font-semibold text-teal-950">Hubungan RIV (ROV) dan CoV dalam Evaluasi Tarif</h3>
          <p className="text-slate-600">
            Keduanya selalu digunakan berpasangan oleh tim <em>grouper</em> dan analis data <em>costing</em> rumah sakit:
          </p>
          <ol className="list-decimal space-y-1.5 pl-5 text-slate-700">
            <li>
              <strong>Identifikasi Masalah dengan CoV.</strong> Analis memeriksa kode DRG mana saja yang memiliki <strong>CoV &gt; 1,0 (100%)</strong>. Kode tersebut menandakan pasien dengan biaya sangat murah dan sangat mahal masih tercampur dalam satu tarif.
            </li>
            <li>
              <strong>Perbaikan &amp; Validasi dengan RIV (ROV).</strong> Kode dengan CoV tinggi tadi dipecah menjadi sub-kelompok baru (misalnya menjadi tingkat keparahan ringan, sedang, dan berat). Pemecahan dianggap valid jika nilai <strong>CoV di masing-masing sub-kelompok turun di bawah 1,0 (100%)</strong> dan nilai <strong>RIV (ROV) keseluruhan naik</strong>.
            </li>
          </ol>
        </div>
      </div>
    </details>
  );
}
export default CovRivGuide;

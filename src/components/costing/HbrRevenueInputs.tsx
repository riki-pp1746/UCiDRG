import { useState } from 'react';
import { useHospitalCostStore } from '../../stores/hospitalCostStore';
import { useCostingStore } from '../../stores/costingStore';
import { useMethodologyStore } from '../../stores/methodologyStore';
import { hbrInputLabels, type HbrInputKey } from '../../lib/calculations/revenueHbr';
import { formatNumber } from '../../lib/calculations/patientLevelCosting';

export default function HbrRevenueInputs() {
  const config = useHospitalCostStore(s => s.config);
  const update = useHospitalCostStore(s => s.updateDataDasar);
  const raw = useCostingStore(s => s.rawRecords);
  const readOnly = useMethodologyStore(s => s.role === 'Pembaca');
  const [notice, setNotice] = useState('');
  const data = config.dataDasar, basis = data.hbrBasis ?? 0;
  function estimate() {
    const totals = [1, 2].map(care => raw.filter(r => r.ptd === care).reduce((sum, r) => sum + (Number.isFinite(r.tarif_rs) && r.tarif_rs > 0 ? r.tarif_rs : 0), 0));
    if (totals[0] + totals[1] <= 0) { setNotice('Tagihan RS pada TXT belum tersedia untuk membuat estimasi.'); return; }
    update({ hbrBasis: 2, hbrProporsiInap: totals[0] / (totals[0] + totals[1]) * 100 });
    setNotice('Proporsi diambil dari total tagihan RS pada TXT aktif. Ini estimasi berbasis klaim terunggah, bukan pendapatan seluruh penjamin.');
  }
  function input(key: HbrInputKey, integer = false) {
    return <label className="uc-label" key={key}>{hbrInputLabels[key]}<input className="uc-input" type="number" min={0} max={key === 'hbrProporsiInap' ? 100 : undefined} step={integer ? 1 : 'any'} value={data[key] ?? ''}
      onChange={event => { update({ [key]: event.target.value === '' ? undefined : Number(event.target.value), ...(key === 'hbrProporsiInap' ? { hbrBasis: 1 } : {}) }); setNotice(''); }}/></label>;
  }
  return <section className="uc-panel space-y-4" aria-label="Data HBR seluruh penjamin">
    <div><h2 className="font-semibold text-teal-950">Pendapatan dan proporsi biaya inap/jalan</h2><p className="mt-1 text-sm text-slate-600">Untuk HBR seluruh penjamin tahun {config.tahunData}. Isi pendapatan layanan inap dan jalan tanpa menghitung pendapatan yang sama dua kali. Jika tidak tersedia, gunakan proporsi biaya sebagai estimasi.</p></div>
    <fieldset disabled={readOnly} className="space-y-4">
      <label className="uc-label">Dasar pembagian biaya<select className="uc-input" value={basis} onChange={event => { update({ hbrBasis: Number(event.target.value) }); setNotice(''); }}><option value={0}>Proporsi pendapatan inap dan jalan</option><option value={1}>Proporsi biaya manual (estimasi)</option>{basis === 2 && <option value={2}>Proporsi tagihan TXT (estimasi)</option>}</select></label>
      <div className="grid gap-3 sm:grid-cols-2">{basis === 0 ? <>{input('hbrPendapatanInap')}{input('hbrPendapatanJalan')}</> : <>{input('hbrProporsiInap')}<div className="uc-inset"><p className="text-sm text-slate-600">Proporsi biaya rawat jalan</p><p className="mt-2 font-semibold">{data.hbrProporsiInap !== undefined && data.hbrProporsiInap >= 0 && data.hbrProporsiInap <= 100 ? formatNumber(100 - data.hbrProporsiInap, 2) + '%' : 'Belum tersedia'}</p></div></>}</div>
      <button type="button" className="uc-secondary" disabled={!raw.length} onClick={estimate}>Bantu proporsi dari tagihan TXT</button>
      {notice && <p role="status" className="text-sm text-teal-800">{notice}</p>}
      {basis === 2 && <p className="text-sm text-amber-900">Proporsi tagihan hanya mewakili klaim yang diunggah. Tinjau keterwakilannya sebelum digunakan untuk seluruh RS.</p>}
      <div className="grid gap-3 sm:grid-cols-2">{input('hbrKasusInap', true)}{input('hbrKasusJalan', true)}</div>
      <p className="text-xs text-slate-600">Jumlah kasus adalah episode/kunjungan selama tahun biaya, termasuk JKN dan Non-JKN. Satu episode dihitung satu kali; perpindahan ke ICU tidak menambah kasus inap baru.</p>
      <label className="flex items-start gap-2 text-sm text-slate-700"><input className="mt-1" type="checkbox" checked={data.hbrAsumsiKeparahan === 1} onChange={event => update({ hbrAsumsiKeparahan: event.target.checked ? 1 : 0 })}/>Saya menyetujui penggunaan CMI pasien JKN sebagai estimasi CMI seluruh penjamin, dengan asumsi tingkat keparahannya sama, untuk inap dan jalan.</label>
    </fieldset>
    <p className="text-xs text-slate-500">Isian tersimpan selama sesi. Perubahan data memerlukan penghitungan ulang analisis.</p>
  </section>;
}

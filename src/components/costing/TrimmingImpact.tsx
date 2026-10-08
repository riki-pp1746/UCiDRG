import type {HospitalCostPool} from '../../lib/calculations/hospitalBaseRate';
import {dec,money,displayDecimal} from '../../v4/numbers';
export default function TrimmingImpact({pool}:{pool:HospitalCostPool}){
 const count=pool.count+(pool.outlierCount||0);
 const total=dec(pool.total).plus(pool.outlierCost||'0');
 const before=count?total.div(count):null;
 const difference=before?.gt(0)&&pool.hbr!==null?dec(pool.hbr).minus(before).div(before).mul(100):null;
 return <div className="uc-trimming-impact"><p className="font-semibold">Pengaruh trimming ±2 SD</p><dl className="grid grid-cols-2 gap-3 text-sm mt-3"><div><dt>Sebelum trimming*</dt><dd className="font-semibold">{money(before?.toString()??null)}</dd></div><div><dt>HBR setelah trimming</dt><dd className="font-semibold">{money(pool.hbr)}</dd></div><div><dt>Kasus dikeluarkan</dt><dd>{pool.outlierCount||0} dari {count}</dd></div><div><dt>Biaya dikeluarkan</dt><dd>{money(pool.outlierCost||'0')}</dd></div></dl><p className="text-xs mt-3">Perubahan: {difference===null?'Tidak dapat dihitung':displayDecimal(difference.toString())+'%'} · *Rata-rata UC valid dengan kode iDRG, termasuk outlier. Hasil utama tetap memakai inlier.</p><p className="text-xs mt-2">Outlier biaya tinggi dapat menurunkan HBR setelah trimming; outlier biaya rendah dapat menaikkannya. Periksa juga proporsi JKN, periode, pemetaan biaya, dan sisa alokasi.</p></div>;
}

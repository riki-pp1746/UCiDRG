import {useState,useMemo} from 'react';
import {Link} from 'react-router-dom';
import {APP_NAME} from '../../lib/appBrand';
import {useMethodologyStore,defaultMethodology,CALC_VERSION} from '../../stores/methodologyStore';
import type {Methodology} from '../../stores/methodologyStore';
import {useCostingStore} from '../../stores/costingStore';
import {useHospitalCostStore} from '../../stores/hospitalCostStore';
import {useTarifPasienStore} from '../../stores/tarifPasienStore';
import {useAnalysisHistoryStore} from '../../stores/analysisHistoryStore';
import {ALL_KOMPONEN_KEYS,KOMPONEN_LABELS} from '../../types/tarifPasien.types';
import {calculateAnalysisJob,analysisStale} from '../../lib/analysisController';
import {inputQuality} from '../../lib/analysisQuality';
import {analysisView,summaryMetricText} from '../../lib/analysisSnapshot';
import {useAnalysisView} from '../../hooks/useAnalysisView';
import {createAnalysisBackup,previewAnalysisBackup,applyAnalysisBackup,validateMethodology} from '../../lib/analysisBackup';
import type {BackupPayload} from '../../lib/analysisBackup';
import {methodologyRows} from '../../lib/analysisExport';
import {cmiReferences} from '../../lib/analysisFormulas';
import {formatNumber} from '../../lib/calculations/patientLevelCosting';
import {money} from '../../v4/numbers';
import {maskSEP} from '../../v4/numbers';
import AnalysisCostDetails from './AnalysisCostDetails';

export function MethodologyControls(){
 const {settings,update,role,selectRole}=useMethodologyStore();const config=useHospitalCostStore(s=>s.config);const jkn=useCostingStore(s=>s.jknProportion);const [error,setError]=useState('');
 const [center,setCenter]=useState('');const [weights,setWeights]=useState<Record<string,number>>({});
 const change=(patch:Partial<Methodology>)=>{try{validateMethodology({...settings,...patch});update(patch);setError('');}catch(e){setError(String(e));}};
 const fields:[keyof Methodology,string,number][]=[['trimMinimum','Kasus minimum trimming',1],['trimMultiplier','Pengali IQR',.1],['weightMinimum','Minimum kasus untuk penilaian CW',1],['decisionMinimum','Kasus minimum keputusan',1],['bep','Toleransi impas (0,05 = 5%)',.01],['ratioMin','Batas rasio minimum',.1],['ratioMax','Batas rasio maksimum',.1],['dateThreshold','Ambang bulan (0,05 = 5%)',.01],['adjustment','Adjustment Tarif RS',.01],['reconciliationTolerance','Toleransi rekonsiliasi (0,001 = 0,1%)',.001],['reminderMinutes','Pengingat cadangan (menit)',1]];
 const [volumeComponent,setVolumeComponent]=useState<string>('room_amt');const [assetCenter,setAssetCenter]=useState('');const [assetValues,setAssetValues]=useState({equipmentValue:0,buildingValue:0,equipmentYears:5,buildingYears:40});
 const centers=[...config.overheadCenters,...config.intermediateCenters,...config.finalCenters];
 const raw=useCostingStore(s=>s.rawRecords);const pools=useTarifPasienStore(s=>s.biayaRSMap);
 const [reserveKey,setReserveKey]=useState<keyof import('../../types/tarifPasien.types').KomponenTarif18>('room_amt');const [reservePage,setReservePage]=useState(0);
 const candidates=raw.filter(r=>{const days=reserveKey==='room_amt'||reserveKey==='intensive_amt';const driver=reserveKey==='intensive_amt'?r.icuDays:r.los;return ((r.billing as unknown as Record<string,number>)[reserveKey==='chronic_drug_amt'?'drug_chronic_amt':reserveKey==='chemo_drug_amt'?'drug_chemo_amt':reserveKey]||0)>0&&(!days||r.ptd!==1||!Number.isFinite(driver)||Number(driver)<=0);});
 return <section className="uc-panel space-y-4"><h2 className="font-semibold">Metode Analisis 18 Komponen</h2><p className="text-sm">Versi {CALC_VERSION}. Perubahan membuat hasil lama kedaluwarsa; gunakan Hitung ulang. Profil lokal membatasi alur kerja, belum membuktikan identitas pengguna.</p>
 <label className="uc-label">Profil lokal<select className="uc-input" value={role} onChange={e=>selectRole(e.target.value as typeof role)}>{['Penginput','Pemeriksa','Pembaca'].map(r=><option key={r}>{r}</option>)}</select></label>
 <fieldset disabled={role==='Pembaca'} className="space-y-4">
 <label className="flex gap-2"><input type="checkbox" checked={settings.compatibility} onChange={e=>change({compatibility:e.target.checked})}/>Mode kompatibilitas (85%, ±2 SD, 1/12, tanpa stabilisasi)</label><p className="text-xs">Regresi acuan 20.226 klaim sudah diuji pada sumber yang dibekukan. Kecocokan berlaku untuk sumber dan parameter acuan; dataset lain tetap harus diverifikasi. Versi mesin historis belum diketahui, sehingga kecocokan angka ini tidak membuktikan kesamaan mesin lama.</p>
 <label className="uc-label">Alokasi antar pusat biaya<select className="uc-input" value={settings.allocationMethod} onChange={e=>change({allocationMethod:e.target.value as Methodology['allocationMethod']})}><option value="direct">Pemetaan langsung ke komponen (fallback terlihat)</option><option value="step-down">Bertahap Overhead → Intermediate → Final</option></select></label><label className="uc-label">Trimming<select className="uc-input" value={settings.trimming} onChange={e=>change({trimming:e.target.value as Methodology['trimming']})}><option value="log-iqr">Log-IQR</option><option value="two-sd">±2 SD sampel</option></select></label>
<p className="text-sm">CW = rata-rata biaya kelompok ÷ rata-rata biaya seluruh kasus pada jenis rawat yang sama. Seluruh kasus berkode dengan UC valid dihitung; tanpa stabilisasi. Trimming hanya menandai outlier.</p>
 <div className="grid sm:grid-cols-2 gap-3">{fields.map(([key,label,step])=><label className="uc-label" key={key}>{label}<input className="uc-input" type="number" step={step} value={String(settings[key])} onChange={e=>{if(e.target.value!=='')change({[key]:Number(e.target.value)});}}/></label>)}</div>
 <label className="uc-label">Kebijakan HBR<select className="uc-input" value={settings.hbrPolicy} onChange={e=>change({hbrPolicy:e.target.value as Methodology['hbrPolicy']})}><option value="full">Pool JKN penuh (bawaan)</option><option value="exclude">Keluarkan biaya di luar casemix yang dapat ditelusuri</option></select></label>
 <label className="uc-label">Kenaikan biaya antar tahun (%)<input className="uc-input" type="number" step=".1" value={settings.inflation??''} placeholder="Wajib dikonfirmasi bila tahun berbeda; boleh 0" onChange={e=>change({inflation:e.target.value===''?null:Number(e.target.value)})}/></label>
 <label className="flex gap-2"><input type="checkbox" checked={settings.completenessActive} onChange={e=>change({completenessActive:e.target.checked})}/>Terapkan koreksi kelengkapan; saya menyatakan klaim mewakili biaya rata-rata populasi</label>
 <label className="uc-label">Estimasi kasus JKN dari SIMRS<input className="uc-input" type="number" min="1" value={settings.estimatedClaims??''} onChange={e=>change({estimatedClaims:e.target.value===''?null:Number(e.target.value)})}/></label><p className="text-xs">Koreksi berisiko bias bila klaim mahal belum masuk. Hasil sebelum/sesudah ditampilkan terpisah.</p>
 <details><summary className="font-semibold">Porsi JKN dan faktor volume per komponen</summary><div className="uc-table-scroll"><table className="uc-table"><thead><tr><th>Komponen</th><th>Porsi JKN (%) manual</th><th>φ biaya variabel (0–1)</th><th>Volume / rata-rata bulanan</th></tr></thead><tbody>{ALL_KOMPONEN_KEYS.map(k=><tr key={k}><td>{KOMPONEN_LABELS[k]}</td><td><input aria-label={'Porsi JKN '+k} className="uc-input" type="number" min="0" max="100" step="0.01" value={settings.componentShares[k]??jkn} onChange={e=>change({componentShares:{...settings.componentShares,[k]:Number(e.target.value)}})}/></td><td><input aria-label={'Biaya variabel '+k} className="uc-input" type="number" min="0" max="1" step=".1" value={settings.variableShares[k]??0} onChange={e=>change({variableShares:{...settings.variableShares,[k]:Number(e.target.value)}})}/></td><td><input aria-label={'Rasio volume '+k} className="uc-input" type="number" min="0" step=".1" value={settings.volumeRatios[k]??1} onChange={e=>change({volumeRatios:{...settings.volumeRatios,[k]:Number(e.target.value)}})}/></td></tr>)}</tbody></table></div><p className="text-xs">Nilai manual belum diverifikasi. Faktor per bulan = [(1−φ)+φ×rasio volume]/12; faktor beberapa bulan dijumlahkan.</p></details>
 <details><summary className="font-semibold">Matriks pusat biaya ke 18 komponen</summary><label className="uc-label">Pusat biaya<select className="uc-input" value={center} onChange={e=>{setCenter(e.target.value);setWeights(settings.mapping[e.target.value]||{});}}><option value="">Pilih pusat biaya</option>{centers.map(c=><option key={c.id} value={c.id}>{c.nama}</option>)}</select></label>{center&&<><div className="grid sm:grid-cols-3 gap-2">{ALL_KOMPONEN_KEYS.map(k=><label key={k} className="uc-label">{KOMPONEN_LABELS[k]} (%)<input className="uc-input" type="number" min="0" max="100" value={weights[k]||0} onChange={e=>setWeights(w=>({...w,[k]:Number(e.target.value)}))}/></label>)}</div><button className="uc-secondary mt-3" onClick={()=>{if(Math.abs(Object.values(weights).reduce((a,b)=>a+b,0)-100)>1e-8){setError('Jumlah pemetaan harus 100%.');return;}change({mapping:{...settings.mapping,[center]:weights}});}}>Simpan pemetaan 100%</button></>}</details>
 <details><summary className="font-semibold">Volume JKN dan Non-JKN dari data operasional</summary><p className="text-xs">Pilih komponen dan unit sumber. Pastikan volume dan periode mewakili komponen yang sama; tidak ada pemetaan volume otomatis yang tersembunyi.</p><select className="uc-input" value={volumeComponent} onChange={e=>setVolumeComponent(e.target.value)}>{ALL_KOMPONEN_KEYS.map(k=><option key={k} value={k}>{KOMPONEN_LABELS[k]}</option>)}</select>{config.dataLayanan.map(unit=><div key={unit.namaUnit} className="uc-inset mt-2"><strong>{unit.namaUnit}</strong><div className="flex flex-wrap gap-2 mt-2"><button className="uc-secondary" disabled={unit.hariRawatJKN+unit.hariRawatNonJKN===0} onClick={()=>change({componentVolumes:{...settings.componentVolumes,[volumeComponent]:{jkn:unit.hariRawatJKN,total:unit.hariRawatJKN+unit.hariRawatNonJKN,source:'Data Operasional: '+unit.namaUnit+'; hari rawat'}}})}>Pakai hari rawat ({unit.hariRawatJKN}/{unit.hariRawatJKN+unit.hariRawatNonJKN})</button><button className="uc-secondary" disabled={unit.kunjunganJKN+unit.kunjunganNonJKN===0} onClick={()=>change({componentVolumes:{...settings.componentVolumes,[volumeComponent]:{jkn:unit.kunjunganJKN,total:unit.kunjunganJKN+unit.kunjunganNonJKN,source:'Data Operasional: '+unit.namaUnit+'; kunjungan'}}})}>Pakai kunjungan ({unit.kunjunganJKN}/{unit.kunjunganJKN+unit.kunjunganNonJKN})</button></div></div>)}{settings.componentVolumes[volumeComponent]&&<p className="text-sm mt-2">Aktif: {settings.componentVolumes[volumeComponent].source}; JKN {formatNumber(settings.componentVolumes[volumeComponent].jkn/settings.componentVolumes[volumeComponent].total*100,2)}%.</p>}</details>
 <details><summary className="font-semibold">Penyusutan dan umur manfaat aset</summary><label className="uc-label">Dasar penilaian<select className="uc-input" value={settings.depreciation} onChange={e=>change({depreciation:e.target.value as Methodology['depreciation']})}><option value="book">Biaya penyusutan dari sumber pembukuan</option><option value="replacement">Nilai ganti aset yang dikonfirmasi</option></select></label><p className="text-xs">Nilai ganti tidak dikarang. Lengkapi nilai dan umur untuk unit yang memiliki aset; penyusutan baru menggantikan, bukan menambah penyusutan lama.</p><select className="uc-input" value={assetCenter} onChange={e=>setAssetCenter(e.target.value)}><option value="">Pilih pusat biaya</option>{centers.map(c=><option key={c.id} value={c.id}>{c.nama}</option>)}</select>{assetCenter&&<><div className="grid sm:grid-cols-2 gap-2">{([['equipmentValue','Nilai alat (Rp)'],['buildingValue','Nilai gedung (Rp)'],['equipmentYears','Umur alat (tahun)'],['buildingYears','Umur gedung (tahun)']] as const).map(([key,label])=><label className="uc-label" key={key}>{label}<input className="uc-input" type="number" min="0" value={assetValues[key]} onChange={e=>setAssetValues(v=>({...v,[key]:Number(e.target.value)}))}/></label>)}</div><button className="uc-secondary mt-2" onClick={()=>change({depreciationValues:{...settings.depreciationValues,[assetCenter]:assetValues}})}>Konfirmasi nilai dan umur</button></>}</details>
 <label className="uc-label">Batas penanda rawat panjang (hari)<input className="uc-input" type="number" min="1" value={settings.longStayDays} onChange={e=>change({longStayDays:Number(e.target.value)})}/></label>
<details><summary className="font-semibold">Sumber dan masa berlaku tarif pembanding</summary><label className="uc-label">Sumber<input className="uc-input" value={settings.referenceSource} onChange={e=>change({referenceSource:e.target.value,referenceVerified:false})}/></label><div className="grid sm:grid-cols-2 gap-3"><label className="uc-label">Berlaku sejak<input className="uc-input" type="date" value={settings.referenceFrom} onChange={e=>change({referenceFrom:e.target.value,referenceVerified:false})}/></label><label className="uc-label">Berlaku sampai<input className="uc-input" type="date" value={settings.referenceUntil} onChange={e=>change({referenceUntil:e.target.value,referenceVerified:false})}/></label></div><label className="flex gap-2"><input type="checkbox" checked={settings.referenceVerified} onChange={e=>change({referenceVerified:e.target.checked})}/>Saya sudah memverifikasi tarif TXT terhadap pembayaran, tipe RS, regional, kelas rawat, dan periode</label><p className="text-xs">Tarif INA-CBG dibaca dari total_tarif, lalu tarif_inacbg bila kosong. Tarif iDRG dari total_tarif JSON klaim; bobot nasional ilustratif tidak dipakai dalam perbandingan revisi.</p></details>
 <details><summary className="font-semibold">Driver alokasi antarunit</summary><p className="text-xs">Berlaku pada metode bertahap. Pilih pusat biaya sumber; angka adalah bobot layanan/volume penerima. Tanpa bobot, staf atau luas lantai hanya dipakai jika sesuai dasar sumber; biaya lainnya tetap ditandai fallback.</p><label className="uc-label">Sumber<select className="uc-input" value={center} onChange={e=>setCenter(e.target.value)}><option value="">Pilih unit</option>{centers.map(c=><option key={c.id} value={c.id}>{c.nama}</option>)}</select></label>{center&&centers.filter(c=>c.id!==center).map(c=><label key={c.id} className="uc-label">{c.nama}<input className="uc-input" type="number" min="0" value={settings.recipients[center]?.[c.id]||0} onChange={e=>change({recipients:{...settings.recipients,[center]:{...settings.recipients[center],[c.id]:Number(e.target.value)}}})}/></label>)}</details>
<details><summary className="font-semibold">Cadangan episode dan daftar tinjau</summary><p className="text-sm">Cadangan diambil dari pool komponen. Alokasi driver utama ditambah cadangan tidak boleh melebihi pool. Konfirmasikan episode setelah memeriksa sumber; kasus yang belum jelas tetap berada dalam daftar tinjau.</p><select className="uc-input" value={reserveKey} onChange={e=>{setReserveKey(e.target.value as typeof reserveKey);setReservePage(0);}}>{ALL_KOMPONEN_KEYS.map(k=><option key={k} value={k}>{KOMPONEN_LABELS[k]}</option>)}</select><p className="text-sm">Pool terakhir {money(String(pools[reserveKey]||0))}; berubah setelah Hitung ulang.</p><label className="uc-label">Cadangan (Rp)<input className="uc-input" type="number" min="0" step="1" value={settings.episodeReserves[reserveKey]||0} onChange={e=>change({episodeReserves:{...settings.episodeReserves,[reserveKey]:Number(e.target.value)}})}/></label><p className="text-xs">Cadangan dibagi sama rata ke episode terkonfirmasi tanpa driver. Sistem menolak cadangan tanpa penerima atau melebihi pool. Konfirmasi berlaku pada episode; periksa seluruh komponen yang memakai cadangan.</p><table className="uc-table"><thead><tr><th>Konfirmasi</th><th>Sumber</th><th>SEP masking</th><th>Rawat / LOS</th></tr></thead><tbody>{candidates.slice(reservePage*25,reservePage*25+25).map((r,i)=>{const id=r.internalId||r.sepToken||r.sep;return <tr key={id||i}><td><input aria-label={'Konfirmasi episode baris '+(r.sourceRow||reservePage*25+i+1)} type="checkbox" checked={settings.confirmedEpisodes.includes(id)} onChange={e=>change({confirmedEpisodes:e.target.checked?[...new Set([...settings.confirmedEpisodes,id])]:settings.confirmedEpisodes.filter(v=>v!==id)})}/></td><td>{r.sourceFile} baris {r.sourceRow||reservePage*25+i+1}</td><td>{maskSEP(r.sep)}</td><td>{r.ptd===1?'Inap':'Jalan'} / {r.los}</td></tr>;})}</tbody></table><div className="flex gap-2"><button className="uc-secondary" disabled={reservePage===0} onClick={()=>setReservePage(p=>p-1)}>Sebelumnya</button><span>{candidates.length} kasus tinjau</span><button className="uc-secondary" disabled={(reservePage+1)*25>=candidates.length} onClick={()=>setReservePage(p=>p+1)}>Berikutnya</button></div></details>
<details><summary className="font-semibold">Rasio volume berbeda per bulan</summary><p className="text-sm">Masukkan satu rasio untuk setiap bulan efektif, berurutan dari bulan pertama. Pisahkan dengan titik koma dan gunakan titik desimal, misalnya 1;1.2;0.8. Jumlah nilai wajib sama dengan bulan efektif. Bila kosong, rasio seragam pada tabel komponen dipakai.</p>{ALL_KOMPONEN_KEYS.map(k=><label key={k} className="uc-label">{KOMPONEN_LABELS[k]}<input className="uc-input" defaultValue={settings.monthlyVolumeRatios?.[k]?.join(';')||''} onBlur={e=>{const value=e.target.value.trim();const next={...settings.monthlyVolumeRatios};if(!value)delete next[k];else next[k]=value.split(';').map(Number);change({monthlyVolumeRatios:next});}}/></label>)}</details>
<button className="uc-secondary" onClick={()=>change(defaultMethodology())}>Kembalikan parameter metode</button>
 </fieldset>{error&&<p role="alert" className="uc-error">{error}</p>}</section>;
}


export function AnalysisCalculationPanel({workflow=false}:{workflow?:boolean}={}){
 const policy=useMethodologyStore();
 const raw=useCostingStore(s=>s.rawRecords);
 const period=useCostingStore(s=>s.periodNormalization);
 const config=useHospitalCostStore(s=>s.config);
 const snapshot=useTarifPasienStore(s=>s.snapshot);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState(0);
 const needsCalculation=analysisStale();
 const issues=useMemo(()=>!needsCalculation&&snapshot?snapshot.issues:inputQuality(config,raw,policy.settings,config.sourceOrigin||'contoh'),[needsCalculation,snapshot,config,raw,policy.settings]);
 const blockers=issues.filter(i=>i.severity==='error').length;
 const hasCosts=config.totalOverheadCost+config.totalIntermediateCost+config.totalFinalCost>0;

 async function calculate(){
  setBusy(true);setProgress(0);setError('');
  try{
   await calculateAnalysisJob(setProgress);
   const result=useTarifPasienStore.getState().snapshot;
   const summary=workflow&&result?analysisView(result,'IDRG').summary:null;
   if(result&&summary){
    const {sourceWeights,...local}=result.local;
    useAnalysisHistoryStore.getState().save({period:local.period,state:'Draft',local:{...local,patients:[],sourceWeights:sourceWeights&&{...sourceWeights,patients:[]}},summary},false);
   }
  }
  catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setBusy(false);}
 }

 return <section id="hitung-18-komponen" className="uc-panel space-y-3 scroll-mt-4 print:hidden" aria-labelledby="analysis-calculate-title">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div>
    <h2 id="analysis-calculate-title" className="font-semibold text-teal-950">Hitung unit cost</h2>
    <p className="mt-1 text-sm text-slate-600">
     {!raw.length?<Link className="font-medium text-teal-800 underline" to="/upload">Unggah klaim untuk mulai menghitung</Link>:!hasCosts?'Lengkapi biaya RS untuk menghitung.':raw.length.toLocaleString('id-ID')+' kasus sumber · '+(needsCalculation?'Input belum dihitung':'Terakhir dihitung '+new Date(snapshot!.at).toLocaleString('id-ID'))}
    </p>
   </div>
   <button type="button" className="uc-primary" disabled={busy||!raw.length||!hasCosts||policy.role==='Pembaca'} onClick={()=>void calculate()}>
    {busy?'Sedang menghitung…':needsCalculation?'Hitung unit cost':'Hitung ulang'}
   </button>
  </div>
  {busy&&<div role="status"><progress aria-label="Kemajuan perhitungan" max={100} value={progress}/> {progress}% · Sedang diproses</div>}
  {Boolean(period?.dateOutliers?.length)&&!period?.confirmed&&<p className="uc-error">Pencilan bulan: {period?.dateOutliers?.join(', ')}. <Link to="/upload">Konfirmasi periode</Link>.</p>}
  {!workflow&&issues.length>0&&(raw.length>0||hasCosts||blockers>0)&&(
   <details className="border-t border-slate-200 pt-3">
    <summary className={blockers?'font-semibold text-red-800':'font-semibold text-teal-950'}>
     Peringatan data · {blockers?blockers+' memblokir, ':''}{issues.length-blockers} catatan lain
    </summary>
    <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-2">
     {[...issues].sort((a,b)=>({error:0,warning:1,info:2})[a.severity]-({error:0,warning:1,info:2})[b.severity]).map(i=>(
      <li key={i.id} className="text-sm">
       <Link className="underline" to={i.source}>{i.severity==='error'?'Blokir':i.severity==='warning'?'Peringatan':'Info'} · {i.count} · {i.message}</Link>
       {i.examples.length>0&&<p className="text-xs">{i.examples.join('; ')}</p>}
      </li>
     ))}
    </ul>
   </details>
  )}
  {config.sourceOrigin==='contoh'&&<button className="uc-secondary" disabled={policy.role==='Pembaca'} onClick={()=>{useHospitalCostStore.setState(s=>({config:{...s.config,overheadCenters:[],intermediateCenters:[],finalCenters:[],totalOverheadCost:0,totalIntermediateCost:0,totalFinalCost:0,sourceOrigin:'diketik'}}));useTarifPasienStore.setState({snapshot:null,localCosting:null,biayaRSMap:{}});}}>Hapus data contoh</button>}
  {(config.importIssues||[]).length>0&&<button className="uc-secondary" disabled={policy.role==='Pembaca'} onClick={()=>{if(!window.confirm('Nyatakan seluruh sel biaya kosong yang tercantum sebagai nol secara sengaja? Keputusan dicatat dalam jejak audit.'))return;useMethodologyStore.setState(s=>({revision:s.revision+1,audit:[...s.audit,{at:new Date().toISOString(),actor:s.actor,action:'Sel kosong dinyatakan nol',before:config.importIssues,after:0}]}));useHospitalCostStore.setState(s=>({config:{...s.config,importIssues:[]}}));}}>Nyatakan sel kosong sebagai nol dengan catatan audit</button>}
  {error&&<p role="alert" className="uc-error">{error}</p>}
 </section>;
}

export function AnalysisBackupPanel(){
 const role=useMethodologyStore(s=>s.role);
 const lastBackup=useMethodologyStore(s=>s.lastBackup);
 const count=useCostingStore(s=>s.rawRecords.length);
 const [error,setError]=useState('');
 const [password,setPassword]=useState('');
 const [preview,setPreview]=useState<BackupPayload|null>(null);
 const [busy,setBusy]=useState(false);
 async function run(fn:()=>void|Promise<void>){
  setBusy(true);setError('');
  try{await fn();}catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setBusy(false);}
 }
 async function download(){
  const text=await createAnalysisBackup(password);
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`${APP_NAME}-Cadangan-Terenkripsi.json`;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  setPassword('');
 }
 async function readBackup(file:File){
  setPreview(null);
  if(file.size>250*1024*1024)throw new Error('Berkas melebihi 250 MB.');
  setPreview(await previewAnalysisBackup(await file.text(),password));
 }
 return <details id="cadangan-sesi" className="uc-panel print:hidden">
  <summary className="cursor-pointer font-semibold text-teal-950">Cadangan dan pemulihan sesi</summary>
  <div className="mt-4 space-y-3">
   <p className="text-sm text-slate-600">Muat ulang, keluar, atau tutup tab akan mengosongkan data sesi. Simpan cadangan terenkripsi dengan kata sandi minimal 12 karakter.</p>
   {lastBackup&&<p className="text-xs text-slate-600">Cadangan terakhir {new Date(lastBackup).toLocaleString('id-ID')}</p>}
   <label className="uc-label">Kata sandi cadangan<input className="uc-input" type="password" value={password} onChange={e=>{setPassword(e.target.value);setPreview(null);}}/></label>
   <div className="flex flex-wrap items-end gap-3">
    <button disabled={busy||password.length<12||!count} className="uc-secondary" onClick={()=>void run(download)}>Unduh cadangan</button>
    <label className="uc-label">Pratinjau cadangan<input type="file" accept=".json" disabled={busy||password.length<12} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(()=>readBackup(file));}}/></label>
   </div>
   {preview&&<div className="uc-notice"><p>{preview.rowCount} kasus · {preview.config.namaRS} · {preview.period?.label} · mengganti sesi {count} kasus.</p><button className="uc-secondary" disabled={busy||role==='Pembaca'} onClick={()=>void run(()=>{applyAnalysisBackup(preview);setPreview(null);setPassword('');})}>Pulihkan dan ganti sesi</button></div>}
   {error&&<p role="alert" className="uc-error">{error}</p>}
  </div>
 </details>;
}

export function AnalysisReportVersions(){
 const policy=useMethodologyStore();
 const origin=useHospitalCostStore(s=>s.config.sourceOrigin);
 const snapshot=useTarifPasienStore(s=>s.snapshot);
 const local=useTarifPasienStore(s=>s.localCosting);
 const {summary}=useAnalysisView();
 const history=useAnalysisHistoryStore();
 const [error,setError]=useState('');
 if(!local||!summary||!snapshot)return null;
 function save(state:'Draft'|'Review'|'Final'){
  if(!local||!summary||!snapshot)return;
  setError('');
  try{history.save({period:local.period,state,local,summary},!snapshot.issues.some(i=>i.severity==='error')&&origin!=='simulasi'&&policy.settings.referenceVerified&&!analysisStale());}
  catch(e){setError(e instanceof Error?e.message:String(e));}
 }
 return <details className="uc-panel print:hidden">
  <summary className="cursor-pointer font-semibold text-teal-950">Versi laporan dan tren</summary>
  <div className="mt-3 flex flex-wrap gap-2">{(['Draft','Review','Final'] as const).map(state=><button key={state} className="uc-secondary" onClick={()=>save(state)}>Simpan {state}</button>)}</div>
  <p className="mt-2 text-xs text-slate-600">Periode dengan parameter atau populasi berbeda tidak langsung sebanding.</p>
  {error&&<p role="alert" className="uc-error">{error}</p>}
  {history.entries.length>0&&<div className="uc-table-scroll"><table className="uc-table"><thead><tr><th>Periode</th><th>Status</th><th>CRR</th><th>CMI</th><th>Dasar CMI</th></tr></thead><tbody>{history.entries.map(h=><tr key={h.id}><td>{h.period}</td><td>{h.state}</td><td>{summaryMetricText(h.summary,'crr')}</td><td>{summaryMetricText(h.summary,'cmi')}</td><td>{h.summary.cmiBasis??'CW lokal'}</td></tr>)}</tbody></table></div>}
 </details>;
}

export function AnalysisReportDetails(){
 const snapshot=useTarifPasienStore(s=>s.snapshot);const view=useAnalysisView();
 if(!snapshot)return null;
 const rov=view.summary?.rov;
 return <div className="space-y-4">
  <section className="uc-panel space-y-4"><h2 className="text-lg font-semibold text-teal-950">Metode dan cakupan laporan</h2>
   <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Metode biaya</dt><dd className="mt-1 text-sm font-medium text-slate-800">{snapshot.local.method}</dd></div><div><dt className="text-xs text-slate-500">Periode</dt><dd className="mt-1 text-sm font-medium text-slate-800">{snapshot.local.period}</dd></div><div><dt className="text-xs text-slate-500">Dasar CW</dt><dd className="mt-1 text-sm text-slate-700">Rata-rata biaya kelompok dibagi rata-rata biaya seluruh kasus pembentuk, terpisah menurut jenis rawat. Outlier tetap dihitung.</dd></div><div><dt className="text-xs text-slate-500">Dasar ICU</dt><dd className="mt-1 text-sm text-slate-700">{snapshot.options.intensiveBasis==='billing'?'Proporsi tagihan ICU pasien inap (asumsi latihan).':'Hari perawatan sesuai dasar alokasi komponen.'}</dd></div></dl>
   <p className="text-sm text-slate-600">CW lokal dinormalisasi terhadap rata-rata biaya RS. Rata-rata tertimbang seluruh kasus pembentuk bernilai 1; nilai per kelompok tetap bervariasi. CMI dari bobot TXT memakai nilai sumber yang terpisah.</p>
    <p className="text-sm text-slate-600">Ringkasan mengikuti filter laporan. Perhitungan CW dan HBR tetap memakai populasi pembentuk pada hasil yang sama.</p>
    <details className="border-t border-slate-200 pt-3">
      <summary className="cursor-pointer font-semibold text-teal-950">Referensi Case Mix Index (CMI)</summary>
      <div className="mt-3 space-y-3 text-sm text-slate-600">
        <p>CMI dihitung dengan membagi casemix dengan jumlah klaim terpetakan. CMI INA-CBG memakai bobot relatif Akurat iDRG. CMI iDRG memakai bobot dari TXT klaim. Cakupan masing-masing ditampilkan bersama hasil.</p>
        <ul className="list-disc space-y-2 pl-5">
          {cmiReferences.map(ref=><li key={ref.doi}>
            {ref.authors}. {ref.journal}.{' '}
            <a className="text-teal-800 underline underline-offset-2" href={ref.url} target="_blank" rel="noopener noreferrer" title={ref.title}>Baca artikel di Scholar Hub UI</a>.
          </li>)}
        </ul>
      </div>
    </details>
  </section>
  <details className="uc-panel"><summary className="cursor-pointer font-semibold text-teal-950">Rekonsiliasi biaya dan HBR</summary><div className="uc-table-scroll mt-4"><table className="uc-table"><thead><tr>{['Jenis rawat','Pool JKN','Pool HBR aktif','Biaya dikecualikan','Casemix','HBR','Selisih rekonsiliasi'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{snapshot.local.pools.map(p=><tr key={p.care}><td>{p.care==='inap'?'Rawat inap':'Rawat jalan'}</td><td>{money(p.total)}</td><td>{money(p.hbrPool??p.total)}</td><td>{money(p.policyExcluded||'0')}</td><td>{p.casemix===null?'Tidak tersedia':formatNumber(Number(p.casemix),2)}</td><td>{money(p.hbr)}</td><td>{p.identityDelta==='Tidak tersedia'?'Tidak tersedia':money(p.identityDelta||'0')}</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-slate-500">Selisih nol menunjukkan keseimbangan total; tetap tinjau pembagi dan kelengkapan data pada Pemeriksaan Data.</p></details>
  <details className="uc-panel"><summary className="cursor-pointer font-semibold text-teal-950">Struktur biaya dan sensitivitas</summary><div className="mt-4"><AnalysisCostDetails/></div></details>
  <details className="uc-panel"><summary className="cursor-pointer font-semibold text-teal-950">Variasi biaya dalam kelompok (ROV)</summary><div className="mt-4 space-y-3 text-sm text-slate-600"><div className="grid gap-3 sm:grid-cols-3">{[{label:'ROV mentah',value:rov?.raw},{label:'ROV disesuaikan',value:rov?.adjusted},{label:'Validasi silang',value:rov?.crossValidated}].map(item=><div key={item.label}><p className="text-xs">{item.label}</p><p className="mt-1 font-semibold text-slate-800">{item.value==null?'Tidak tersedia':formatNumber(item.value*100,1)+'%'}</p></div>)}</div>{rov?.reason&&<p>{rov.reason}</p>}<p className="text-xs">Skala logaritma biaya positif; {formatNumber(rov?.n||0)} kasus, {formatNumber(rov?.k||0)} kelompok, {formatNumber(rov?.excluded||0)} kasus tidak masuk ukuran variasi ini. Nilai ROV tidak menunjukkan keuntungan atau kerugian RS.</p></div></details>
  <details className="uc-panel"><summary className="cursor-pointer font-semibold text-teal-950">Parameter dan sumber lengkap</summary><p className="mt-3 text-xs text-slate-500">Versi perhitungan {snapshot.version} · {new Date(snapshot.at).toLocaleString('id-ID')}</p><div className="uc-table-scroll mt-3"><table className="uc-table"><tbody>{methodologyRows().slice(1).filter(([key])=>!key.startsWith('Referensi CMI')).map(([key,value])=><tr key={key}><th scope="row">{key}</th><td className="break-words">{value}</td></tr>)}</tbody></table></div></details>
 </div>;
}

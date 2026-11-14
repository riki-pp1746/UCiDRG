import {registerSnapshotSources} from '../../lib/analysisSources';
import {useEffect,useRef,useState} from 'react';
import {useCostingStore} from '../../stores/costingStore';
import {useTarifPasienStore} from '../../stores/tarifPasienStore';
import {useHospitalCostStore} from '../../stores/hospitalCostStore';
import {useMethodologyStore} from '../../stores/methodologyStore';
import {formatNumber} from '../../lib/calculations/patientLevelCosting';
import {parsePercentInput} from '../../types/hospitalCost.types';
export default function JKNProportionControl(){
 const proportion=useCostingStore(s=>s.jknProportion);
 const formatted=formatNumber(proportion,2);
 const [edit,setEdit]=useState({base:proportion,value:formatted});
 const draft=edit.base===proportion?edit.value:formatted;
 const setDraft=(value:string)=>setEdit({base:proportion,value});
 const [progress,setProgress]=useState<number|null>(null);
 const [message,setMessage]=useState('');
 const worker=useRef<Worker|null>(null);
 useEffect(()=>()=>worker.current?.terminate(),[]);
 const cancel=()=>{worker.current?.terminate();worker.current=null;setProgress(null);setMessage('Perhitungan dibatalkan. Hasil sebelumnya tetap digunakan.');};
 const apply=()=>{
  const parsed=parsePercentInput(draft);
  if(!draft.trim()||!Number.isFinite(parsed)||parsed<0||parsed>100)return;
  const p=Number(parsed.toFixed(2));
  const source=useCostingStore.getState(),tarif=useTarifPasienStore.getState(),config=useHospitalCostStore.getState().config,policy=useMethodologyStore.getState();
  if(policy.role==='Pembaca'){setMessage('Pembaca tidak dapat mengubah porsi.');return;}
  setMessage('');setProgress(0);
  try{
   const job=new Worker(new URL('../../lib/jknWorker.ts',import.meta.url),{type:'module'});worker.current=job;
   const fail=(text:string)=>{job.terminate();worker.current=null;setProgress(null);setMessage(text);};
   job.onerror=()=>fail('Perhitungan gagal. Silakan coba lagi.');
   job.onmessage=e=>{
    if(e.data.error){fail(e.data.error);return;}
    if(e.data.progress!==undefined){setProgress(e.data.progress);return;}
    const current=useCostingStore.getState();
    if(useMethodologyStore.getState().revision!==policy.revision){fail('Parameter berubah selama perhitungan. Terapkan kembali.');return;}
    if(current.rawRecords!==source.rawRecords||current.periodNormalization!==source.periodNormalization||current.overheadConfig!==source.overheadConfig||current.tarifIDRGConfig!==source.tarifIDRGConfig||current.mergeCarePool!==source.mergeCarePool||current.jknProportion!==source.jknProportion||useTarifPasienStore.getState().patients!==tarif.patients||useTarifPasienStore.getState().biayaRSMap!==tarif.biayaRSMap||useHospitalCostStore.getState().config!==config){fail('Data berubah selama perhitungan. Terapkan kembali proporsinya.');return;}
    useCostingStore.setState({...e.data.result.costing,jknProportion:p,rawRecords:[...source.rawRecords],isProcessing:false,processProgress:100});
    registerSnapshotSources(e.data.result.tarif.snapshot,useCostingStore.getState().rawRecords,e.data.result.tarif.biayaRSMap,config,policy.revision,p,source.mergeCarePool,source.periodNormalization);
    useTarifPasienStore.setState({...e.data.result.tarif,calculationVersion:tarif.calculationVersion+1});
    fail('Proporsi diterapkan. Hasil pasien dan laporan sudah dihitung ulang.');
   };
   job.postMessage({settings:policy.settings,revision:policy.revision,config,patients:tarif.patients,proportion:p,costing:{rawRecords:source.rawRecords,periodNormalization:source.periodNormalization,overheadConfig:source.overheadConfig,tarifIDRGConfig:source.tarifIDRGConfig,mergeCarePool:source.mergeCarePool,sessions:source.sessions,activeSessionId:source.activeSessionId}});
  }catch{worker.current?.terminate();worker.current=null;setProgress(null);setMessage('Proses latar belakang tidak tersedia. Silakan coba lagi.');}
 };
 const parsedDraft=parsePercentInput(draft);
 const valid=draft.trim()!==''&&Number.isFinite(parsedDraft)&&parsedDraft>=0&&parsedDraft<=100;
 return <div className="space-y-2"><label className="uc-label">Porsi biaya JKN (%)<input className="uc-input" type="text" inputMode="decimal" value={draft} disabled={progress!==null} onChange={e=>setDraft(e.target.value)}/></label><p className="text-sm">Proporsi aktif: JKN {formatNumber(proportion,2)}% · Non-JKN {formatNumber(100-proportion,2)}%</p><button className="uc-btn-primary" disabled={!valid||progress!==null||Number(parsedDraft.toFixed(2))===proportion} onClick={apply}>Terapkan proporsi & hitung ulang</button>{progress!==null&&<><p role="status">Menghitung di latar belakang… {progress}%</p><button className="uc-btn-secondary" onClick={cancel}>Batalkan</button></>}{message&&<p role="status" className="text-sm">{message}</p>}<p className="text-xs text-slate-500">Mengubah angka belum mengubah hasil. Tekan Terapkan setelah selesai mengisi.</p></div>;
}

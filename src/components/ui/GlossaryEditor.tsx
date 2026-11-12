import {useState, type FormEvent} from 'react';
import {GLOSSARY, glossaryKeys, wordCount, type GlossaryKey} from '../../lib/glossary';
import {useGlossaryContent,useGlossaryText} from '../../hooks/useGlossaryContent';

export default function GlossaryEditor(){
  const [key,setKey]=useState<GlossaryKey>('cwRS');
  return <details className="uc-panel">
    <summary className="cursor-pointer font-semibold text-teal-950">Glosarium &amp; Pop-up</summary>
    <div className="mt-4 space-y-4">
      <p className="text-sm text-slate-600">Sunting arti, satuan, cara membaca, dan sumber data. Teks yang disimpan berlaku pada semua halaman yang memakai istilah ini.</p>
      <label className="uc-label">Pilih istilah<select className="uc-input" value={key} onChange={event=>setKey(event.target.value as GlossaryKey)}>
        {glossaryKeys.map(item=><option key={item} value={item}>{GLOSSARY[item].term}</option>)}
      </select></label>
      <EntryForm key={key} term={key}/>
    </div>
  </details>;
}

function EntryForm({term}:{term:GlossaryKey}){
  const text=useGlossaryText(term);
  const {save,overrides}=useGlossaryContent();
  const [draft,setDraft]=useState<{summary:string;detail:string}|null>(null);
  const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState<{message:string;error:boolean}|null>(null);
  const {summary,detail}=draft??text;
  const summaryWords=wordCount(summary),detailWords=wordCount(detail);
  const valid=summaryWords>0&&summaryWords<=25&&detailWords>0&&detailWords<=100;

  async function persist(reset:boolean){
    if(busy||(!reset&&!valid))return;
    setBusy(true);
    setFeedback(null);
    try{
      await save(term,reset?null:{summary:summary.trim(),detail:detail.trim()});
      setDraft(null);
      setFeedback({message:reset?'Teks bawaan digunakan kembali.':'Perubahan glosarium tersimpan.',error:false});
    }catch(error){
      setFeedback({message:error instanceof Error?error.message:'Glosarium belum dapat disimpan.',error:true});
    }finally{setBusy(false);}
  }

  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();void persist(false);}

  return <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
    <label className="uc-label">Ringkasan tooltip<textarea className="uc-input" rows={2} maxLength={500} required value={summary} disabled={busy}
      onChange={event=>setDraft({summary:event.target.value,detail})}/><span className={summaryWords>25?'text-red-800':''}>{summaryWords}/25 kata</span></label>
    <label className="uc-label">Penjelasan lengkap<textarea className="uc-input" rows={6} maxLength={3000} required value={detail} disabled={busy}
      onChange={event=>setDraft({summary,detail:event.target.value})}/><span className={detailWords>100?'text-red-800':''}>{detailWords}/100 kata</span></label>
    <div className="flex flex-wrap gap-2">
      <button type="submit" className="uc-primary" disabled={!draft||!valid||busy}>Simpan naskah</button>
      {overrides[term]&&<button type="button" className="uc-secondary" disabled={busy} onClick={()=>void persist(true)}>Gunakan teks bawaan</button>}
    </div>
    {feedback&&<p className={feedback.error?'uc-error':'uc-success'} role={feedback.error?'alert':'status'}>{feedback.message}</p>}
  </form>;
}

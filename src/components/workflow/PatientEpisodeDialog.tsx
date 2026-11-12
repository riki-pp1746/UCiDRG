import {useEffect, useId, useRef} from 'react';
import {ClipboardList, X} from 'lucide-react';
import type {PatientRecord as Claim} from '../../types/costing.types';
import type {PatientRecord as CostedPatient} from '../../types/tarifPasien.types';
import {formatNumber} from '../../lib/calculations/patientLevelCosting';
import {dec, maskSEP, money, sum} from '../../v4/numbers';
import {FinancialValue} from '../ui/FinancialStatus';

type ComponentAmount = {id:string;label:string;billed?:number;allocated?:string|number};
const dateFormatter=new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeZone:'UTC'});
const dateLabel=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))?dateFormatter.format(new Date(value)):'—';
const daysLabel=(value:number|undefined)=>value!=null&&Number.isFinite(value)?`${formatNumber(value)} hari`:'—';
const currency=(value:string|number|undefined)=>value==null?'—':money(String(value));
const rupiahCell=(value:string|number|undefined)=>currency(value).replace(/^Rp /,'');

export default function PatientEpisodeDialog({episode,costing,components,results,notice,onClose}:{
  episode:Claim;costing?:CostedPatient;components:ComponentAmount[];results:boolean;notice?:string|null;onClose:()=>void;
}){
  const dialog=useRef<HTMLDialogElement>(null);
  const title=useId();
  const description=useId();
  useEffect(()=>{
    const element=dialog.current;
    element?.showModal();
    return ()=>{element?.close();};
  },[]);

  function dismiss(){
    dialog.current?.close();
    onClose();
  }

  const unitCost=costing?.totalCostPerPatientDecimal??costing?.totalCostPerPatient;
  const sourceTariff=episode.idrg?.total_tarif;
  const tariff=sourceTariff>0?sourceTariff:undefined;
  const difference=unitCost!=null&&tariff!=null?dec(tariff).minus(unitCost):null;
  const totalBilling=components.some(row=>row.billed!=null)?sum(components.flatMap(row=>row.billed==null?[]:[row.billed])).toString():undefined;
  const rawat=episode.ptd===1?'Rawat inap':episode.ptd===2?'Rawat jalan':'Jenis rawat belum tersedia';
  const sep=episode.sep.trim()?maskSEP(episode.sep):'—';

  return <dialog ref={dialog} className="uc-episode-dialog" aria-labelledby={title} aria-describedby={description}
    onCancel={event=>{event.preventDefault();dismiss();}}
    onClick={event=>{if(event.target===event.currentTarget)dismiss();}}>
    <div className="uc-episode-shell">
      <header className="uc-episode-header">
        <div className="uc-episode-icon"><ClipboardList size={22} aria-hidden/></div>
        <div className="min-w-0 flex-1">
          <h2 id={title}>{results?'Rincian unit cost pasien':'Rincian episode E-Klaim'}</h2>
          <p id={description}>SEP tersamarkan <strong>{sep}</strong> <span aria-hidden>·</span> {rawat}</p>
        </div>
        <button type="button" className="uc-episode-close" autoFocus aria-label="Tutup rincian pasien" onClick={dismiss}><X size={22} aria-hidden/></button>
      </header>

      <div className="uc-episode-body">
        <section className="uc-episode-group" aria-label="Kelompok iDRG">
          <p>Kode iDRG <strong>{episode.idrg?.drg_code||'—'}</strong></p>
          <h3>{episode.idrg?.drg_description||'Nama kelompok belum tersedia'}</h3>
        </section>

        <dl className="uc-episode-metrics">
          <div className="uc-episode-primary"><dt>{results?'Unit cost pasien':'Total tagihan 18 komponen'}</dt><dd>{currency(results?unitCost:totalBilling)}</dd></div>
          <div><dt>Tarif iDRG</dt><dd>{currency(tariff)}</dd></div>
          {results&&<div><dt>Selisih tarif dan biaya</dt><dd>{difference?<FinancialValue value={difference.toNumber()}>{difference.gt(0)?'+':''}{currency(difference.toString())}</FinancialValue>:'—'}</dd></div>}
        </dl>

        <dl className="uc-episode-facts">
          <div><dt>Tanggal masuk</dt><dd>{dateLabel(episode.admission_date)}</dd></div>
          <div><dt>Tanggal pulang</dt><dd>{dateLabel(episode.discharge_date)}</dd></div>
          <div><dt>Kelas rawat</dt><dd>{episode.kelas_rawat>0?`Kelas ${episode.kelas_rawat}`:'—'}</dd></div>
          <div><dt>Lama rawat</dt><dd>{daysLabel(episode.los)}</dd></div>
          <div><dt>Hari ICU</dt><dd>{daysLabel(episode.icuDays)}</dd></div>
        </dl>

        {notice&&<p className="uc-notice">{notice}</p>}

        <section aria-label="Rincian 18 komponen" className="uc-episode-breakdown">
          <h3>Rincian 18 komponen</h3>
          <p>{results?'Biaya alokasi adalah bagian biaya RS yang dibebankan ke episode ini. Tagihan RS berasal dari E-Klaim.':'Nilai tagihan per komponen pada episode ini berasal dari E-Klaim.'}</p>
          <table className="uc-episode-table">
            <thead><tr><th scope="col">Komponen</th>{results&&<th scope="col">Biaya alokasi (Rp)</th>}<th scope="col">Tagihan RS (Rp)</th></tr></thead>
            <tbody>{components.map(row=><tr key={row.id}>
              <th scope="row">{row.label}</th>{results&&<td>{rupiahCell(row.allocated)}</td>}<td>{rupiahCell(row.billed)}</td>
            </tr>)}</tbody>
            <tfoot><tr><th scope="row">Total</th>{results&&<td>{rupiahCell(unitCost)}</td>}<td>{rupiahCell(totalBilling)}</td></tr></tfoot>
          </table>
          {results&&<p>Angka rupiah ditampilkan tanpa desimal. Total dihitung dari nilai sebelum pembulatan.</p>}
        </section>
      </div>
    </div>
  </dialog>;
}

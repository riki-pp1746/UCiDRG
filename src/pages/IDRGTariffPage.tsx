import {Link} from 'react-router-dom';
import {useTarifPasienStore} from '../stores/tarifPasienStore';
import HospitalBaseRateResults from '../components/costing/HospitalBaseRateResults';
export default function IDRGTariffPage({embedded=false}:{embedded?:boolean}){
  const {localCosting,calculationVersion,calculateDistribution}=useTarifPasienStore();
  return <div className="space-y-4">
    {!embedded&&<h1 className="text-2xl font-bold">CW, Casemix &amp; HBR RS</h1>}
    {localCosting?<><p className="text-xs text-slate-500">Versi hitung lokal {calculationVersion} · Sumber: distribusi 18 komponen RS</p><HospitalBaseRateResults result={localCosting}/></>:<section className="uc-panel space-y-3"><h2>Hasil costing RS perlu dihitung</h2><p>Lengkapi biaya RS dan data pasien, lalu hitung distribusi untuk memperoleh CW RS, casemix, dan HBR.</p><button className="uc-primary" onClick={calculateDistribution}>Hitung distribusi &amp; HBR RS</button><Link to="/costing" className="uc-secondary ml-3">Buka Biaya &amp; Alokasi</Link></section>}
  </div>;
}
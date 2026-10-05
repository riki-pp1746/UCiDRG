// Isolated component test entry. Not included in the production build.
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route,useLocation,useSearchParams} from 'react-router-dom';
import AppLayout from '../src/components/layout/AppLayout';
import {V4Page} from '../src/v4/Pages';
import '../src/index.css';
export function TestPage(){const [params]=useSearchParams();const location=useLocation();const paths:Record<string,string>={'/':'guide','/upload':'upload','/costing':'input','/settings':'settings','/tarif-pasien':'patients','/compare':'comparison','/reports':'reports','/dashboard':'dashboard'};return <><p className="text-xs text-amber-800 mb-3">Pengujian dengan data sintetis</p><V4Page view={paths[location.pathname]||params.get('view')||'guide'}/></>;}
createRoot(document.getElementById('root')!).render(<BrowserRouter><Routes><Route element={<AppLayout/>}><Route path="*" element={<TestPage/>}/></Route></Routes></BrowserRouter>);

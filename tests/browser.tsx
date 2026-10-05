// Isolated component test entry. Not included in the production build.
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route,Link,useSearchParams} from 'react-router-dom';
import {V4Page} from '../src/v4/Pages';
import '../src/index.css';
export function TestPage(){const [params]=useSearchParams();return <V4Page view={params.get('view')||'guide'}/>;}
createRoot(document.getElementById('root')!).render(<BrowserRouter><div className="min-h-screen bg-gray-50 p-5"><p className="text-sm text-amber-800 mb-4">Pengujian komponen dengan data sintetis — bukan data RS</p><nav className="flex gap-4 mb-6">{['guide','input','upload','dashboard','patients','comparison','settings','reports'].map(v=><Link key={v} to={'/tests/browser.html?view='+v}>{v}</Link>)}</nav><Routes><Route path="*" element={<TestPage/>}/></Routes></div></BrowserRouter>);

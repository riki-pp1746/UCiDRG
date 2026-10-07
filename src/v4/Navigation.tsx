import {Link as RouterLink,useLocation} from 'react-router-dom';
import type {ComponentProps} from 'react';
export function Link({to,...props}:ComponentProps<typeof RouterLink>){
 const {pathname}=useLocation();
 const target=pathname.startsWith('/revisi4')&&typeof to==='string'&&to.startsWith('/')?'/revisi4'+(to==='/'?'':to):to;
 return <RouterLink {...props} to={target}/>;
}

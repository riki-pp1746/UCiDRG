import type {Input,Claim,Issue} from './types';
export function mergeCostInput(current:Input,imported:Input):Input {
  return {...current,hospital:imported.hospital,centers:imported.centers,settings:imported.settings,mappingVersion:current.mappingVersion+1,corrections:[]};
}
export function appendClaims(existing:Claim[],incoming:Claim[],issues:Issue[]){
  const claims=[...existing];const seen=new Set(existing.filter(c=>c.sep.trim()).map(c=>c.sep.trim()));const conflicts:Issue[]=[];
  for(const claim of incoming){const sep=claim.sep.trim();if(sep&&seen.has(sep)){conflicts.push({code:'V12',severity:'warning',file:claim.file,row:claim.row,message:'SEP duplikat: baris yang sudah tersimpan dipertahankan.'});continue;}if(sep)seen.add(sep);claims.push(claim);}
  return {claims,issues:[...issues,...conflicts]};
}

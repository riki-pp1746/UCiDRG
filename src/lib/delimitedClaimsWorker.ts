import {parseDelimitedClaimsStream} from './parsers/delimitedClaimsStream';
import {prepareIdentities,restoreIdentityKey} from './analysisIdentity';
let acknowledge:(()=>void)|undefined;
self.onmessage=async(e:MessageEvent)=>{
 if(e.data.kind==='ack'){acknowledge?.();acknowledge=undefined;return;}
 try{restoreIdentityKey(e.data.key);let last=-1;
  const result=await parseDelimitedClaimsStream(e.data.file,async rows=>{
   const records=await prepareIdentities(rows);
   await new Promise<void>(resolve=>{acknowledge=resolve;self.postMessage({kind:'batch',records});});
  },(value,rows)=>{const progress=Math.floor(value);if(progress>last){last=progress;self.postMessage({kind:'progress',progress,rows});}});
  self.postMessage({kind:'complete',result});
 }catch(error){self.postMessage({kind:'error',error:error instanceof Error?error.message:String(error)});}
};

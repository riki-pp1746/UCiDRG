/** Do not create several patient-level models automatically for large uploads. */
export const AUTO_ANALYSIS_LIMIT=50_000;
export const CLAIM_BATCH_SIZE=500;
export const TEXT_CHUNK_BYTES=256*1024;
export const MAX_TEXT_FILE_BYTES=2*1024*1024*1024;
export const shouldAutoAnalyse=(count:number)=>count<AUTO_ANALYSIS_LIMIT;
export function checkAborted(signal?:AbortSignal){if(signal?.aborted)throw new DOMException('Proses dibatalkan.','AbortError');}
export const yieldToUI=()=>new Promise<void>(resolve=>setTimeout(resolve,0));

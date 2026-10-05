export const IDLE_LIMIT=15*60*1000;
export function sessionExpired(lastActivity:number,now=Date.now()){return !lastActivity||now-lastActivity>=IDLE_LIMIT;}

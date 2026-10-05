const MAX_FILE=250*1024*1024;
export function validateFiles(files:Pick<File,'name'|'size'>[],extensions=['txt','csv','xlsx','xls']) {
  if(!files.length)throw new Error('Pilih berkas terlebih dahulu.');
  if(files.length>10)throw new Error('Maksimal 10 berkas dalam satu unggahan.');
  let total=0;
  for(const file of files){
    const ext=file.name.split('.').pop()?.toLowerCase();
    if(!ext||!extensions.includes(ext)||Array.from(file.name).some(c=>c.charCodeAt(0)<32||c===':'))throw new Error('Jenis atau nama berkas tidak didukung.');
    if(!file.size)throw new Error('Berkas kosong tidak dapat diproses.');
    if(file.size>MAX_FILE)throw new Error('Ukuran maksimal 250 MB per berkas.');
    total+=file.size;
  }
  if(total>500*1024*1024)throw new Error('Total unggahan maksimal 500 MB.');
}
export function validateWorkbookSignature(bytes:ArrayBuffer) {
  const b=new Uint8Array(bytes);const zip=b[0]===0x50&&b[1]===0x4b&&b[2]===3&&b[3]===4;
  const ole=[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1].every((v,i)=>b[i]===v);
  if(!zip&&!ole)throw new Error('Isi berkas bukan workbook XLSX/XLS yang didukung.');
}
function encode(bytes:Uint8Array){let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text);}
function decode(text:string){return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
async function key(password:string,salt:Uint8Array,usage:KeyUsage[]) {
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:new Uint8Array(salt),iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,usage);
}
export async function encryptBackup(text:string,password:string) {
  if(password.length<12)throw new Error('Gunakan kata sandi cadangan minimal 12 karakter.');
  if(!crypto.subtle)throw new Error('Enkripsi memerlukan HTTPS atau localhost.');
  const salt=crypto.getRandomValues(new Uint8Array(16));const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(password,salt,['encrypt']),new TextEncoder().encode(text));
  return JSON.stringify({format:'unitcost-encrypted-backup',version:1,kdf:'PBKDF2-SHA256',iterations:600000,cipher:'AES-256-GCM',salt:encode(salt),iv:encode(iv),data:encode(new Uint8Array(cipher))});
}
export async function decryptBackup(text:string,password:string) {
  const data=JSON.parse(text);
  if(data.format!=='unitcost-encrypted-backup')return text; // Legacy integrity-checked backups remain readable.
  if(data.version!==1||data.iterations!==600000||data.kdf!=='PBKDF2-SHA256'||data.cipher!=='AES-256-GCM'||typeof data.data!=='string')throw new Error('Format cadangan terenkripsi tidak didukung.');
  try{const salt=decode(data.salt),iv=decode(data.iv);if(salt.length!==16||iv.length!==12)throw new Error();const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},await key(password,salt,['decrypt']),decode(data.data));return new TextDecoder().decode(plain);}catch{throw new Error('Kata sandi salah atau berkas cadangan rusak. Data lama tidak diubah.');}
}

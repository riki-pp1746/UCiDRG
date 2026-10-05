import {describe,it,expect} from 'vitest';
import {encryptBackup,decryptBackup,validateFiles,validateWorkbookSignature} from '../src/v4/security';
import {sessionExpired,IDLE_LIMIT} from '../src/v4/sessionPolicy';
describe('Perlindungan data lokal',()=>{
  it('cadangan terenkripsi dapat dipulihkan dan memakai nonce berbeda',async()=>{
    const raw=JSON.stringify({sep:'SYNTHETIC-PRIVATE',schema:4});const password='kata-sandi-uji-aman';
    const first=await encryptBackup(raw,password),second=await encryptBackup(raw,password);
    expect(first).not.toContain('SYNTHETIC-PRIVATE');expect(first).not.toEqual(second);
    expect(await decryptBackup(first,password)).toBe(raw);
    await expect(decryptBackup(first,'kata-sandi-salah')).rejects.toThrow('Kata sandi salah');
    const changed=JSON.parse(first);changed.data=(changed.data[0]==='A'?'B':'A')+changed.data.slice(1);
    await expect(decryptBackup(JSON.stringify(changed),password)).rejects.toThrow('rusak');
  });
  it('menolak sandi pendek dan tetap menerima format cadangan lama untuk pemeriksaan integritas',async()=>{
    await expect(encryptBackup('{}','pendek')).rejects.toThrow('12 karakter');
    expect(await decryptBackup('{"schema":4}','')).toBe('{"schema":4}');
  });
  it('membatasi jenis, ukuran, jumlah, dan berkas kosong',()=>{
    expect(()=>validateFiles([{name:'klaim.TXT',size:5}])).not.toThrow();
    for(const file of [{name:'klaim.exe',size:5},{name:'klaim.txt',size:0},{name:'klaim.txt',size:251*1024*1024}])expect(()=>validateFiles([file])).toThrow();
    expect(()=>validateFiles(Array.from({length:11},()=>({name:'a.txt',size:5})))).toThrow();
    expect(()=>validateFiles(Array.from({length:3},()=>({name:'a.txt',size:200*1024*1024})))).toThrow();
    expect(()=>validateWorkbookSignature(new Uint8Array([60,104,116,109,108]).buffer)).toThrow();
    expect(()=>validateWorkbookSignature(new Uint8Array([80,75,3,4]).buffer)).not.toThrow();
  });
  it('sesi berakhir tepat setelah 15 menit atau ketika tidak ada aktivitas valid',()=>{
    expect(sessionExpired(100,100+IDLE_LIMIT-1)).toBe(false);
    expect(sessionExpired(100,100+IDLE_LIMIT)).toBe(true);
    expect(sessionExpired(0,100)).toBe(true);
  });
});

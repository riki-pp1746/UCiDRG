import { useEffect, useId, useState } from 'react';
import { loginCaptchaId, type LoginCaptchaProof } from '../../lib/loginCaptcha';

interface Captcha {
  appendTo(selector: string): Captcha;
  onReady(callback: () => void): Captcha;
  onSuccess(callback: () => void): Captcha;
  onError(callback: () => void): Captcha;
  getValidate(): LoginCaptchaProof | false;
  destroy(): void;
}

declare global {
  interface Window {
    initGeetest4?: (config: object, callback: (captcha: Captcha) => void) => void;
  }
}

let loading: Promise<void> | undefined;
function loadCaptcha() {
  if (window.initGeetest4) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://static.geetest.com/v4/gt4.js';
    script.async = true;
    const fail = () => { script.remove(); reject(new Error('Verifikasi gambar gagal dimuat.')); };
    const timer = window.setTimeout(fail, 10000);
    script.onload = () => { window.clearTimeout(timer); if (window.initGeetest4) resolve(); else fail(); };
    script.onerror = () => { window.clearTimeout(timer); fail(); };
    document.head.append(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}

export default function LoginCaptcha({ onProof }: { onProof: (proof: LoginCaptchaProof | null) => void }) {
  const id = 'captcha-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [attempt, retry] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'done' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    let instance: Captcha | undefined;
    const fail = () => { if (active) { onProof(null); setState('error'); } };
    const timer = window.setTimeout(fail, 15000);
    void loadCaptcha().then(() => {
      if (!active) return;
      window.initGeetest4?.({ captchaId: loginCaptchaId, product: 'popup', language: 'ind', riskType: 'slide', nativeButton: { width: '100%' } }, captcha => {
        if (!active) { captcha.destroy(); return; }
        instance = captcha;
        captcha.onReady(() => { window.clearTimeout(timer); if (active) setState('ready'); })
          .onSuccess(() => {
            if (!active) return;
            const proof = captcha.getValidate();
            if (proof) { onProof(proof); setState('done'); }
            else fail();
          })
          .onError(fail)
          .appendTo('#' + id);
      });
    }).catch(fail);
    return () => { active = false; window.clearTimeout(timer); instance?.destroy(); };
  }, [id, attempt, onProof]);

  return <div className="space-y-2">
    <p className="text-xs font-semibold text-teal-950">Verifikasi gambar</p>
    <p className="text-xs text-slate-600">Buka verifikasi, lalu geser potongan gambar ke tempatnya.</p>
    <div id={id} hidden={state === 'error'}/>
    {state === 'loading' && <p role="status" className="text-xs text-slate-600">Memuat verifikasi…</p>}
    {state === 'done' && <p role="status" className="text-xs text-teal-800">Gambar sudah diverifikasi.</p>}
    {state === 'error' && <button type="button" className="uc-secondary" onClick={() => { setState('loading'); retry(value => value + 1); }}>Muat ulang verifikasi</button>}
  </div>;
}

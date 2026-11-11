import { createHmac } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const supabaseUrl = 'https://vowutzxizrrywpwcobth.supabase.co';
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const captchaFields = ['lot_number', 'captcha_output', 'pass_token', 'gen_time'] as const;
type Request = IncomingMessage & { body?: unknown };

export default async function signIn(req: Request, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = (status: number, data: object) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, { code: 'method_not_allowed' }); }
  if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { code: 'invalid_request' });

  const captchaId = process.env.VITE_GEETEST_CAPTCHA_ID?.trim();
  const captchaKey = process.env.GEETEST_CAPTCHA_KEY?.trim();
  const publicKey = process.env.NEXT_PUBLIC_AkunSUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!captchaId || !captchaKey || !publicKey || !serviceKey) return send(503, { code: 'captcha_unavailable' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, password, proof } = body ?? {};
    if (typeof email !== 'string' || !email || email.length > 320 || typeof password !== 'string' || !password || password.length > 4096) {
      return send(400, { code: 'invalid_request' });
    }
    if (!proof || captchaFields.some(key => typeof proof[key] !== 'string' || !proof[key] || proof[key].length > 8192)
      || !/^[a-f0-9]{32}$/i.test(proof.lot_number) || !/^\d{10}$/.test(proof.gen_time)) {
      return send(400, { code: 'captcha_required' });
    }
    const age = Date.now() - Number(proof.gen_time) * 1000;
    if (age < -30000 || age > 300000) return send(403, { code: 'captcha_invalid' });

    const params = new URLSearchParams({ captcha_id: captchaId, sign_token: createHmac('sha256', captchaKey).update(proof.lot_number).digest('hex') });
    for (const field of captchaFields) params.set(field, proof[field]);
    const verification = await fetch('https://gcaptcha4.geetest.com/validate', {
      method: 'POST', body: params, redirect: 'error', signal: AbortSignal.timeout(6000),
    });
    if (!verification.ok) return send(503, { code: 'captcha_unavailable' });
    const verdict = await verification.json();
    if (verdict.status !== 'success' || verdict.result !== 'success' || verdict.captcha_args?.used_type !== 'slide') {
      return send(403, { code: 'captcha_invalid' });
    }

    const rpc = (name: string, data: object) => fetch(supabaseUrl + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { apikey: serviceKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(data), redirect: 'error', signal: AbortSignal.timeout(6000),
    });
    const lot = proof.lot_number.toLowerCase();
    const consumed = await rpc('unitcost_consume_login_puzzle', { puzzle_id: lot });
    if (!consumed.ok) return send(503, { code: 'captcha_unavailable' });
    if (await consumed.json() !== true) return send(403, { code: 'captcha_invalid' });

    const login = await fetch(supabaseUrl + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }), redirect: 'error', signal: AbortSignal.timeout(6000),
    });
    if (!login.ok) return send(login.status === 429 ? 429 : login.status >= 500 ? 503 : 401,
      { code: login.status === 429 ? 'over_request_rate_limit' : login.status >= 500 ? 'captcha_unavailable' : 'invalid_credentials' });
    const { access_token, refresh_token, user } = await login.json();
    if (typeof access_token !== 'string' || typeof refresh_token !== 'string' || !uuid.test(user?.id ?? '')) return send(503, { code: 'captcha_unavailable' });
    // This token comes directly from the fixed Supabase Auth endpoint over HTTPS.
    const claims = JSON.parse(Buffer.from(access_token.split('.')[1], 'base64url').toString('utf8'));
    if (!uuid.test(claims.session_id ?? '') || claims.sub !== user.id) return send(503, { code: 'captcha_unavailable' });
    const approved = await rpc('unitcost_allow_puzzle_session', { puzzle_id: lot, login_session: claims.session_id, login_user: user.id });
    if (!approved.ok || await approved.json() !== true) return send(503, { code: 'captcha_unavailable' });
    return send(200, { access_token, refresh_token });
  } catch {
    return send(503, { code: 'captcha_unavailable' });
  }
}

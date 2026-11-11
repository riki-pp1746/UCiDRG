import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import signIn from '../api/sign-in';

const id = '11111111-1111-4111-8111-111111111111';
const session = '22222222-2222-4222-8222-222222222222';
const proof = () => ({
  lot_number: 'c'.repeat(32), captcha_output: 'test-output', pass_token: 'test-pass',
  gen_time: String(Math.floor(Date.now() / 1000)),
});

async function request(body: object) {
  const req = { method: 'POST', headers: { 'content-type': 'application/json' }, body } as IncomingMessage;
  const res = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };
  await signIn(req, res as unknown as ServerResponse);
  return { status: res.statusCode, payload: JSON.parse(res.end.mock.calls[0][0]) };
}

beforeEach(() => {
  vi.stubEnv('VITE_GEETEST_CAPTCHA_ID', 'test-id');
  vi.stubEnv('GEETEST_CAPTCHA_KEY', 'test-key');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-publishable');
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('releases tokens only after slider validation, one-time consumption and session approval', async () => {
  const access_token = 'header.'+Buffer.from(JSON.stringify({session_id: session, sub:id})).toString('base64url')+'.signature';
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({status:'success',result:'success',captcha_args:{used_type:'slide'}}))
    .mockResolvedValueOnce(Response.json(true))
    .mockResolvedValueOnce(Response.json({access_token, refresh_token:'test-refresh', user:{id}}))
    .mockResolvedValueOnce(Response.json(true));
  vi.stubGlobal('fetch', fetch);
  const result = await request({email:'test@example.test',password:'test-only',proof:proof()});
  expect(result).toEqual({status:200,payload:{access_token,refresh_token:'test-refresh'}});
  expect(fetch.mock.calls[0][0]).toBe('https://gcaptcha4.geetest.com/validate');
  expect([...fetch.mock.calls[0][1].body.keys()]).not.toContain('password');
  expect(fetch.mock.calls[1][0]).toContain('unitcost_consume_login_puzzle');
  expect(fetch.mock.calls[2][0]).toContain('grant_type=password');
  expect(JSON.parse(fetch.mock.calls[3][1].body)).toMatchObject({login_session:session,login_user:id});
});

it.each(['outage','non-slide','reused'])('does not submit the password when the puzzle is %s', async kind => {
  const fetch = vi.fn().mockResolvedValueOnce(kind==='outage'?new Response(null,{status:503}):
    Response.json({status:'success',result:'success',captcha_args:{used_type:kind==='non-slide'?'onepass':'slide'}}))
    .mockResolvedValueOnce(Response.json(false));
  vi.stubGlobal('fetch', fetch);
  const result = await request({email:'test@example.test',password:'test-only',proof:proof()});
  expect(result.status).toBe(kind==='outage'?503:403);
  expect(fetch.mock.calls.some(([url])=>String(url).includes('/auth/v1/token'))).toBe(false);
});

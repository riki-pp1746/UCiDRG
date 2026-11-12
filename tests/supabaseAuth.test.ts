import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
  sessionCheck:vi.fn(),
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    updateUser: vi.fn(),
    onAuthStateChange: vi.fn(),
    stopAutoRefresh: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  sdk.sessionCheck.mockResolvedValue({data:true,error:null});
  sdk.rpc.mockImplementation((name:string)=>{
    if(name!=='unitcost_session_is_active')return {maybeSingle:sdk.maybeSingle};
    const promise=sdk.sessionCheck();return Object.assign(promise,{abortSignal:()=>promise});
  });
  sdk.maybeSingle.mockResolvedValue({
    data: { role: 'user', status: 'active', expires_at: '2027-02-11T00:00:00Z' },
    error: null,
  });
  sdk.createClient.mockImplementation(()=>({ auth: sdk.auth, rpc: sdk.rpc }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('uses a Supabase session to open the workspace and forgets it on logout', async () => {
  sdk.auth.signInWithPassword.mockResolvedValueOnce({
    data: { session: { user: { email: 'user@example.test', user_metadata: {} } } },
    error: null,
  });
  const { useAuthStore } = await import('../src/stores/authStore');

  await expect(useAuthStore.getState().login(' user@example.test ', 'test-password', { completedAt: Date.now() }))
    .resolves.toEqual({ status: 'authenticated' });
  expect(sdk.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'user@example.test', password: 'test-password' });
  expect(sdk.createClient).toHaveBeenCalledWith('https://vowutzxizrrywpwcobth.supabase.co', 'sb_publishable_test', {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  });
  expect(useAuthStore.getState().user?.username).toBe('user@example.test');

  useAuthStore.getState().logout();
  expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, user: null });
  expect(sdk.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
});

it('waits for approval even when registration returns a Supabase session', async () => {
  const user = { user_metadata: { display_name: 'Test User', hospital_name: 'RS ABC', role: 'admin' } };
  sdk.auth.signUp.mockResolvedValueOnce({
    data: { session: { user }, user },
    error: null,
  });
  const { useAuthStore } = await import('../src/stores/authStore');

  await expect(useAuthStore.getState().register('user@example.test', 'Abcde1!2', ' Test User ', ' RS ABC ', '0812-3456-7890', ' 0012345 '))
    .resolves.toEqual({ status: 'pending' });
  expect(sdk.auth.signUp).toHaveBeenCalledWith({
    email: 'user@example.test',
    password: 'Abcde1!2',
    options: {
      data: { display_name: 'Test User', hospital_name: 'RS ABC', hospital_code: '0012345', phone_number: '081234567890' },
    },
  });
  expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, user: null });
  expect(sdk.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
});

it('rejects registration with any missing field or an incomplete password combination before contacting Supabase', async () => {
  const { useAuthStore } = await import('../src/stores/authStore');
  const register = useAuthStore.getState().register;
  const valid = ['user@example.test', 'Abcde1!2', 'Test User', 'RS ABC', '081234567890', '0012345'] as const;
  for (let index = 0; index < valid.length; index++) {
    const fields: Parameters<typeof register> = [...valid];
    fields[index] = index === 1 ? '' : '   ';
    await expect(register(...fields)).resolves.toMatchObject({ status: 'error', message: 'Lengkapi semua kolom pendaftaran.' });
  }
  for (const password of ['Ab1!', 'abcde1!2', 'ABCDE1!2', 'Abcdef!?', 'Abcdef12', 'Abcdef1 ']) {
    await expect(register(valid[0], password, valid[2], valid[3], valid[4], valid[5]))
      .resolves.toMatchObject({ status: 'error', message: expect.stringContaining('Minimal 8 karakter') });
  }
  expect(sdk.auth.signUp).not.toHaveBeenCalled();
});

it.each(['pending', 'expired'])('blocks login for a %s account', async status => {
  sdk.auth.signInWithPassword.mockResolvedValueOnce({
    data: { session: { user: { email: 'user@example.test' } } },
    error: null,
  });
  sdk.maybeSingle.mockResolvedValueOnce({ data: { role: 'user', status }, error: null });
  const { useAuthStore } = await import('../src/stores/authStore');
  await expect(useAuthStore.getState().login('user@example.test', 'test-password', { completedAt: Date.now() }))
    .resolves.toMatchObject({ status: 'error' });
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(sdk.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
});

it('uses the Admin alias and trusts the server role instead of user metadata', async () => {
  sdk.auth.signInWithPassword.mockResolvedValueOnce({
    data: { session: { user: { user_metadata: { role: 'admin' } } } },
    error: null,
  });
  const { useAuthStore } = await import('../src/stores/authStore');
  await expect(useAuthStore.getState().login('Admin', 'test-password', { completedAt: Date.now() }))
    .resolves.toEqual({ status: 'authenticated' });
  expect(sdk.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'admin@unitcost.example', password: 'test-password' });
  expect(useAuthStore.getState().user?.role).toBe('user');
  useAuthStore.getState().logout();
});

it('keeps the workspace locked when the public key is absent', async () => {
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
  const { useAuthStore } = await import('../src/stores/authStore');
  await expect(useAuthStore.getState().login('user@example.test', 'test-password', { completedAt: Date.now() }))
    .resolves.toMatchObject({ status: 'error' });
  expect(sdk.createClient).not.toHaveBeenCalled();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

it('saves the selected hospital class to the signed-in profile and reads it at the next login', async () => {
  let userMetadata = { hospital_class: 'B', hospital_name: 'RS ABC' };
  sdk.auth.signInWithPassword.mockImplementation(async () => ({
    data: { session: { user: { email: 'user@example.test', user_metadata: userMetadata } } },
    error: null,
  }));
  sdk.auth.updateUser.mockImplementationOnce(async ({ data }) => {
    userMetadata = { ...userMetadata, ...data };
    return { data: { user: { user_metadata: userMetadata } }, error: null };
  });
  const { useAuthStore, saveHospitalClass } = await import('../src/stores/authStore');
  const login = () => useAuthStore.getState().login('user@example.test', 'test-password', { completedAt: Date.now() });
  await login();
  expect(useAuthStore.getState().user?.hospitalClass).toBe('B');
  await saveHospitalClass('C');
  expect(sdk.auth.updateUser).toHaveBeenCalledWith({ data: { hospital_class: 'C' } });
  expect(useAuthStore.getState().user).toMatchObject({ hospitalClass: 'C', namaRS: 'RS ABC', role: 'user' });
  useAuthStore.getState().logout();
  await login();
  expect(useAuthStore.getState().user?.hospitalClass).toBe('C');
  useAuthStore.getState().logout();
});

it('requires a fresh local puzzle before submitting the password', async () => {
  const { useAuthStore } = await import('../src/stores/authStore');
  for (const proof of [undefined, { completedAt: Date.now() - 120_000 }]) {
    await expect(useAuthStore.getState().login('user@example.test', 'test-password', proof))
      .resolves.toMatchObject({ status: 'error' });
  }
  expect(sdk.auth.signInWithPassword).not.toHaveBeenCalled();
});

it('clears local analysis when the server replaces this device session',async()=>{
 sdk.auth.signInWithPassword.mockResolvedValueOnce({data:{session:{user:{email:'user@example.test',user_metadata:{}}}},error:null});
 const {useAuthStore,verifyActiveSession}=await import('../src/stores/authStore');
 await useAuthStore.getState().login('user@example.test','test-password',{completedAt:Date.now()});
 const {useCostingStore}=await import('../src/stores/costingStore');
 useCostingStore.setState({rawRecords:[{internalId:'private-case'} as never]});
 sdk.sessionCheck.mockResolvedValue({data:false,error:null});
 await expect(verifyActiveSession()).resolves.toBe(false);
 expect(useAuthStore.getState()).toMatchObject({isAuthenticated:false,user:null});
 expect(useAuthStore.getState().sessionNotice).toContain('perangkat lain');
 expect(useCostingStore.getState().rawRecords).toEqual([]);
 expect(sdk.auth.signOut).toHaveBeenCalledWith({scope:'local'});
});

it('fails closed when session verification is missing during login',async()=>{
 sdk.auth.signInWithPassword.mockResolvedValueOnce({data:{session:{user:{email:'user@example.test'}}},error:null});
 sdk.sessionCheck.mockResolvedValue({data:null,error:{code:'PGRST202'}});
 const {useAuthStore}=await import('../src/stores/authStore');
 await expect(useAuthStore.getState().login('user@example.test','test-password',{completedAt:Date.now()})).resolves.toMatchObject({status:'error'});
 expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

it('does not open a displaced session and reports the reason',async()=>{
 sdk.auth.signInWithPassword.mockResolvedValueOnce({data:{session:{user:{email:'user@example.test'}}},error:null});
 sdk.maybeSingle.mockResolvedValueOnce({data:{role:'user',status:'session_replaced',expires_at:null},error:null});
 const {useAuthStore}=await import('../src/stores/authStore');
 await expect(useAuthStore.getState().login('user@example.test','test-password',{completedAt:Date.now()})).resolves.toMatchObject({status:'error',message:expect.stringContaining('perangkat atau browser lain')});
 expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

it('allows a brief connection retry and ends an unverifiable session after 45 seconds',async()=>{
 vi.useFakeTimers();
 try{
  sdk.auth.signInWithPassword.mockResolvedValueOnce({data:{session:{user:{email:'user@example.test'}}},error:null});
  const {useAuthStore,verifyActiveSession}=await import('../src/stores/authStore');
  await useAuthStore.getState().login('user@example.test','test-password',{completedAt:Date.now()});
  sdk.sessionCheck.mockResolvedValue({data:null,error:{message:'network'}});
  await verifyActiveSession();
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
  vi.advanceTimersByTime(45001);
  await verifyActiveSession();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(useAuthStore.getState().sessionNotice).toContain('Periksa koneksi');
 }finally{vi.useRealTimers();}
});

it('ignores an old device check arriving after a new login',async()=>{
 sdk.auth.signInWithPassword.mockImplementation(async()=>({data:{session:{user:{email:'user@example.test'}}},error:null}));
 const {useAuthStore,verifyActiveSession}=await import('../src/stores/authStore');
 await useAuthStore.getState().login('user@example.test','test-password',{completedAt:Date.now()});
 let finish!:(result:{data:boolean;error:null})=>void;
 const pending=new Promise<{data:boolean;error:null}>(resolve=>{finish=resolve;});
 sdk.sessionCheck.mockReturnValueOnce(pending);
 const oldCheck=verifyActiveSession();
 useAuthStore.getState().logout();
 await useAuthStore.getState().login('user@example.test','test-password',{completedAt:Date.now()});
 finish({data:false,error:null});
 await oldCheck;
 expect(useAuthStore.getState().isAuthenticated).toBe(true);
 useAuthStore.getState().logout();
});

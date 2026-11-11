import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
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
  sdk.rpc.mockReturnValue({ maybeSingle: sdk.maybeSingle });
  sdk.maybeSingle.mockResolvedValue({
    data: { role: 'user', status: 'active', expires_at: '2027-02-11T00:00:00Z' },
    error: null,
  });
  sdk.createClient.mockReturnValue({ auth: sdk.auth, rpc: sdk.rpc });
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

  await expect(useAuthStore.getState().register('user@example.test', 'test-password', ' Test User ', ' RS ABC ', '0812-3456-7890', ' 0012345 '))
    .resolves.toEqual({ status: 'pending' });
  expect(sdk.auth.signUp).toHaveBeenCalledWith({
    email: 'user@example.test',
    password: 'test-password',
    options: {
      data: { display_name: 'Test User', hospital_name: 'RS ABC', hospital_code: '0012345', phone_number: '081234567890' },
    },
  });
  expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, user: null });
  expect(sdk.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
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

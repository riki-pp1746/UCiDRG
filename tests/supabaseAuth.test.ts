import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  createClient: vi.fn(),
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
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
  sdk.createClient.mockReturnValue({ auth: sdk.auth });
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

  await expect(useAuthStore.getState().login(' user@example.test ', 'test-password'))
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

it('opens the workspace immediately when registration returns a session', async () => {
  sdk.auth.signUp.mockResolvedValueOnce({
    data: { session: { user: { user_metadata: { display_name: 'Test User', hospital_name: 'RS ABC' } } } },
    error: null,
  });
  const { useAuthStore } = await import('../src/stores/authStore');

  await expect(useAuthStore.getState().register('user@example.test', 'test-password', ' Test User ', ' RS ABC '))
    .resolves.toEqual({ status: 'authenticated' });
  expect(sdk.auth.signUp).toHaveBeenCalledWith({
    email: 'user@example.test',
    password: 'test-password',
    options: {
      data: { display_name: 'Test User', hospital_name: 'RS ABC' },
    },
  });
  expect(useAuthStore.getState()).toMatchObject({
    isAuthenticated: true,
    user: { username: 'Test User', namaRS: 'RS ABC' },
  });
  useAuthStore.getState().logout();
});

it('keeps the workspace locked if Supabase does not return an active registration session', async () => {
  sdk.auth.signUp.mockResolvedValueOnce({ data: { session: null }, error: null });
  const { useAuthStore } = await import('../src/stores/authStore');
  await expect(useAuthStore.getState().register('user@example.test', 'test-password', 'Test User', 'RS ABC'))
    .resolves.toMatchObject({ status: 'error' });
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

it('keeps the workspace locked when the public key is absent', async () => {
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
  const { useAuthStore } = await import('../src/stores/authStore');
  await expect(useAuthStore.getState().login('user@example.test', 'test-password'))
    .resolves.toMatchObject({ status: 'error' });
  expect(sdk.createClient).not.toHaveBeenCalled();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

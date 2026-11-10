import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import { clearAnalysisSession } from '../lib/sessionData';

const supabaseUrl = 'https://vowutzxizrrywpwcobth.supabase.co';
const publishableKey = import.meta.env.NEXT_PUBLIC_AkunSUPABASE_PUBLISHABLE_KEY?.trim()
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const authConfigured = Boolean(publishableKey?.startsWith('sb_publishable_'));
const adminEmail = 'admin@unitcost.example';

type AccountRole = 'admin' | 'user';
type AccountStatus = 'pending' | 'active' | 'expired';
interface AccountAccess {
  role: AccountRole;
  status: AccountStatus;
  expires_at: string | null;
}

export interface ManagedAccount {
  user_id: string;
  email: string | null;
  display_name: string | null;
  phone_number: string | null;
  hospital_name: string | null;
  hospital_code: string | null;
  expires_at: string | null;
  status: AccountStatus;
}

type AuthResult =
  | { status: 'authenticated' }
  | { status: 'pending' }
  | { status: 'error'; message: string };

interface AuthState {
  isAuthenticated: boolean;
  user: { username: string; namaRS: string; role: AccountRole; expiresAt: string | null } | null;
  lastActivity: number;
  touch: () => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, name: string, hospital: string, phone: string, hospitalCode: string) => Promise<AuthResult>;
  logout: () => void;
}

let client: SupabaseClient | undefined;

function clearLocalLogin() {
  clearAnalysisSession();
  useAuthStore.setState({ isAuthenticated: false, user: null, lastActivity: 0 });
}

function getClient() {
  if (!authConfigured || !publishableKey) throw new Error('Koneksi Supabase Auth belum dikonfigurasi.');
  if (client) return client;

  const connection = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  });
  client = connection;
  connection.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT' && client === connection && useAuthStore.getState().isAuthenticated) {
      clearLocalLogin();
    }
  });
  return connection;
}

function authMessage(code: string | undefined) {
  switch (code) {
    case 'email_not_confirmed': return 'Akun ini belum aktif. Hubungi pengelola aplikasi untuk mengaktifkannya.';
    case 'email_address_not_authorized':
    case 'over_email_send_rate_limit': return 'Pendaftaran belum siap. Hubungi pengelola aplikasi.';
    case 'user_already_exists': return 'Email ini sudah terdaftar. Gunakan formulir Masuk.';
    case 'invalid_credentials': return 'Email atau sandi tidak sesuai.';
    case 'weak_password': return 'Sandi belum memenuhi persyaratan keamanan proyek.';
    case 'signup_disabled':
    case 'email_provider_disabled': return 'Pendaftaran email belum diaktifkan oleh pengelola proyek.';
    case 'over_request_rate_limit': return 'Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.';
    default: return 'Permintaan akun tidak dapat diproses. Periksa koneksi dan coba lagi.';
  }
}

type AuthRequest = (connection: SupabaseClient) => Promise<{
  data: { session: Session | null; user: Session['user'] | null };
  error: { code?: string } | null;
}>;

async function authenticate(request: AuthRequest, registration = false): Promise<AuthResult> {
  if (!authConfigured) return { status: 'error', message: 'Koneksi Supabase Auth belum dikonfigurasi.' };
  let connection: SupabaseClient | undefined;
  try {
    connection = getClient();
    const { data, error } = await request(connection);
    if (client !== connection) return { status: 'error', message: 'Sesi sudah berakhir. Silakan masuk kembali.' };
    if (error) return { status: 'error', message: authMessage(error.code) };
    if (registration) {
      useAuthStore.getState().logout();
      return data.user ? { status: 'pending' } : { status: 'error', message: authMessage(undefined) };
    }
    if (!data.session) {
      return { status: 'error', message: authMessage(undefined) };
    }

    const { data: access, error: accessError } = await connection.rpc('unitcost_my_access').maybeSingle<AccountAccess>();
    if (client !== connection) return { status: 'error', message: 'Sesi sudah berakhir. Silakan masuk kembali.' };
    if (accessError || access?.status !== 'active') {
      useAuthStore.getState().logout();
      const message = access?.status === 'expired'
        ? 'Masa aktif akun sudah habis. Hubungi admin untuk perpanjangan.'
        : 'Akun belum disetujui admin.';
      return { status: 'error', message: accessError ? 'Status akun tidak dapat diperiksa. Coba lagi.' : message };
    }

    const account = data.session.user;
    const metadata = account.user_metadata;
    const displayName = typeof metadata?.display_name === 'string' ? metadata.display_name.trim() : '';
    const hospital = typeof metadata?.hospital_name === 'string' ? metadata.hospital_name.trim() : '';
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        username: displayName || (access.role === 'admin' ? 'Admin' : account.email || 'Pengguna'),
        namaRS: hospital,
        role: access.role, expiresAt: access.expires_at,
      },
      lastActivity: Date.now(),
    });
    return { status: 'authenticated' };
  } catch {
    if (connection && client === connection) useAuthStore.getState().logout();
    return { status: 'error', message: authMessage(undefined) };
  }
}

export const useAuthStore = create<AuthState>(set => ({
  isAuthenticated: false,
  user: null,
  lastActivity: 0,
  touch: () => set({ lastActivity: Date.now() }),
  login: (identity, password) => {
    const email = identity.trim();
    return authenticate(connection =>
      connection.auth.signInWithPassword({ email: email.toLowerCase() === 'admin' ? adminEmail : email, password }),
    );
  },
  register: async (email, password, name, hospital, phone, hospitalCode) => {
    if (email.trim().toLowerCase() === adminEmail) {
      return { status: 'error', message: 'Gunakan alamat email pengguna.' };
    }
    const phoneNumber = phone.trim().replace(/[\s()-]/g, '');
    if (!/^\+?[0-9]{8,15}$/.test(phoneNumber)) {
      return { status: 'error', message: 'Masukkan nomor HP yang valid, misalnya 081234567890.' };
    }
    const code = hospitalCode.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$/.test(code)) {
      return { status: 'error', message: 'Masukkan kode RS yang valid, misalnya 3372165.' };
    }
    return authenticate(connection => connection.auth.signUp({
      email: email.trim(), password,
      options: { data: {
        display_name: name.trim(),
        hospital_name: hospital.trim(),
        hospital_code: code,
        phone_number: phoneNumber,
      } },
    }), true);
  },
  logout: () => {
    const connection = client;
    client = undefined;
    clearLocalLogin();
    if (connection) {
      void connection.auth.stopAutoRefresh().catch(() => {});
      void connection.auth.signOut({ scope: 'local' }).catch(() => {});
    }
  },
}));

export async function listManagedAccounts(): Promise<ManagedAccount[]> {
  const { data, error } = await getClient().rpc('unitcost_list_users');
  if (error || !Array.isArray(data)) throw new Error('Daftar akun tidak dapat dimuat. Pastikan akses admin masih aktif.');
  return data;
}

export async function updateManagedAccount(account: ManagedAccount, action: 'approve' | 'extend') {
  const { error } = await getClient().rpc('unitcost_update_user', {
    target_id: account.user_id,
    action,
    expected_expiry: account.expires_at,
  });
  if (error) throw new Error('Perubahan gagal. Muat ulang daftar akun lalu coba lagi.');
}

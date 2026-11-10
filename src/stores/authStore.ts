import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import { clearAnalysisSession } from '../lib/sessionData';

const supabaseUrl = 'https://mwhvjghostrqqoftuhdc.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const authConfigured = Boolean(publishableKey?.startsWith('sb_publishable_'));

type AuthResult =
  | { status: 'authenticated' }
  | { status: 'error'; message: string };

interface AuthState {
  isAuthenticated: boolean;
  user: { username: string; namaRS: string } | null;
  lastActivity: number;
  touch: () => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, name: string, hospital: string) => Promise<AuthResult>;
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
  data: { session: Session | null };
  error: { code?: string } | null;
}>;

async function authenticate(request: AuthRequest, registration = false): Promise<AuthResult> {
  if (!authConfigured) return { status: 'error', message: 'Koneksi Supabase Auth belum dikonfigurasi.' };
  try {
    const connection = getClient();
    const { data, error } = await request(connection);
    if (client !== connection) return { status: 'error', message: 'Sesi sudah berakhir. Silakan masuk kembali.' };
    if (error) return { status: 'error', message: authMessage(error.code) };
    if (!data.session) {
      return {
        status: 'error',
        message: registration ? 'Akun belum aktif. Hubungi pengelola aplikasi.' : authMessage(undefined),
      };
    }

    const account = data.session.user;
    const metadata = account.user_metadata;
    const displayName = typeof metadata?.display_name === 'string' ? metadata.display_name.trim() : '';
    const hospital = typeof metadata?.hospital_name === 'string' ? metadata.hospital_name.trim() : '';
    useAuthStore.setState({
      isAuthenticated: true,
      user: { username: displayName || account.email || 'Pengguna', namaRS: hospital },
      lastActivity: Date.now(),
    });
    return { status: 'authenticated' };
  } catch {
    return { status: 'error', message: authMessage(undefined) };
  }
}

export const useAuthStore = create<AuthState>(set => ({
  isAuthenticated: false,
  user: null,
  lastActivity: 0,
  touch: () => set({ lastActivity: Date.now() }),
  login: (email, password) => authenticate(connection =>
    connection.auth.signInWithPassword({ email: email.trim(), password }),
  ),
  register: (email, password, name, hospital) => authenticate(connection =>
    connection.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim(), hospital_name: hospital.trim() },
      },
    }),
    true,
  ),
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

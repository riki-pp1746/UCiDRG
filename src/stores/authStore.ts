import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import { clearAnalysisSession } from '../lib/sessionData';
import { isHospitalClass, type HospitalClass } from '../types/hospitalClass';
import { isLoginCaptchaProofValid, type LoginCaptchaProof } from '../lib/loginCaptcha';
import { meetsRegistrationPasswordRules, registrationPasswordHelp } from '../lib/registrationPassword';
import { GLOSSARY, wordCount, type GlossaryKey } from '../lib/glossary';

const supabaseUrl = 'https://vowutzxizrrywpwcobth.supabase.co';
const publishableKey = import.meta.env.NEXT_PUBLIC_AkunSUPABASE_PUBLISHABLE_KEY?.trim()
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const authConfigured = Boolean(publishableKey?.startsWith('sb_publishable_'));
const adminEmail = 'admin@unitcost.example';

type AccountRole = 'admin' | 'user';
type AccountStatus = 'pending' | 'active' | 'expired';
interface AccountAccess {
  role: AccountRole;
  status: AccountStatus | 'session_replaced';
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
  user: { username: string; namaRS: string; role: AccountRole; expiresAt: string | null; hospitalClass?: HospitalClass } | null;
  lastActivity: number;
  sessionNotice: string | null;
  touch: () => void;
  login: (email: string, password: string, proof?: LoginCaptchaProof) => Promise<AuthResult>;
  register: (email: string, password: string, name: string, hospital: string, phone: string, hospitalCode: string) => Promise<AuthResult>;
  logout: () => void;
}

let client: SupabaseClient | undefined;
export type GlossaryOverride = {summary:string;detail:string};

export async function loadGlossaryOverrides() {
  if (!client || !useAuthStore.getState().isAuthenticated) return {};
  const {data,error}=await client.rpc('unitcost_glossary_entries');
  if(error || !Array.isArray(data))throw new Error('Glosarium bersama belum dapat dimuat.');
  const result:Partial<Record<GlossaryKey,GlossaryOverride>>={};
  for(const row of data){
    if(typeof row?.term_key==='string' && Object.prototype.hasOwnProperty.call(GLOSSARY,row.term_key)
      && typeof row.summary==='string' && typeof row.detail==='string'){
      result[row.term_key as GlossaryKey]={summary:row.summary,detail:row.detail};
    }
  }
  return result;
}

export async function saveGlossaryOverride(key:GlossaryKey,text:GlossaryOverride|null) {
  if(!client || useAuthStore.getState().user?.role!=='admin')throw new Error('Hanya Admin yang dapat menyunting glosarium.');
  if(text && (!text.summary.trim() || !text.detail.trim() || wordCount(text.summary)>25 || wordCount(text.detail)>100)){
    throw new Error('Isi ringkasan hingga 25 kata dan panel hingga 100 kata.');
  }
  const {error}=await client.rpc('unitcost_set_glossary_entry',{p_term_key:key,p_summary:text?.summary??null,p_detail:text?.detail??null});
  if(error)throw new Error('Perubahan belum tersimpan. Periksa sesi dan ketersediaan glosarium bersama.');
}
let verifiedAt = 0;
let verification: {connection:SupabaseClient;promise:Promise<boolean>} | undefined;

function endRemoteSession(message:string){
  useAuthStore.getState().logout();
  useAuthStore.setState({sessionNotice:message});
}

function clearLocalLogin() {
  clearAnalysisSession();
  verifiedAt=0;
  useAuthStore.setState({ isAuthenticated: false, user: null, lastActivity: 0, sessionNotice:null });
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
    case 'captcha_required':
    case 'captcha_invalid': return 'Verifikasi gambar gagal atau kedaluwarsa. Coba gambar baru.';
    case 'captcha_unavailable': return 'Verifikasi gambar belum bisa digunakan. Coba lagi sebentar.';
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
        : access?.status === 'session_replaced'
        ? 'Akun ini sudah masuk pada perangkat atau browser lain. Silakan masuk kembali.'
        : 'Akun belum disetujui admin.';
      return { status: 'error', message: accessError ? 'Status akun tidak dapat diperiksa. Coba lagi.' : message };
    }

    const {data:sessionActive,error:sessionError}=await connection.rpc('unitcost_session_is_active');
    if(client!==connection)return {status:'error',message:'Sesi sudah berakhir. Silakan masuk kembali.'};
    if(sessionError||sessionActive!==true){
      useAuthStore.getState().logout();
      return {status:'error',message:sessionError?'Sesi perangkat belum dapat diverifikasi. Coba lagi.':'Akun ini sudah masuk pada perangkat atau browser lain. Silakan masuk kembali.'};
    }
    verifiedAt=Date.now();

    const account = data.session.user;
    const metadata = account.user_metadata;
    const displayName = typeof metadata?.display_name === 'string' ? metadata.display_name.trim() : '';
    const hospital = typeof metadata?.hospital_name === 'string' ? metadata.hospital_name.trim() : '';
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        username: displayName || (access.role === 'admin' ? 'Admin' : account.email || 'Pengguna'),
        namaRS: hospital,
        hospitalClass: isHospitalClass(metadata?.hospital_class) ? metadata.hospital_class : undefined,
        role: access.role, expiresAt: access.expires_at,
      },
      lastActivity: Date.now(),
      sessionNotice:null,
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
  sessionNotice:null,
  touch: () => set({ lastActivity: Date.now() }),
  login: (identity, password, proof) => {
    const trimmed = identity.trim();
    const email = trimmed.toLowerCase() === 'admin' ? adminEmail : trimmed;
    if (!isLoginCaptchaProofValid(proof)) return Promise.resolve({ status: 'error', message: authMessage('captcha_required') });
    return authenticate(connection => connection.auth.signInWithPassword({ email, password }));
  },
  register: async (email, password, name, hospital, phone, hospitalCode) => {
    const address = email.trim();
    const displayName = name.trim();
    const hospitalName = hospital.trim();
    const code = hospitalCode.trim();
    if (![address, password, displayName, hospitalName, phone.trim(), code].every(Boolean)) {
      return { status: 'error', message: 'Lengkapi semua kolom pendaftaran.' };
    }
    if (address.toLowerCase() === adminEmail) {
      return { status: 'error', message: 'Gunakan alamat email pengguna.' };
    }
    if (!/^[^\s@]+@[^\s@]+$/.test(address)) {
      return { status: 'error', message: 'Masukkan alamat email yang valid.' };
    }
    if (displayName.length > 120 || hospitalName.length > 120) {
      return { status: 'error', message: 'Nama lengkap dan nama rumah sakit masing-masing maksimal 120 karakter.' };
    }
    if (!meetsRegistrationPasswordRules(password)) {
      return { status: 'error', message: registrationPasswordHelp };
    }
    const phoneNumber = phone.trim().replace(/[\s()-]/g, '');
    if (!/^\+?[0-9]{8,15}$/.test(phoneNumber)) {
      return { status: 'error', message: 'Masukkan nomor HP yang valid, misalnya 081234567890.' };
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$/.test(code)) {
      return { status: 'error', message: 'Masukkan kode RS yang valid, misalnya 3372165.' };
    }
    return authenticate(connection => connection.auth.signUp({
      email: address, password,
      options: { data: {
        display_name: displayName,
        hospital_name: hospitalName,
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

/** Check the server lease without opening/reclaiming a session. */
export function verifyActiveSession():Promise<boolean>{
  const connection=client;
  if(!connection||!useAuthStore.getState().isAuthenticated)return Promise.resolve(false);
  if(verification?.connection===connection)return verification.promise;
  const promise=(async()=>{
    try{
      const {data,error}=await connection.rpc('unitcost_session_is_active').abortSignal(AbortSignal.timeout(10000));
      if(client!==connection)return false;
      if(error)throw error;
      if(data!==true){endRemoteSession('Sesi berakhir karena akun masuk di perangkat lain atau akses akun sudah tidak aktif.');return false;}
      verifiedAt=Date.now();
      return true;
    }catch{
      if(client===connection&&Date.now()-verifiedAt>=45000)endRemoteSession('Sesi tidak dapat diverifikasi. Periksa koneksi lalu masuk kembali.');
      return false;
    }
  })();
  verification={connection,promise};
  void promise.finally(()=>{if(verification?.promise===promise)verification=undefined;});
  return promise;
}

export async function listManagedAccounts(): Promise<ManagedAccount[]> {
  if(!await verifyActiveSession())throw new Error('Sesi perangkat tidak aktif. Silakan masuk kembali.');
  const { data, error } = await getClient().rpc('unitcost_list_users');
  if (error || !Array.isArray(data)) throw new Error('Daftar akun tidak dapat dimuat. Pastikan akses admin masih aktif.');
  return data;
}

export async function saveHospitalClass(hospitalClass: HospitalClass) {
  if (!isHospitalClass(hospitalClass)) throw new Error('Pilih kelas RS A, B, C, atau D.');
  if (!useAuthStore.getState().isAuthenticated || !client) throw new Error('Silakan masuk kembali untuk menyimpan profil.');
  if(!await verifyActiveSession())throw new Error('Sesi perangkat tidak aktif. Silakan masuk kembali.');
  const connection = client;
  const { data, error } = await connection.auth.updateUser({ data: { hospital_class: hospitalClass } });
  if (connection !== client || !useAuthStore.getState().user) throw new Error('Sesi sudah berakhir. Silakan masuk kembali.');
  if (error || data.user?.user_metadata?.hospital_class !== hospitalClass) {
    throw new Error('Kelas RS belum tersimpan. Coba lagi.');
  }
  useAuthStore.setState(state => ({ user: state.user && { ...state.user, hospitalClass } }));
}

export async function updateManagedAccount(account: ManagedAccount, action: 'approve' | 'extend') {
  if(!await verifyActiveSession())throw new Error('Sesi perangkat tidak aktif. Silakan masuk kembali.');
  const { error } = await getClient().rpc('unitcost_update_user', {
    target_id: account.user_id,
    action,
    expected_expiry: account.expires_at,
  });
  if (error) throw new Error('Perubahan gagal. Muat ulang daftar akun lalu coba lagi.');
}

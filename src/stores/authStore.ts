// ============================================================
// STORE: authStore.ts
// Simple auth store (no backend - env-based credentials)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  user: { username: string; namaRS: string } | null;
  error: string;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

// Credentials from environment variables (set in Vercel dashboard)
// Default fallback for local dev
const VALID_USERS = [
  {
    username: import.meta.env.VITE_USER1 || 'admin',
    password: import.meta.env.VITE_PASS1 || 'unitcost2026',
    namaRS: import.meta.env.VITE_RS_NAME || 'RSUD Demo',
  },
  {
    username: import.meta.env.VITE_USER2 || '',
    password: import.meta.env.VITE_PASS2 || '',
    namaRS: import.meta.env.VITE_RS_NAME2 || '',
  },
].filter(u => u.username);

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      error: '',

      login: (username, password) => {
        const found = VALID_USERS.find(
          u => u.username === username && u.password === password
        );
        if (found) {
          set({
            isAuthenticated: true,
            user: { username: found.username, namaRS: found.namaRS },
            error: '',
          });
          return true;
        } else {
          set({ error: 'Username atau password salah', isAuthenticated: false });
          return false;
        }
      },

      logout: () => {
        set({ isAuthenticated: false, user: null, error: '' });
      },
    }),
    {
      name: 'unitcost-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);

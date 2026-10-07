// ============================================================
// STORE: uiPrefsStore.ts
// Preferensi tampilan: Mode Pemula (bantuan & penjelasan tampil)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiPrefsState {
  beginnerMode: boolean;
  setBeginnerMode: (value: boolean) => void;
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      beginnerMode: true,
      setBeginnerMode: (beginnerMode) => set({ beginnerMode }),
    }),
    { name: 'unitcost-ui-prefs' }
  )
);

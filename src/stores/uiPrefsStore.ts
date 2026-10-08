import {sessionMemoryStorage} from '../lib/sessionMemory';
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
    { storage:sessionMemoryStorage,
      name: 'unitcost-ui-prefs' }
  )
);

import { create } from 'zustand';

/** Tracks live/offline status + last successful update for the UI badge. */
interface SyncState {
  online: boolean;
  lastUpdated: number | null;
  setOnline: (v: boolean) => void;
  setLastUpdated: (ts: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  online: true,
  lastUpdated: null,
  setOnline: (online) => set({ online }),
  setLastUpdated: (lastUpdated) => set({ lastUpdated }),
}));

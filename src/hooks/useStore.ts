import { create } from 'zustand';

interface AppState {
  user: any | null;
  setUser: (user: any) => void;
  receipts: any[];
  setReceipts: (receipts: any[]) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  receipts: [],
  setReceipts: (receipts) => set({ receipts }),
}));

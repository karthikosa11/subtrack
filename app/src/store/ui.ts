import { create } from 'zustand';

type UIState = {
  /** The swipe row currently showing its action, so opening one closes the others. */
  openRowId: string | null;
  setOpenRow: (id: string | null) => void;
  /** The last money-saved value the user actually saw, so the counter ticks up from it. */
  lastSeenSaved: number | null;
  setLastSeenSaved: (value: number) => void;
};

export const useUI = create<UIState>((set) => ({
  openRowId: null,
  setOpenRow: (openRowId) => set({ openRowId }),
  lastSeenSaved: null,
  setLastSeenSaved: (lastSeenSaved) => set({ lastSeenSaved }),
}));

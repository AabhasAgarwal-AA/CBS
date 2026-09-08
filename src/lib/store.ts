"use client";

import { create } from "zustand";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  branch?: string | null;
};

type AppState = {
  user: SessionUser | null;
  loadingUser: boolean;
  setUser: (u: SessionUser | null) => void;
  setLoadingUser: (b: boolean) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<AppState>((set) => ({
  user: null,
  loadingUser: true,
  setUser: (u) => set({ user: u, loadingUser: false }),
  setLoadingUser: (b) => set({ loadingUser: b }),
  refreshUser: async () => {
    set({ loadingUser: true });
    try {
      const r = await fetch("/api/auth/me");
      const j = await r.json();
      set({ user: j.user ?? null, loadingUser: false });
    } catch {
      set({ user: null, loadingUser: false });
    }
  },
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    set({ user: null });
  },
}));

export type NavKey =
  | "dashboard"
  | "customers"
  | "accounts"
  | "transactions"
  | "loans"
  | "cards"
  | "reports"
  | "audit"
  | "settings";

type NavState = {
  active: NavKey;
  setActive: (n: NavKey) => void;
};

export const useNav = create<NavState>((set) => ({
  active: "dashboard",
  setActive: (n) => set({ active: n }),
}));

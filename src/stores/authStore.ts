import { create } from "zustand";
import { persist } from "zustand/middleware";

export type StaffRole = "admin" | "mecanico";

export type StaffUser = {
  username: string;
  name: string;
  role: StaffRole;
};

const demoUsers: Record<string, StaffUser & { password: string }> = {
  admin: { username: "admin", password: "123", name: "Administrador", role: "admin" },
  mecanico: { username: "mecanico", password: "123", name: "Mecanico", role: "mecanico" },
};

type AuthStore = {
  user: StaffUser | null;
  login: (username: string, password: string) => { ok: true } | { ok: false; message: string };
  logout: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      login: (username, password) => {
        const key = username.trim().toLowerCase();
        const match = demoUsers[key];
        if (!match || match.password !== password) {
          return { ok: false, message: "Usuario o contraseña incorrectos." };
        }

        const { password: _password, ...user } = match;
        set({ user });
        return { ok: true };
      },
      logout: () => set({ user: null }),
    }),
    { name: "motoflow-staff-auth" },
  ),
);

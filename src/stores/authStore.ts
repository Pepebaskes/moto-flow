import { create } from "zustand";
import { persist } from "zustand/middleware";
import { hasSupabaseCredentials, supabase } from "@/lib/supabase";

export type StaffRole = "admin" | "mecanico";

export type StaffUser = {
  username: string;
  name: string;
  role: StaffRole;
};

const demoUsers: Record<string, StaffUser & { password: string }> = {
  admin: { username: "admin", password: "123", name: "Administrador", role: "admin" },
  mecanico: { username: "mecanico", password: "123", name: "Mecanico", role: "mecanico" },
  "3411674336": { username: "3411674336", password: "contraseña123", name: "Rogelio Villa", role: "mecanico" },
};

type LoginResult = { ok: true } | { ok: false; message: string };

type AuthStore = {
  user: StaffUser | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
};

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return `+${digits}`;
  return value.trim();
}

function localLogin(username: string, password: string, set: (state: { user: StaffUser | null }) => void): LoginResult {
  const key = username.trim().toLowerCase();
  const match = demoUsers[key];
  if (!match || match.password !== password) {
    return { ok: false, message: "Usuario o contraseña incorrectos." };
  }

  const { password: _password, ...user } = match;
  set({ user });
  return { ok: true };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      login: async (username, password) => {
        if (!hasSupabaseCredentials || !supabase) {
          return localLogin(username, password, set);
        }

        const identifier = username.trim();
        const isEmail = identifier.includes("@");
        const { data, error } = await supabase.auth.signInWithPassword(
          isEmail ? { email: identifier, password } : { phone: normalizePhone(identifier), password },
        );

        if (error || !data.user) {
          const fallback = localLogin(username, password, set);
          if (fallback.ok) return fallback;
          return { ok: false, message: "Usuario o contraseña incorrectos." };
        }

        const { data: perfil } = await supabase
          .from("perfiles")
          .select("nombre, rol")
          .eq("user_id", data.user.id)
          .maybeSingle();

        set({
          user: {
            username: identifier,
            name: perfil?.nombre ?? data.user.user_metadata?.name ?? identifier,
            role: perfil?.rol === "admin" ? "admin" : "mecanico",
          },
        });
        return { ok: true };
      },
      logout: () => {
        void supabase?.auth.signOut();
        set({ user: null });
      },
    }),
    { name: "motoflow-staff-auth" },
  ),
);

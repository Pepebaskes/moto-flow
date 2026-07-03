import { create } from "zustand";
import { persist } from "zustand/middleware";
import { allowLocalMode, hasSupabaseCredentials, supabase } from "@/lib/supabase";

export type StaffRole = "admin" | "mecanico" | "chalan";

export type StaffUser = {
  username: string;
  name: string;
  role: StaffRole;
};

const demoUsers: Record<string, StaffUser & { passwords: string[] }> = {
  "3411674336": { username: "3411674336", passwords: ["contrase\u00f1a123", "contrasena123"], name: "Rogelio Villa", role: "mecanico" },
  chalan: { username: "chalan", passwords: ["chalan123"], name: "Chalan de taller", role: "chalan" },
  pepebaskes: { username: "pepebaskes", passwords: ["Rafael388?"], name: "pepebaskes", role: "admin" },
  "rafaelvazquezsilva8@outlook.com": { username: "rafaelvazquezsilva8@outlook.com", passwords: ["Rafael388?"], name: "pepebaskes", role: "admin" },
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

function normalizeIdentifier(value: string) {
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === "pepebaskes") return "rafaelvazquezsilva8@outlook.com";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `${digits}@motoflow.local`;
  return trimmed;
}

function localLogin(username: string, password: string, set: (state: { user: StaffUser | null }) => void): LoginResult {
  const key = username.trim().toLowerCase();
  const match = demoUsers[key];
  if (!match || !match.passwords.includes(password)) {
    return { ok: false, message: "Usuario o contraseña incorrectos." };
  }

  const { passwords: _passwords, ...user } = match;
  set({ user });
  return { ok: true };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      login: async (username, password) => {
        if (!hasSupabaseCredentials || !supabase) {
          if (!allowLocalMode) {
            return {
              ok: false,
              message: "Supabase no esta configurado en esta instalacion. Revisa las variables de entorno y vuelve a desplegar.",
            };
          }
          return localLogin(username, password, set);
        }

        const identifier = normalizeIdentifier(username);
        const isEmail = identifier.includes("@");
        const credentials = isEmail ? { email: identifier, password } : { phone: normalizePhone(identifier), password };
        const { data, error } = await supabase.auth.signInWithPassword(credentials);

        if (error || !data.user) {
          return { ok: false, message: "No se pudo iniciar sesion en Supabase. Revisa usuario, contraseña y que el usuario exista en Auth." };
        }

        const { data: perfil } = await supabase
          .from("perfiles")
          .select("nombre, rol")
          .eq("user_id", data.user.id)
          .maybeSingle();

        const rol = perfil?.rol === "admin" || perfil?.rol === "mecanico" || perfil?.rol === "chalan" ? perfil.rol : "chalan";

        set({
          user: {
            username: identifier,
            name: perfil?.nombre ?? data.user.user_metadata?.name ?? identifier,
            role: rol,
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

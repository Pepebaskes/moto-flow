import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://lkzasfbwybwxmswibudj.supabase.co";
const fallbackSupabaseAnonKey = "sb_publishable_em7xb7_L3xyQkOE_l_c08A_4BRa9YE8";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || fallbackSupabaseUrl;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || fallbackSupabaseAnonKey;

export const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseAnonKey);
export const allowLocalMode = import.meta.env.VITE_ENABLE_LOCAL_MODE === "true";

export const supabase = hasSupabaseCredentials
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export const storageBucket = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string | undefined) ?? "evidencias";

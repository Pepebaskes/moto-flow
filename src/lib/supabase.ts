import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseCredentials
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export const storageBucket = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string | undefined) ?? "evidencias";

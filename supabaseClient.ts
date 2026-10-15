import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Đọc cấu hình an toàn trong cả browser (Vite) và server (Node/Next.js).
// Không truy cập process trực tiếp trong browser vì Vite không luôn polyfill global này.
const runtimeEnv = typeof process !== 'undefined' ? process.env : {};
const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || runtimeEnv.NEXT_PUBLIC_SUPABASE_URL || '';
const envAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || runtimeEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(envUrl && envAnonKey && !envUrl.includes('placeholder'));

export const supabase: SupabaseClient = createClient(
  envUrl || 'https://placeholder-translation-app.supabase.co',
  envAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

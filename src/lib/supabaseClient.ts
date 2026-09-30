import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Đọc cấu hình từ biến môi trường Vite hoặc Next.js
const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const envAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

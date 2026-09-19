import { createClient } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_vip: boolean;
  created_at: string;
}

export type CareerCategory = 'general' | 'it' | 'business' | 'hospitality';

export interface Question {
  id: number;
  vi: string;
  hints: string;
  answers: string[];
  created_date?: string;
  category?: CareerCategory;
}


export interface StudyLog {
  id: number;
  user_id: string;
  question_id: number;
  completed_at: string;
}

export interface AppSettings {
  appName: string;
  appSubtitle: string;
  appIcon: string;
  appIconType: 'lucide' | 'emoji';
}


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Supabase Client tiêu chuẩn dùng cho Client Component / Browser (tuân thủ RLS)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// Supabase Admin Client dùng riêng trên Server (API Route, Cron job với Service Role Key)
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseServiceRoleKey || supabaseAnonKey || 'placeholder-service-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

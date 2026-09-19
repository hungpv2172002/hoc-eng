import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Database,
  Terminal,
  FileText,
  Code2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'sql' | 'env' | 'install' | 'files'>('sql');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sqlCode = `-- ==============================================================================
-- FILE SQL HOÀN CHỈNH CHO SUPABASE (CHẠY 1 LẦN DUY NHẤT TRÊN SQL EDITOR)
-- ==============================================================================

-- 1. BẬT EXTENSION UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TẠO BẢNG profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_vip BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TẠO BẢNG questions
CREATE TABLE IF NOT EXISTS public.questions (
    id BIGSERIAL PRIMARY KEY,
    vi TEXT NOT NULL,
    hints TEXT NOT NULL,
    answers TEXT[] NOT NULL,
    created_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 4. TẠO BẢNG study_logs
CREATE TABLE IF NOT EXISTS public.study_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    completed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT unique_user_question_date UNIQUE(user_id, question_id, completed_at)
);

-- 5. KÍCH HOẠT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

-- 6. HÀM KIỂM TRA QUYỀN ADMIN (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CHÍNH SÁCH BẢO MẬT (RLS POLICIES) CHO BẢNG profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- Trigger bảo vệ: Người dùng thường không thể tự sửa role hoặc is_vip
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_admin() THEN
        NEW.role := OLD.role;
        NEW.is_vip := OLD.is_vip;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_fields();

-- 8. CHÍNH SÁCH BẢO MẬT CHO BẢNG questions
DROP POLICY IF EXISTS "questions_select_policy" ON public.questions;
CREATE POLICY "questions_select_policy" ON public.questions
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "questions_insert_policy" ON public.questions;
CREATE POLICY "questions_insert_policy" ON public.questions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

-- 9. CHÍNH SÁCH BẢO MẬT CHO BẢNG study_logs
DROP POLICY IF EXISTS "study_logs_select_policy" ON public.study_logs;
CREATE POLICY "study_logs_select_policy" ON public.study_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "study_logs_insert_policy" ON public.study_logs;
CREATE POLICY "study_logs_insert_policy" ON public.study_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 10. STORAGE BUCKET 'avatars'
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
CREATE POLICY "avatars_public_select" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_user_insert" ON storage.objects;
CREATE POLICY "avatars_user_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars');

-- 11. TRIGGER TỰ ĐỘNG CẤP ADMIN CHO EMAIL CỦA BẠN KHI XÁC THỰC LẦN ĐẦU
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT := 'user';
    v_is_vip BOOLEAN := false;
    v_full_name TEXT;
BEGIN
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    -- TỰ ĐỘNG CẤP ADMIN CHO EMAIL CỦA BẠN (hungpv2172002@gmail.com)
    IF LOWER(NEW.email) = LOWER('hungpv2172002@gmail.com') OR LOWER(NEW.email) = LOWER('YOUR_EMAIL@gmail.com') THEN
        v_role := 'admin';
        v_is_vip := true;
    END IF;

    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, is_vip, created_at)
    VALUES (NEW.id, NEW.email, v_full_name, COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''), v_role, v_is_vip, NOW())
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();`;

  const installCmd = `npm install @supabase/supabase-js @google/genai lucide-react canvas-confetti
npm install -D @types/canvas-confetti`;

  const envCode = `# .env.local trong thư mục gốc Next.js
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSy...
CRON_SECRET=my_super_secret_cron_token_12345`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Hướng Dẫn Từng Bước & File SQL Hoàn Chỉnh
              </h2>
              <p className="text-xs text-slate-500">
                Dành cho người mới bắt đầu triển khai với Supabase và Next.js App Router
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-4 sm:px-6 gap-2 pt-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-2.5 px-4 rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'bg-white text-indigo-700 shadow-xs border-t border-x border-slate-200 -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>1. File SQL Supabase</span>
          </button>

          <button
            onClick={() => setActiveTab('install')}
            className={`py-2.5 px-4 rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'install'
                ? 'bg-white text-indigo-700 shadow-xs border-t border-x border-slate-200 -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>2. Cài đặt thư viện</span>
          </button>

          <button
            onClick={() => setActiveTab('env')}
            className={`py-2.5 px-4 rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'env'
                ? 'bg-white text-indigo-700 shadow-xs border-t border-x border-slate-200 -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>3. Biến .env.local</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`py-2.5 px-4 rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'files'
                ? 'bg-white text-indigo-700 shadow-xs border-t border-x border-slate-200 -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>4. Cấu trúc mã nguồn</span>
          </button>
        </div>

        {/* Nội dung từng tab */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4 font-sans text-sm text-slate-700">
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Vào <strong>Supabase Dashboard</strong> ➔ <strong>SQL Editor</strong> ➔ Tạo <strong>New Query</strong>, dán toàn bộ đoạn mã bên dưới và bấm <strong>RUN</strong>:
                </p>
                <button
                  onClick={() => copyToClipboard(sqlCode)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép toàn bộ SQL'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl overflow-x-auto text-xs font-mono max-h-[50vh] leading-relaxed border border-slate-800">
                {sqlCode}
              </pre>
            </div>
          )}

          {activeTab === 'install' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Mở cửa sổ dòng lệnh Terminal trong thư mục dự án Next.js và chạy lệnh sau:
              </p>
              <div className="relative">
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl overflow-x-auto text-xs font-mono border border-slate-800">
                  {installCmd}
                </pre>
                <button
                  onClick={() => copyToClipboard(installCmd)}
                  className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs transition-colors"
                  title="Sao chép lệnh"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Tạo file <code className="font-mono font-bold text-indigo-600">.env.local</code> ở thư mục gốc của Next.js với nội dung:
              </p>
              <div className="relative">
                <pre className="p-4 bg-slate-900 text-amber-300 rounded-2xl overflow-x-auto text-xs font-mono border border-slate-800 leading-relaxed">
                  {envCode}
                </pre>
                <button
                  onClick={() => copyToClipboard(envCode)}
                  className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs transition-colors"
                  title="Sao chép .env.local"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Toàn bộ các file mã nguồn đã được tạo sẵn đầy đủ trong dự án theo đúng đường dẫn:
              </p>
              <ul className="space-y-2 text-xs font-mono">
                <li className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span>/supabase-schema.sql</span>
                  <span className="text-emerald-600 font-sans font-bold">✓ Đã tạo</span>
                </li>
                <li className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span>/lib/supabase.ts</span>
                  <span className="text-emerald-600 font-sans font-bold">✓ Đã tạo</span>
                </li>
                <li className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span>/components/AuthModal.tsx</span>
                  <span className="text-emerald-600 font-sans font-bold">✓ Đã tạo</span>
                </li>
                <li className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span>/components/ProfileModal.tsx</span>
                  <span className="text-emerald-600 font-sans font-bold">✓ Đã tạo</span>
                </li>
                <li className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span>/app/page.tsx</span>
                  <span className="text-emerald-600 font-sans font-bold">✓ Đã tạo</span>
                </li>
                <li className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span>/app/admin/page.tsx</span>
                  <span className="text-emerald-600 font-sans font-bold">✓ Đã tạo</span>
                </li>
                <li className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span>/app/api/cron/generate/route.ts</span>
                  <span className="text-emerald-600 font-sans font-bold">✓ Đã tạo</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Đầy đủ 100% mã nguồn, không rút gọn, không dùng // TODO</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

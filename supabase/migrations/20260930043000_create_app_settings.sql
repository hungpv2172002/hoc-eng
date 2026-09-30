-- Run once in the existing Supabase project's SQL Editor, as postgres.
-- Safe to run again. Does not change accounts or overwrite saved settings.
BEGIN;

CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Replace the legacy policy that allowed anonymous writes.
DROP POLICY IF EXISTS "app_settings_all_policy" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select_policy" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_admin_insert" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_admin_update" ON public.app_settings;

CREATE POLICY "app_settings_select_policy" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "app_settings_admin_insert" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ));

CREATE POLICY "app_settings_admin_update" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ));

GRANT USAGE ON SCHEMA public TO anon, authenticated;
REVOKE ALL ON TABLE public.app_settings FROM anon, authenticated;
GRANT SELECT ON TABLE public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

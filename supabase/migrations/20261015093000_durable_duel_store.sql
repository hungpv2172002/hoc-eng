BEGIN;

CREATE TABLE IF NOT EXISTS public.duel_state_store (
  id smallint PRIMARY KEY CHECK (id = 1),
  version bigint NOT NULL DEFAULT 0,
  state jsonb NOT NULL DEFAULT '{"sessions":{},"rooms":{},"invites":{}}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.duel_state_store ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.duel_state_store FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.duel_state_store TO service_role;

INSERT INTO public.duel_state_store (id, version, state)
VALUES (1, 0, '{"sessions":{},"rooms":{},"invites":{}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.duel_compare_and_swap(expected_version bigint, next_state jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF jsonb_typeof(next_state) <> 'object'
    OR jsonb_typeof(next_state->'sessions') <> 'object'
    OR jsonb_typeof(next_state->'rooms') <> 'object'
    OR jsonb_typeof(next_state->'invites') <> 'object' THEN
    RAISE EXCEPTION 'Trạng thái đấu không hợp lệ.';
  END IF;

  UPDATE public.duel_state_store
  SET state = next_state, version = version + 1, updated_at = now()
  WHERE id = 1 AND version = expected_version;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.duel_compare_and_swap(bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.duel_compare_and_swap(bigint, jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

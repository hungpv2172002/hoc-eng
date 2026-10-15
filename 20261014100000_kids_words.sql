BEGIN;

CREATE TABLE IF NOT EXISTS public.kids_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  word_key text NOT NULL UNIQUE,
  meaning text NOT NULL,
  picture text NOT NULL,
  grades integer[] NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kids_words_word_key_normalized CHECK (word_key = lower(btrim(word_key)) AND word_key <> ''),
  CONSTRAINT kids_words_valid_grades CHECK (
    cardinality(grades) > 0 AND grades <@ ARRAY[1, 2, 3, 4, 5, 6]::integer[]
  ),
  CONSTRAINT kids_words_text_lengths CHECK (
    length(word) BETWEEN 1 AND 48 AND length(meaning) BETWEEN 1 AND 120 AND length(picture) BETWEEN 1 AND 48
  )
);

CREATE INDEX IF NOT EXISTS kids_words_active_grades_idx
  ON public.kids_words USING gin (grades) WHERE is_active = true;

ALTER TABLE public.kids_words ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.kids_words FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.kids_words TO anon, authenticated;
GRANT ALL ON TABLE public.kids_words TO service_role;

DROP POLICY IF EXISTS kids_words_public_read ON public.kids_words;
CREATE POLICY kids_words_public_read ON public.kids_words
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

COMMIT;

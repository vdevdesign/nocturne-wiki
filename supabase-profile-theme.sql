-- Store each player's preferred Nocturne site theme on their profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'nocturne';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_theme_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_theme_check
  CHECK (theme IN ('nocturne', 'dracula', 'alucard', 'sylvan', 'steampunk', 'frost', 'starlight', 'lush', 'mystic', 'potion', 'underdark'));

-- Store each player's editable custom CSS theme overrides (Theme Studio).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_css text NOT NULL DEFAULT '';

-- Shared custom themes: any player can submit a named theme snapshot
-- (colors, pattern geometry, custom CSS). Submissions start UNAPPROVED and
-- only become visible/usable by everyone after the DM approves them.
CREATE TABLE IF NOT EXISTS public.custom_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_name text NOT NULL DEFAULT 'Player',
  snapshot jsonb NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_themes_created_at_idx
  ON public.custom_themes (created_at DESC);

-- Anyone signed in can read approved themes; creators also see their own
-- pending submissions (handled in the app query). Only the creator can
-- delete their own; approval is a DM-only update.
ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_themes_read" ON public.custom_themes;
CREATE POLICY "custom_themes_read" ON public.custom_themes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "custom_themes_insert" ON public.custom_themes;
CREATE POLICY "custom_themes_insert" ON public.custom_themes
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "custom_themes_delete_own" ON public.custom_themes;
CREATE POLICY "custom_themes_delete_own" ON public.custom_themes
  FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Approval updates: DM only (is_dm is checked app-side too; this is defense
-- in depth for anyone with direct table access).
DROP POLICY IF EXISTS "custom_themes_review" ON public.custom_themes;
CREATE POLICY "custom_themes_review" ON public.custom_themes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND lower(p.role) = 'dm'
    )
  );

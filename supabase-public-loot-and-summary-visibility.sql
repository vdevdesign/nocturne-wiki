-- Allow every authenticated player to read public campaign loot and session
-- summaries while keeping private records and all writes DM-only.
-- Run once in the Supabase SQL editor.

ALTER TABLE public.loot
  ADD COLUMN IF NOT EXISTS visible_to_players boolean NOT NULL DEFAULT true;

ALTER TABLE public.session_summaries
  ADD COLUMN IF NOT EXISTS visible_to_players boolean NOT NULL DEFAULT true;

ALTER TABLE public.loot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.loot TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.session_summaries TO authenticated;

DROP POLICY IF EXISTS loot_public_or_dm_read ON public.loot;
CREATE POLICY loot_public_or_dm_read
  ON public.loot
  FOR SELECT TO authenticated
  USING (
    COALESCE(visible_to_players, true)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'dm'
    )
  );

DROP POLICY IF EXISTS loot_dm_manage ON public.loot;
CREATE POLICY loot_dm_manage
  ON public.loot
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'dm'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'dm'
    )
  );

DROP POLICY IF EXISTS session_summaries_public_or_dm_read ON public.session_summaries;
CREATE POLICY session_summaries_public_or_dm_read
  ON public.session_summaries
  FOR SELECT TO authenticated
  USING (
    COALESCE(visible_to_players, true)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'dm'
    )
  );

DROP POLICY IF EXISTS session_summaries_dm_manage ON public.session_summaries;
CREATE POLICY session_summaries_dm_manage
  ON public.session_summaries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'dm'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'dm'
    )
  );

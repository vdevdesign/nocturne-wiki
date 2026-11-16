-- Places of the Realm: photo cards shown as a carousel under the world map.
-- Run this once in the Supabase SQL editor.
CREATE TABLE IF NOT EXISTS public.worldbook_places (
  id text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  visible_to_players boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.worldbook_places ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.worldbook_places TO authenticated;
DROP POLICY IF EXISTS places_public_or_dm_read ON public.worldbook_places;
CREATE POLICY places_public_or_dm_read
  ON public.worldbook_places
  FOR SELECT TO authenticated
  USING (
    COALESCE(visible_to_players, true)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'dm'
    )
  );
-- Writes stay DM-only, matching every other worldbook content table.
DROP POLICY IF EXISTS places_dm_write ON public.worldbook_places;
CREATE POLICY places_dm_write
  ON public.worldbook_places
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

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

-- Keep the carousel query (sort_order + created_at ordering) fast even when
-- photos make the rows large; the index lets Postgres order without scanning.
CREATE INDEX IF NOT EXISTS worldbook_places_sort_idx
  ON public.worldbook_places (sort_order, created_at);

-- Session chats: the chat list derives the session list from session_messages
-- ordered by created_at. Without an index that scan is slow, and with the
-- statement timeout hit it surfaces as "past session chats disappeared".
CREATE INDEX IF NOT EXISTS session_messages_created_at_idx
  ON public.session_messages (created_at);
CREATE INDEX IF NOT EXISTS session_messages_session_id_idx
  ON public.session_messages (session_id);
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

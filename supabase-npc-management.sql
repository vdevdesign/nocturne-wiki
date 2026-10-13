-- NPC visibility, merged DM secrets, and player-specific friendship points.
-- Run once in the Supabase SQL editor.

ALTER TABLE public.npcs
  ADD COLUMN IF NOT EXISTS visible_to_players boolean NOT NULL DEFAULT true;

ALTER TABLE public.session_summaries
  ADD COLUMN IF NOT EXISTS secret text NOT NULL DEFAULT '';

ALTER TABLE public.session_summaries
  ADD COLUMN IF NOT EXISTS visible_to_players boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.npc_friendship_points (
  npc_id text NOT NULL REFERENCES public.npcs(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (npc_id, player_id),
  CONSTRAINT npc_friendship_points_nonnegative CHECK (points >= 0)
);

ALTER TABLE public.npc_friendship_points ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.npc_friendship_points TO authenticated;

DROP POLICY IF EXISTS npc_friendship_points_read ON public.npc_friendship_points;
CREATE POLICY npc_friendship_points_read ON public.npc_friendship_points
  FOR SELECT TO authenticated
  USING (player_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dm'
  ));

DROP POLICY IF EXISTS npc_friendship_points_dm_write ON public.npc_friendship_points;
CREATE POLICY npc_friendship_points_dm_write ON public.npc_friendship_points
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dm'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dm'));

CREATE INDEX IF NOT EXISTS npc_friendship_points_npc_idx
  ON public.npc_friendship_points (npc_id);

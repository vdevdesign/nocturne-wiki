-- Run once in the Supabase SQL editor to add house multiplayer games.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS house text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_house_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_house_check
      CHECK (house IS NULL OR house IN ('phoenix', 'fox', 'selkie'));
  END IF;
END
$$;

-- Existing character IDs are the account usernames in this app.
UPDATE public.profiles AS p
SET house = lower(c.house)
FROM public.characters AS c
WHERE lower(c.id::text) = lower(split_part(p.email, '@', 1))
  AND lower(c.house) IN ('phoenix', 'fox', 'selkie')
  AND p.house IS NULL;

CREATE OR REPLACE FUNCTION public.sync_profile_house_from_character()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_house text;
  v_profile_house text;
BEGIN
  v_house := lower(NULLIF(btrim(NEW.house), ''));
  IF v_house NOT IN ('phoenix', 'fox', 'selkie') THEN
    v_house := NULL;
  END IF;

  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() AND p.role = 'dm'
  ) THEN
    SELECT p.house INTO v_profile_house
    FROM public.profiles AS p
    WHERE p.id = auth.uid();

    IF v_profile_house IS NOT NULL AND v_profile_house IS DISTINCT FROM v_house THEN
      RAISE EXCEPTION 'Only a DM can change an assigned house.';
    END IF;
    IF TG_OP = 'UPDATE'
      AND NULLIF(btrim(OLD.house), '') IS NOT NULL
      AND lower(OLD.house) IS DISTINCT FROM v_house THEN
      RAISE EXCEPTION 'Only a DM can change an assigned house.';
    END IF;
  END IF;

  UPDATE public.profiles AS p
  SET house = v_house
  WHERE lower(split_part(p.email, '@', 1)) = lower(NEW.id::text);

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.sync_profile_house_from_character() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_profile_house_from_character() TO authenticated;
DROP TRIGGER IF EXISTS sync_profile_house_from_character ON public.characters;
CREATE TRIGGER sync_profile_house_from_character
  AFTER INSERT OR UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_house_from_character();

CREATE OR REPLACE FUNCTION public.sync_character_house_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_house text;
BEGIN
  SELECT lower(c.house) INTO v_house
  FROM public.characters AS c
  WHERE lower(c.id::text) = lower(split_part(NEW.email, '@', 1))
    AND lower(c.house) IN ('phoenix', 'fox', 'selkie')
  LIMIT 1;

  IF v_house IS NOT NULL AND NEW.house IS DISTINCT FROM v_house THEN
    UPDATE public.profiles
    SET house = v_house
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.sync_character_house_from_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_character_house_from_profile() TO authenticated;
DROP TRIGGER IF EXISTS sync_character_house_from_profile ON public.profiles;
CREATE TRIGGER sync_character_house_from_profile
  AFTER INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_character_house_from_profile();

CREATE TABLE IF NOT EXISTS public.house_points (
  house text PRIMARY KEY CHECK (house IN ('phoenix', 'fox', 'selkie')),
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0)
);

INSERT INTO public.house_points (house, points)
VALUES ('phoenix', 0), ('fox', 0), ('selkie', 0)
ON CONFLICT (house) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('tournament', 'common_room')),
  house_a text NOT NULL CHECK (house_a IN ('phoenix', 'fox', 'selkie')),
  house_b text CHECK (house_b IS NULL OR house_b IN ('phoenix', 'fox', 'selkie')),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  winner_house text CHECK (winner_house IS NULL OR winner_house IN ('phoenix', 'fox', 'selkie')),
  points_awarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matches_house_pair_check CHECK (
    (mode = 'tournament' AND (house_b IS NULL OR house_b <> house_a))
    OR (mode = 'common_room' AND house_b IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.match_players (
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  house text NOT NULL CHECK (house IN ('phoenix', 'fox', 'selkie')),
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.rune_duel_picks (
  match_id uuid NOT NULL,
  round integer NOT NULL CHECK (round > 0),
  user_id uuid NOT NULL,
  pick text NOT NULL CHECK (pick IN ('flame', 'gale', 'stone', 'shadow')),
  PRIMARY KEY (match_id, round, user_id),
  FOREIGN KEY (match_id, user_id)
    REFERENCES public.match_players(match_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.house_point_awards (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  house text NOT NULL CHECK (house IN ('phoenix', 'fox', 'selkie')),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Supabase manages realtime.messages and its RLS setting. Add policies only,
-- without altering the ownership-controlled Realtime table.

DROP POLICY IF EXISTS house_constellation_receive ON realtime.messages;
CREATE POLICY house_constellation_receive
  ON realtime.messages AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = (SELECT auth.uid())
        AND realtime.topic() = 'constellation-' || p.house
    )
  );

DROP POLICY IF EXISTS house_constellation_same_house_receive ON realtime.messages;
CREATE POLICY house_constellation_same_house_receive
  ON realtime.messages AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = (SELECT auth.uid())
        AND realtime.topic() = 'constellation-' || p.house
    )
    OR (
      realtime.topic() LIKE 'rune-duel-presence-%'
      AND EXISTS (
        SELECT 1 FROM public.match_players AS mp
        WHERE mp.user_id = (SELECT auth.uid())
          AND mp.match_id::text = right(realtime.topic(), 36)
      )
    )
  );

DROP POLICY IF EXISTS rune_duel_presence_receive ON realtime.messages;
CREATE POLICY rune_duel_presence_receive
  ON realtime.messages AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    realtime.topic() LIKE 'rune-duel-presence-%'
    AND EXISTS (
      SELECT 1 FROM public.match_players AS mp
      WHERE mp.user_id = (SELECT auth.uid())
        AND mp.match_id::text = right(realtime.topic(), 36)
    )
  );

DROP POLICY IF EXISTS house_constellation_send ON realtime.messages;
CREATE POLICY house_constellation_send
  ON realtime.messages AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = (SELECT auth.uid())
        AND realtime.topic() = 'constellation-' || p.house
    )
  );

DROP POLICY IF EXISTS house_constellation_same_house_send ON realtime.messages;
CREATE POLICY house_constellation_same_house_send
  ON realtime.messages AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = (SELECT auth.uid())
        AND realtime.topic() = 'constellation-' || p.house
    )
    OR (
      realtime.topic() LIKE 'rune-duel-presence-%'
      AND EXISTS (
        SELECT 1 FROM public.match_players AS mp
        WHERE mp.user_id = (SELECT auth.uid())
          AND mp.match_id::text = right(realtime.topic(), 36)
      )
    )
  );

DROP POLICY IF EXISTS rune_duel_presence_send ON realtime.messages;
CREATE POLICY rune_duel_presence_send
  ON realtime.messages AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    realtime.topic() LIKE 'rune-duel-presence-%'
    AND EXISTS (
      SELECT 1 FROM public.match_players AS mp
      WHERE mp.user_id = (SELECT auth.uid())
        AND mp.match_id::text = right(realtime.topic(), 36)
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS matches_one_active_common_room_per_house_game
  ON public.matches (game, house_a)
  WHERE mode = 'common_room' AND status = 'active';

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rune_duel_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_point_awards ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.matches, public.match_players, public.rune_duel_picks, public.house_points TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.matches, public.match_players, public.rune_duel_picks FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.house_points FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.house_point_awards FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.house_point_awards_id_seq FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS matches_read_access ON public.matches;
CREATE POLICY matches_read_access
  ON public.matches FOR SELECT TO authenticated
  USING (
    mode = 'tournament'
    OR (
      mode = 'common_room'
      AND house_a = (
        SELECT p.house FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS match_players_read_self ON public.match_players;
CREATE POLICY match_players_read_self
  ON public.match_players FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'dm'
    )
  );

CREATE OR REPLACE FUNCTION public.rune_duel_round_is_revealed(p_match_id uuid, p_round integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) = 2
    AND EXISTS (
      SELECT 1 FROM public.matches AS m
      WHERE m.id = p_match_id AND m.mode = 'tournament'
    )
  FROM public.rune_duel_picks
  WHERE match_id = p_match_id
    AND round = p_round
$$;

REVOKE ALL ON FUNCTION public.rune_duel_round_is_revealed(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rune_duel_round_is_revealed(uuid, integer) TO authenticated;

DROP POLICY IF EXISTS rune_duel_picks_read_after_reveal ON public.rune_duel_picks;
CREATE POLICY rune_duel_picks_read_after_reveal
  ON public.rune_duel_picks FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.rune_duel_round_is_revealed(match_id, round)
  );

CREATE OR REPLACE FUNCTION public.get_game_sessions()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sessions jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to browse tournament sessions.';
  END IF;

  SELECT COALESCE(jsonb_agg(session_row ORDER BY session_row ->> 'created_at' DESC), '[]'::jsonb)
  INTO v_sessions
  FROM (
    SELECT jsonb_build_object(
      'id', m.id,
      'game', m.game,
      'mode', m.mode,
      'house_a', m.house_a,
      'house_b', m.house_b,
      'status', m.status,
      'state', m.state,
      'winner_house', m.winner_house,
      'created_at', m.created_at,
      'players', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', mp.user_id,
          'house', mp.house,
          'name', COALESCE(NULLIF(split_part(p.email, '@', 1), ''), 'Player')
        ) ORDER BY mp.house)
        FROM public.match_players AS mp
        LEFT JOIN public.profiles AS p ON p.id = mp.user_id
        WHERE mp.match_id = m.id
      ), '[]'::jsonb)
    ) AS session_row
    FROM public.matches AS m
    WHERE m.mode = 'tournament'
    ORDER BY m.created_at DESC
    LIMIT 50
  ) AS sessions;

  RETURN v_sessions;
END
$$;

REVOKE ALL ON FUNCTION public.get_game_sessions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_game_sessions() TO authenticated;

DROP POLICY IF EXISTS house_points_read_access ON public.house_points;
CREATE POLICY house_points_read_access
  ON public.house_points FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.create_tournament_match(game text)
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_house text;
  v_match public.matches;
BEGIN
  SELECT p.house INTO v_house
  FROM public.profiles AS p
  WHERE p.id = auth.uid();

  IF auth.uid() IS NULL OR v_house IS NULL OR v_house NOT IN ('phoenix', 'fox', 'selkie') THEN
    RAISE EXCEPTION 'Assign a house before creating a tournament match.';
  END IF;
  IF game IS NULL OR length(btrim(game)) = 0 OR length(game) > 64 THEN
    RAISE EXCEPTION 'Provide a valid game name.';
  END IF;

  INSERT INTO public.matches (game, mode, house_a, status)
  VALUES (btrim(create_tournament_match.game), 'tournament', v_house, 'waiting')
  RETURNING * INTO v_match;

  INSERT INTO public.match_players (match_id, user_id, house)
  VALUES (v_match.id, auth.uid(), v_house);

  RETURN v_match;
END
$$;

CREATE OR REPLACE FUNCTION public.join_tournament_match(match_id uuid)
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_house text;
  v_match public.matches;
BEGIN
  SELECT p.house INTO v_house
  FROM public.profiles AS p
  WHERE p.id = auth.uid();
  IF auth.uid() IS NULL OR v_house IS NULL OR v_house NOT IN ('phoenix', 'fox', 'selkie') THEN
    RAISE EXCEPTION 'Assign a house before joining a tournament match.';
  END IF;

  SELECT * INTO v_match
  FROM public.matches AS m
  WHERE m.id = join_tournament_match.match_id
  FOR UPDATE;

  IF NOT FOUND OR v_match.mode <> 'tournament' OR v_match.status <> 'waiting' THEN
    RAISE EXCEPTION 'This tournament match is no longer open.';
  END IF;
  IF v_match.house_a = v_house THEN
    RAISE EXCEPTION 'Tournament matches require players from different houses.';
  END IF;

  UPDATE public.matches
  SET house_b = v_house, status = 'active'
  WHERE id = v_match.id
  RETURNING * INTO v_match;

  INSERT INTO public.match_players (match_id, user_id, house)
  VALUES (v_match.id, auth.uid(), v_house);

  RETURN v_match;
END
$$;

CREATE OR REPLACE FUNCTION public.join_common_room(game text)
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_house text;
  v_match public.matches;
BEGIN
  SELECT p.house INTO v_house
  FROM public.profiles AS p
  WHERE p.id = auth.uid();
  IF auth.uid() IS NULL OR v_house IS NULL OR v_house NOT IN ('phoenix', 'fox', 'selkie') THEN
    RAISE EXCEPTION 'Assign a house before entering its common room.';
  END IF;
  IF join_common_room.game IS NULL
    OR length(btrim(join_common_room.game)) = 0
    OR length(join_common_room.game) > 64 THEN
    RAISE EXCEPTION 'Provide a valid game name.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_house), hashtext(btrim(join_common_room.game)));

  SELECT * INTO v_match
  FROM public.matches AS m
  WHERE m.mode = 'common_room'
    AND m.house_a = v_house
    AND m.game = btrim(join_common_room.game)
    AND m.status = 'active'
  ORDER BY m.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.matches (game, mode, house_a, house_b, status)
    VALUES (btrim(join_common_room.game), 'common_room', v_house, NULL, 'active')
    RETURNING * INTO v_match;
  END IF;

  INSERT INTO public.match_players (match_id, user_id, house)
  VALUES (v_match.id, auth.uid(), v_house)
  ON CONFLICT (match_id, user_id) DO NOTHING;

  RETURN v_match;
END
$$;

CREATE OR REPLACE FUNCTION public.submit_rune_pick(match_id uuid, pick text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches;
  v_house text;
  v_pick_a text;
  v_pick_b text;
  v_winner text;
  v_result text;
  v_state jsonb;
  v_round integer;
  v_score_a integer;
  v_score_b integer;
BEGIN
  IF auth.uid() IS NULL OR pick IS NULL OR pick NOT IN ('flame', 'gale', 'stone', 'shadow') THEN
    RAISE EXCEPTION 'Choose a valid rune after signing in.';
  END IF;

  SELECT * INTO v_match
  FROM public.matches AS m
  WHERE m.id = submit_rune_pick.match_id
  FOR UPDATE;

  IF NOT FOUND OR v_match.mode <> 'tournament' OR v_match.game <> 'rune_duel' OR v_match.status <> 'active' THEN
    RAISE EXCEPTION 'This rune duel is not active.';
  END IF;

  SELECT mp.house INTO v_house
  FROM public.match_players AS mp
  WHERE mp.match_id = v_match.id AND mp.user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only match players may submit a rune.';
  END IF;

  v_state := v_match.state;
  v_round := COALESCE((v_state ->> 'round')::integer, 1);
  INSERT INTO public.rune_duel_picks (match_id, round, user_id, pick)
  VALUES (v_match.id, v_round, auth.uid(), submit_rune_pick.pick);

  IF (SELECT count(*) FROM public.rune_duel_picks AS rp
      WHERE rp.match_id = v_match.id AND rp.round = v_round) < 2 THEN
    RETURN jsonb_build_object('waiting_for_opponent', true, 'round', v_round);
  END IF;

  SELECT rp.pick INTO v_pick_a
  FROM public.rune_duel_picks AS rp
  JOIN public.match_players AS mp USING (match_id, user_id)
  WHERE rp.match_id = v_match.id AND rp.round = v_round AND mp.house = v_match.house_a;

  SELECT rp.pick INTO v_pick_b
  FROM public.rune_duel_picks AS rp
  JOIN public.match_players AS mp USING (match_id, user_id)
  WHERE rp.match_id = v_match.id AND rp.round = v_round AND mp.house = v_match.house_b;

  -- Balanced four-rune cycle: flame beats gale, gale beats stone,
  -- stone beats shadow, and shadow beats flame. Matching or opposite runes tie.
  v_winner := CASE
    WHEN v_pick_a = v_pick_b THEN NULL
    WHEN (v_pick_a = 'flame' AND v_pick_b = 'gale')
      OR (v_pick_a = 'gale' AND v_pick_b = 'stone')
      OR (v_pick_a = 'stone' AND v_pick_b = 'shadow')
      OR (v_pick_a = 'shadow' AND v_pick_b = 'flame') THEN v_match.house_a
    WHEN (v_pick_b = 'flame' AND v_pick_a = 'gale')
      OR (v_pick_b = 'gale' AND v_pick_a = 'stone')
      OR (v_pick_b = 'stone' AND v_pick_a = 'shadow')
      OR (v_pick_b = 'shadow' AND v_pick_a = 'flame') THEN v_match.house_b
    ELSE NULL
  END;

  v_result := CASE WHEN v_winner IS NULL THEN 'draw' ELSE 'winner' END;
  v_score_a := COALESCE((v_state #>> '{scores,house_a}')::integer, 0);
  v_score_b := COALESCE((v_state #>> '{scores,house_b}')::integer, 0);
  IF v_winner = v_match.house_a THEN v_score_a := v_score_a + 1; END IF;
  IF v_winner = v_match.house_b THEN v_score_b := v_score_b + 1; END IF;

  v_state := jsonb_set(v_state, '{round}', to_jsonb(v_round + 1), true);
  v_state := jsonb_set(v_state, '{scores}', jsonb_build_object('house_a', v_score_a, 'house_b', v_score_b), true);
  v_state := jsonb_set(v_state, '{last_result}', jsonb_build_object(
    'round', v_round, 'outcome', v_result, 'winner_house', v_winner,
    'house_a_pick', v_pick_a, 'house_b_pick', v_pick_b
  ), true);
  v_state := jsonb_set(v_state, '{history}', COALESCE(v_state -> 'history', '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object('round', v_round, 'outcome', v_result, 'winner_house', v_winner,
      'house_a_pick', v_pick_a, 'house_b_pick', v_pick_b)
  ), true);

  UPDATE public.matches
  SET state = v_state,
      winner_house = CASE WHEN v_score_a >= 3 THEN v_match.house_a
                          WHEN v_score_b >= 3 THEN v_match.house_b
                          ELSE NULL END,
      status = CASE WHEN v_score_a >= 3 OR v_score_b >= 3 THEN 'finished' ELSE 'active' END
  WHERE id = v_match.id
  RETURNING * INTO v_match;

  RETURN to_jsonb(v_match);
END
$$;

CREATE OR REPLACE FUNCTION public.finish_match(match_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches;
BEGIN
  SELECT * INTO v_match
  FROM public.matches AS m
  WHERE m.id = finish_match.match_id
  FOR UPDATE;

  IF NOT FOUND OR v_match.status <> 'finished' OR v_match.mode <> 'tournament'
    OR v_match.winner_house IS NULL THEN
    RAISE EXCEPTION 'Only a finished tournament match can award house points.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.match_players AS mp
    WHERE mp.match_id = v_match.id AND mp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only match players may finish this match.';
  END IF;
  IF v_match.points_awarded THEN
    RETURN 0;
  END IF;

  INSERT INTO public.house_points (house, points)
  VALUES (v_match.winner_house, 10)
  ON CONFLICT (house) DO UPDATE SET points = public.house_points.points + 10;

  UPDATE public.matches SET points_awarded = true WHERE id = v_match.id;
  RETURN 10;
END
$$;

CREATE OR REPLACE FUNCTION public.award_common_room_points(match_id uuid, amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches;
  v_house text;
  v_awarded integer;
  v_used integer;
  v_now timestamptz;
BEGIN
  SELECT p.house INTO v_house
  FROM public.profiles AS p
  WHERE p.id = auth.uid();
  IF auth.uid() IS NULL OR v_house IS NULL OR v_house NOT IN ('phoenix', 'fox', 'selkie') THEN
    RAISE EXCEPTION 'Assign a house before earning common room points.';
  END IF;
  IF amount IS NULL OR amount <= 0 OR amount > 50 THEN
    RAISE EXCEPTION 'Point awards must be between 1 and 50.';
  END IF;

  SELECT * INTO v_match
  FROM public.matches AS m
  WHERE m.id = award_common_room_points.match_id
  FOR UPDATE;
  IF NOT FOUND OR v_match.mode <> 'common_room'
    OR v_match.house_a <> v_house OR v_match.status <> 'active' THEN
    RAISE EXCEPTION 'This is not an active common room for your house.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.match_players AS mp
    WHERE mp.match_id = v_match.id AND mp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Join your house room before earning points.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_house), 20261006);
  v_now := clock_timestamp();
  SELECT COALESCE(sum(a.amount), 0)::integer INTO v_used
  FROM public.house_point_awards AS a
  WHERE a.house = v_house
    AND (a.created_at AT TIME ZONE 'UTC')::date = (v_now AT TIME ZONE 'UTC')::date;
  v_awarded := least(amount, greatest(0, 50 - v_used));

  IF v_awarded > 0 THEN
    INSERT INTO public.house_point_awards (house, match_id, amount, created_at)
    VALUES (v_house, v_match.id, v_awarded, v_now);
    INSERT INTO public.house_points (house, points)
    VALUES (v_house, v_awarded)
    ON CONFLICT (house) DO UPDATE SET points = public.house_points.points + v_awarded;
  END IF;

  RETURN v_awarded;
END
$$;

REVOKE ALL ON FUNCTION public.create_tournament_match(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_tournament_match(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_common_room(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_rune_pick(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finish_match(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.award_common_room_points(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_tournament_match(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_tournament_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_common_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rune_pick(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_common_room_points(uuid, integer) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'matches'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'house_points'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.house_points;
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';

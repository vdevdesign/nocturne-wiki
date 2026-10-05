-- Run this in the Supabase SQL editor to persist death saves on NPC records.
ALTER TABLE public.npcs
  ADD COLUMN IF NOT EXISTS death_save_successes smallint NOT NULL DEFAULT 0
    CHECK (death_save_successes BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS death_save_failures smallint NOT NULL DEFAULT 0
    CHECK (death_save_failures BETWEEN 0 AND 3);

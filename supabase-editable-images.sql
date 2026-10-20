-- Add pictures to every card that supports inline detail editing.
-- Run once in the Supabase SQL editor.

ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.quest_board ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.session_summaries ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.loot ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.player_inventories ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.worldbook ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.lore ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.session_skeletons ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.character_template_secrets ADD COLUMN IF NOT EXISTS image_url text;

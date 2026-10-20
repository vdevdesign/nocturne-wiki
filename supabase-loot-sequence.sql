-- Repair the loot primary-key sequence after imports or manual inserts.
-- Run once in the Supabase SQL editor.
-- This is safe to run repeatedly and does not change existing loot rows.

DO $$
DECLARE
  loot_sequence text;
  highest_id bigint;
BEGIN
  loot_sequence := pg_get_serial_sequence('public.loot', 'id');
  IF loot_sequence IS NOT NULL THEN
    EXECUTE 'SELECT COALESCE(MAX(id), 0) FROM public.loot'
      INTO highest_id;
    PERFORM setval(loot_sequence, highest_id + 1, false);
  END IF;
END
$$;

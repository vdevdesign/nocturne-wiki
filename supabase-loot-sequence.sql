-- Repair automatic loot IDs after imports or manual inserts.
-- Run once in the Supabase SQL editor. Safe to rerun.

DO $$
DECLARE
  loot_sequence regclass;
  loot_id_type text;
  highest_id bigint;
  sequence_last_value bigint;
  sequence_is_called boolean;
BEGIN
  SELECT format_type(attribute.atttypid, attribute.atttypmod)
  INTO loot_id_type
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.loot'::regclass
    AND attribute.attname = 'id'
    AND NOT attribute.attisdropped;

  IF loot_id_type IS NULL THEN
    RAISE EXCEPTION 'Could not find public.loot.id.';
  END IF;

  LOCK TABLE public.loot IN ACCESS EXCLUSIVE MODE;

  IF loot_id_type = 'uuid' THEN
    ALTER TABLE public.loot
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
    RETURN;
  END IF;

  IF loot_id_type = 'text'
    OR loot_id_type LIKE 'character varying%'
    OR loot_id_type LIKE 'character%' THEN
    -- Text-keyed schemas use UUID strings instead of numeric sequences.
    ALTER TABLE public.loot
      ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    RETURN;
  END IF;

  IF loot_id_type NOT IN ('integer', 'bigint', 'smallint') THEN
    RAISE EXCEPTION 'Unsupported public.loot.id type: %. Expected text or an integer type.', loot_id_type;
  END IF;

  loot_sequence := pg_get_serial_sequence('public.loot', 'id')::regclass;

  IF loot_sequence IS NULL THEN
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.loot_id_seq AS bigint';
    loot_sequence := 'public.loot_id_seq'::regclass;
    EXECUTE format(
      'ALTER TABLE public.loot ALTER COLUMN id SET DEFAULT nextval(%L::regclass)',
      loot_sequence::text
    );
    EXECUTE format('ALTER SEQUENCE %s OWNED BY public.loot.id', loot_sequence);
  END IF;

  EXECUTE 'SELECT COALESCE(MAX(id)::bigint, 0) FROM public.loot'
    INTO highest_id;
  EXECUTE format('SELECT last_value, is_called FROM %s', loot_sequence)
    INTO sequence_last_value, sequence_is_called;

  IF sequence_last_value < highest_id
    OR (sequence_last_value = highest_id AND NOT sequence_is_called) THEN
    PERFORM setval(loot_sequence, GREATEST(highest_id, 1), true);
  END IF;
END
$$;

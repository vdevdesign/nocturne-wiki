ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS public_bio text NOT NULL DEFAULT '';

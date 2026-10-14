ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS image_url_pending text,
  ADD COLUMN IF NOT EXISTS image_approval_status text NOT NULL DEFAULT 'approved';

-- Existing portraits were already in use before approval was introduced.
UPDATE public.characters
SET image_approval_status = 'approved'
WHERE image_approval_status IS NULL
   OR image_approval_status NOT IN ('approved', 'pending', 'rejected');

CREATE OR REPLACE FUNCTION public.enforce_character_image_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- DMs can approve or set an active portrait directly.
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'dm'
  ) THEN
    RETURN NEW;
  END IF;

  -- Players may submit a pending portrait, but cannot activate one directly.
  IF NEW.image_url_pending IS NOT NULL AND NEW.image_url_pending <> '' THEN
    NEW.image_approval_status := 'pending';
    IF NEW.image_url IS DISTINCT FROM OLD.image_url
       AND NOT (NEW.image_url IS NULL AND NEW.image_url_pending IS NULL) THEN
      NEW.image_url := OLD.image_url;
    END IF;
  ELSIF NEW.image_url IS NULL AND NEW.image_url_pending IS NULL THEN
    -- Removing an existing portrait does not require approval.
    NEW.image_approval_status := 'approved';
  ELSE
    NEW.image_approval_status := COALESCE(OLD.image_approval_status, 'approved');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS character_image_approval_trigger ON public.characters;
CREATE TRIGGER character_image_approval_trigger
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_character_image_approval();

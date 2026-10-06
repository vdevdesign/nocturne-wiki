-- Run this in the Supabase SQL editor to store intended recipients for whispers.
ALTER TABLE public.session_messages
  ADD COLUMN IF NOT EXISTS recipient_name text;

NOTIFY pgrst, 'reload schema';

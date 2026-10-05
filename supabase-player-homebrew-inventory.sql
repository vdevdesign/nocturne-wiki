-- Run this in the Supabase SQL editor to enable player-owned homebrew inventory items.
ALTER TABLE public.player_inventories
  ADD COLUMN IF NOT EXISTS item_name text,
  ADD COLUMN IF NOT EXISTS item_description text,
  ADD COLUMN IF NOT EXISTS item_value text;

ALTER TABLE public.player_inventories
  ALTER COLUMN loot_id DROP NOT NULL;

ALTER TABLE public.player_inventories ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.player_inventories TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'player_inventories'
      AND policyname = 'player_inventory_owner_or_dm_select_access'
  ) THEN
    CREATE POLICY player_inventory_owner_or_dm_select_access
      ON public.player_inventories AS PERMISSIVE
      FOR SELECT TO authenticated
      USING (
        user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'dm'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'player_inventories'
      AND policyname = 'player_inventory_owner_or_dm_select'
  ) THEN
    CREATE POLICY player_inventory_owner_or_dm_select
      ON public.player_inventories AS RESTRICTIVE
      FOR SELECT TO authenticated
      USING (
        user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'dm'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'player_inventories'
      AND policyname = 'player_inventory_owner_or_dm_insert_access'
  ) THEN
    CREATE POLICY player_inventory_owner_or_dm_insert_access
      ON public.player_inventories AS PERMISSIVE
      FOR INSERT TO authenticated
      WITH CHECK (
        user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'dm'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'player_inventories'
      AND policyname = 'player_inventory_owner_or_dm_insert'
  ) THEN
    CREATE POLICY player_inventory_owner_or_dm_insert
      ON public.player_inventories AS RESTRICTIVE
      FOR INSERT TO authenticated
      WITH CHECK (
        user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'dm'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'player_inventories'
      AND policyname = 'player_inventory_owner_or_dm_update_access'
  ) THEN
    CREATE POLICY player_inventory_owner_or_dm_update_access
      ON public.player_inventories AS PERMISSIVE
      FOR UPDATE TO authenticated
      USING (
        user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'dm'
        )
      )
      WITH CHECK (
        user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'dm'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'player_inventories'
      AND policyname = 'player_inventory_owner_or_dm_update'
  ) THEN
    CREATE POLICY player_inventory_owner_or_dm_update
      ON public.player_inventories AS RESTRICTIVE
      FOR UPDATE TO authenticated
      USING (
        user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'dm'
        )
      )
      WITH CHECK (
        user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'dm'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'player_inventories'
      AND policyname = 'player_inventory_owner_or_dm_delete_access'
  ) THEN
    CREATE POLICY player_inventory_owner_or_dm_delete_access
      ON public.player_inventories AS PERMISSIVE
      FOR DELETE TO authenticated
      USING (
        user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'dm'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'player_inventories'
      AND policyname = 'player_inventory_owner_or_dm_delete'
  ) THEN
    CREATE POLICY player_inventory_owner_or_dm_delete
      ON public.player_inventories AS RESTRICTIVE
      FOR DELETE TO authenticated
      USING (
        user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'dm'
        )
      );
  END IF;
END
$$;

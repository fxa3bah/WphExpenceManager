-- Add policy to allow users to view all users for manager selection
-- This must be run in Supabase SQL Editor

CREATE POLICY "Users can view all users for manager selection"
    ON public.users FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Complete migration for all recent changes
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. Add CEO role to users table
-- ============================================

-- Drop the existing CHECK constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new CHECK constraint with 'ceo' role
ALTER TABLE public.users ADD CONSTRAINT users_role_check
    CHECK (role IN ('employee', 'manager', 'admin', 'ceo'));

-- Update Jonathan Storie's role to CEO
UPDATE public.users
SET role = 'ceo', updated_at = NOW()
WHERE email = 'jonathan.storie@wphome.com';

-- ============================================
-- 2. Fix delete RLS policy (remove draft restriction)
-- ============================================

-- Drop the existing policy that only allows deleting drafts
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

-- Create new policy that allows deleting any expense the user owns
CREATE POLICY "Users can delete their own expenses"
    ON public.expenses FOR DELETE
    USING (auth.uid()::uuid = user_id);

-- ============================================
-- Done! Your database is now updated
-- ============================================

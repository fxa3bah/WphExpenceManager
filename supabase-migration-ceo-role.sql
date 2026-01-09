-- Add 'ceo' role to users table
-- This migration adds the 'ceo' role option and updates Jonathan Storie's role

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add new CHECK constraint with 'ceo' role
ALTER TABLE public.users ADD CONSTRAINT users_role_check
    CHECK (role IN ('employee', 'manager', 'admin', 'ceo'));

-- Step 3: Update Jonathan Storie's role to CEO
UPDATE public.users
SET role = 'ceo', updated_at = NOW()
WHERE email = 'jonathan.storie@wphome.com';

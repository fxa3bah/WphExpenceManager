-- CRITICAL FIX: This SQL fixes the infinite recursion error
-- Run this in Supabase SQL Editor to replace problematic policies

-- First, drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Managers can view their reports" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- Drop problematic policies on expenses table
DROP POLICY IF EXISTS "Admins can view all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update all expenses" ON public.expenses;

-- Drop problematic policies on storage
DROP POLICY IF EXISTS "Admins can view all receipts" ON storage.objects;

-- Create helper function to get user role (using SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Recreate users table policies WITHOUT recursion
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid()::uuid = id);

CREATE POLICY "Managers can view their reports"
    ON public.users FOR SELECT
    USING (manager_id = auth.uid()::uuid);

-- FIXED: Use security definer function instead of recursive query
CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (public.get_user_role(auth.uid()::uuid) = 'admin');

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid()::uuid = id);

-- FIXED: Use security definer function instead of recursive query
CREATE POLICY "Admins can update all users"
    ON public.users FOR UPDATE
    USING (public.get_user_role(auth.uid()::uuid) = 'admin');

-- Recreate expenses table admin policies WITHOUT recursion
CREATE POLICY "Admins can view all expenses"
    ON public.expenses FOR SELECT
    USING (public.get_user_role(auth.uid()::uuid) = 'admin');

CREATE POLICY "Admins can update all expenses"
    ON public.expenses FOR UPDATE
    USING (public.get_user_role(auth.uid()::uuid) = 'admin');

-- Recreate storage admin policy WITHOUT recursion
CREATE POLICY "Admins can view all receipts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'receipts' AND
        public.get_user_role(auth.uid()::uuid) = 'admin'
    );

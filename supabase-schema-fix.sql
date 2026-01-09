-- Fix for infinite recursion in RLS policies
-- This script should be run in Supabase SQL Editor

-- First, drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Managers can view their reports" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Managers can view their reports' expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can view all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Managers can approve their reports' expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Managers can view their reports' receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all receipts" ON storage.objects;

-- Create a helper function to get user role (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = user_id;
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to check if user is manager of another user
CREATE OR REPLACE FUNCTION public.is_manager_of(manager_id UUID, employee_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    emp_manager_id UUID;
BEGIN
    SELECT manager_id INTO emp_manager_id
    FROM public.users
    WHERE id = employee_id;
    RETURN emp_manager_id = manager_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to get all report IDs for a manager
CREATE OR REPLACE FUNCTION public.get_report_ids(manager_id UUID)
RETURNS TABLE(id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT users.id
    FROM public.users
    WHERE users.manager_id = manager_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate Users table policies (fixed)
CREATE POLICY "Managers can view their reports"
    ON public.users FOR SELECT
    USING (
        manager_id = auth.uid()::uuid
    );

CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (
        public.get_user_role(auth.uid()::uuid) = 'admin'
    );

CREATE POLICY "Admins can update all users"
    ON public.users FOR UPDATE
    USING (
        public.get_user_role(auth.uid()::uuid) = 'admin'
    );

-- Recreate Expenses table policies (fixed)
CREATE POLICY "Managers can view their reports' expenses"
    ON public.expenses FOR SELECT
    USING (
        user_id IN (SELECT id FROM public.get_report_ids(auth.uid()::uuid))
    );

CREATE POLICY "Admins can view all expenses"
    ON public.expenses FOR SELECT
    USING (
        public.get_user_role(auth.uid()::uuid) = 'admin'
    );

CREATE POLICY "Managers can approve their reports' expenses"
    ON public.expenses FOR UPDATE
    USING (
        user_id IN (SELECT id FROM public.get_report_ids(auth.uid()::uuid))
    );

CREATE POLICY "Admins can update all expenses"
    ON public.expenses FOR UPDATE
    USING (
        public.get_user_role(auth.uid()::uuid) = 'admin'
    );

-- Recreate Storage policies (fixed)
CREATE POLICY "Managers can view their reports' receipts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'receipts' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.get_report_ids(auth.uid()::uuid)
        )
    );

CREATE POLICY "Admins can view all receipts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'receipts' AND
        public.get_user_role(auth.uid()::uuid) = 'admin'
    );

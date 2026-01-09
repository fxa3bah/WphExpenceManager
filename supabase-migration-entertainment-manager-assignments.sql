-- Migration: Add entertainment people count and manager email pre-assignments
-- Date: 2026-01-09

-- 1. Add entertainment_people_count column to expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS entertainment_people_count INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN public.expenses.entertainment_people_count IS 'Number of people entertained (only for Entertainment category expenses)';

-- 2. Create manager_email_assignments table for pre-registration assignments
CREATE TABLE IF NOT EXISTS public.manager_email_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    employee_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_at TIMESTAMP WITH TIME ZONE, -- When the employee actually signed up and was assigned
    CONSTRAINT valid_wphome_email CHECK (employee_email LIKE '%@wphome.com'),
    UNIQUE(employee_email) -- Each email can only be pre-assigned to one manager
);

-- Create index for faster lookups during signup
CREATE INDEX IF NOT EXISTS idx_manager_email_assignments_employee_email
ON public.manager_email_assignments(employee_email)
WHERE assigned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_manager_email_assignments_manager_id
ON public.manager_email_assignments(manager_id);

-- Add comment for documentation
COMMENT ON TABLE public.manager_email_assignments IS 'Pre-assignment of employee emails to managers. When a user signs up with a pre-assigned email, they are automatically assigned to the corresponding manager.';

-- 3. Enable RLS on manager_email_assignments table
ALTER TABLE public.manager_email_assignments ENABLE ROW LEVEL SECURITY;

-- Managers can view their own assignments
CREATE POLICY "Managers can view their own email assignments"
    ON public.manager_email_assignments FOR SELECT
    USING (auth.uid()::uuid = manager_id);

-- Managers can create their own assignments
CREATE POLICY "Managers can create their own email assignments"
    ON public.manager_email_assignments FOR INSERT
    WITH CHECK (auth.uid()::uuid = manager_id);

-- Managers can delete their own assignments (only if not yet assigned)
CREATE POLICY "Managers can delete their own unassigned email assignments"
    ON public.manager_email_assignments FOR DELETE
    USING (
        auth.uid()::uuid = manager_id AND
        assigned_at IS NULL
    );

-- Admins can view all assignments
CREATE POLICY "Admins can view all email assignments"
    ON public.manager_email_assignments FOR SELECT
    USING (public.get_user_role(auth.uid()::uuid) = 'admin');

-- Admins can create assignments for any manager
CREATE POLICY "Admins can create email assignments for any manager"
    ON public.manager_email_assignments FOR INSERT
    WITH CHECK (public.get_user_role(auth.uid()::uuid) = 'admin');

-- Admins can delete any assignment
CREATE POLICY "Admins can delete any email assignment"
    ON public.manager_email_assignments FOR DELETE
    USING (public.get_user_role(auth.uid()::uuid) = 'admin');

-- Admins can update any assignment
CREATE POLICY "Admins can update any email assignment"
    ON public.manager_email_assignments FOR UPDATE
    USING (public.get_user_role(auth.uid()::uuid) = 'admin');

-- 4. Update the handle_new_user function to check for pre-assignments
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    pre_assigned_manager_id UUID;
BEGIN
    -- Check if this email has a pre-assignment
    SELECT manager_id INTO pre_assigned_manager_id
    FROM public.manager_email_assignments
    WHERE employee_email = NEW.email
    AND assigned_at IS NULL
    LIMIT 1;

    -- Create user profile
    INSERT INTO public.users (id, email, full_name, role, manager_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        'employee',
        pre_assigned_manager_id  -- Will be NULL if no pre-assignment exists
    );

    -- If there was a pre-assignment, mark it as assigned
    IF pre_assigned_manager_id IS NOT NULL THEN
        UPDATE public.manager_email_assignments
        SET assigned_at = NOW()
        WHERE employee_email = NEW.email
        AND assigned_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on_auth_user_created already exists and will use this updated function

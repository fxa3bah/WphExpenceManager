-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'admin')),
    manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trips table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trip_name TEXT NOT NULL,
    destination TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    category TEXT NOT NULL,
    merchant_name TEXT,
    description TEXT,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    location TEXT,
    gps_coordinates JSONB,
    ocr_data JSONB,
    entertainment_people_count INTEGER,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create manager_email_assignments table for pre-registration assignments
CREATE TABLE IF NOT EXISTS public.manager_email_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    employee_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_wphome_email CHECK (employee_email LIKE '%@wphome.com'),
    UNIQUE(employee_email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON public.users(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_email_assignments_employee_email ON public.manager_email_assignments(employee_email) WHERE assigned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_manager_email_assignments_manager_id ON public.manager_email_assignments(manager_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on signup
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
        pre_assigned_manager_id
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

-- Trigger to auto-create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function to get user role (bypasses RLS to prevent infinite recursion)
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

-- Helper function to check if user is manager of another user
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

-- Helper function to get all report IDs for a manager
CREATE OR REPLACE FUNCTION public.get_report_ids(manager_id UUID)
RETURNS TABLE(id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT users.id
    FROM public.users
    WHERE users.manager_id = manager_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_email_assignments ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid()::uuid = id);

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

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid()::uuid = id);

CREATE POLICY "Admins can update all users"
    ON public.users FOR UPDATE
    USING (
        public.get_user_role(auth.uid()::uuid) = 'admin'
    );

-- Note: User profile creation is handled automatically by the on_auth_user_created trigger
-- No manual INSERT policy needed for users table

-- Trips table policies
CREATE POLICY "Users can view their own trips"
    ON public.trips FOR SELECT
    USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can create their own trips"
    ON public.trips FOR INSERT
    WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update their own trips"
    ON public.trips FOR UPDATE
    USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete their own trips"
    ON public.trips FOR DELETE
    USING (auth.uid()::uuid = user_id);

-- Expenses table policies
CREATE POLICY "Users can view their own expenses"
    ON public.expenses FOR SELECT
    USING (auth.uid()::uuid = user_id);

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

CREATE POLICY "Users can create their own expenses"
    ON public.expenses FOR INSERT
    WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update their own expenses"
    ON public.expenses FOR UPDATE
    USING (auth.uid()::uuid = user_id);

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

CREATE POLICY "Users can delete their own expenses"
    ON public.expenses FOR DELETE
    USING (auth.uid()::uuid = user_id AND status = 'draft');

-- Manager Email Assignments table policies
CREATE POLICY "Managers can view their own email assignments"
    ON public.manager_email_assignments FOR SELECT
    USING (auth.uid()::uuid = manager_id);

CREATE POLICY "Managers can create their own email assignments"
    ON public.manager_email_assignments FOR INSERT
    WITH CHECK (auth.uid()::uuid = manager_id);

CREATE POLICY "Managers can delete their own unassigned email assignments"
    ON public.manager_email_assignments FOR DELETE
    USING (
        auth.uid()::uuid = manager_id AND
        assigned_at IS NULL
    );

CREATE POLICY "Admins can view all email assignments"
    ON public.manager_email_assignments FOR SELECT
    USING (public.get_user_role(auth.uid()::uuid) = 'admin');

CREATE POLICY "Admins can create email assignments for any manager"
    ON public.manager_email_assignments FOR INSERT
    WITH CHECK (public.get_user_role(auth.uid()::uuid) = 'admin');

CREATE POLICY "Admins can delete any email assignment"
    ON public.manager_email_assignments FOR DELETE
    USING (public.get_user_role(auth.uid()::uuid) = 'admin');

CREATE POLICY "Admins can update any email assignment"
    ON public.manager_email_assignments FOR UPDATE
    USING (public.get_user_role(auth.uid()::uuid) = 'admin');

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts
CREATE POLICY "Users can upload their own receipts"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'receipts' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own receipts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'receipts' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

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

CREATE POLICY "Users can delete their own receipts"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'receipts' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

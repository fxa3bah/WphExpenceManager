-- Allow users to delete their own expenses regardless of status
-- This migration removes the draft-only restriction from the delete policy

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

-- Create new policy without status restriction
CREATE POLICY "Users can delete their own expenses"
    ON public.expenses FOR DELETE
    USING (auth.uid()::uuid = user_id);

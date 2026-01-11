-- Add USD conversion fields to expenses table
-- This allows tracking the USD equivalent of expenses in other currencies

-- Add usd_amount field (stores the USD equivalent)
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS usd_amount DECIMAL(10, 2);

-- Add exchange_rate field (stores the rate used for conversion)
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 6);

-- Update existing USD expenses to have usd_amount = amount and exchange_rate = 1.0
UPDATE public.expenses
SET usd_amount = amount, exchange_rate = 1.0
WHERE currency = 'USD' AND usd_amount IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_expenses_usd_amount ON public.expenses(usd_amount);

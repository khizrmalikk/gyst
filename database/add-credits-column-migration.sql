-- Add Credits Column Migration Script
-- Run this in your Supabase SQL editor to add credits tracking

-- 1. Add credits column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 50;

-- 2. Set default credits for existing users (if any)
UPDATE public.user_profiles 
SET credits = 50 
WHERE credits IS NULL;

-- 3. Add constraint to ensure credits can't be negative
ALTER TABLE public.user_profiles 
ADD CONSTRAINT credits_non_negative CHECK (credits >= 0);

-- 4. Create index for credits queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_credits ON public.user_profiles(credits);

-- 5. Add credit usage tracking table (optional - for future detailed tracking)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit', 'purchase', 'bonus')),
    amount INTEGER NOT NULL,
    description TEXT,
    related_entity_type TEXT, -- 'application', 'cv_generation', 'email_sync', etc.
    related_entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. Create indexes for credit transactions  
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);

-- 7. Enable RLS for credit transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for credit transactions
CREATE POLICY "Users can view their own credit transactions" ON public.credit_transactions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own credit transactions" ON public.credit_transactions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 9. Create helper function to deduct credits safely
CREATE OR REPLACE FUNCTION public.deduct_credits(
    p_user_id TEXT,
    p_amount INTEGER,
    p_description TEXT DEFAULT 'Credit usage',
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Get current credits with row lock
    SELECT credits INTO current_credits
    FROM public.user_profiles
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check if user exists and has enough credits
    IF current_credits IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    IF current_credits < p_amount THEN
        RETURN FALSE; -- Insufficient credits
    END IF;
    
    -- Deduct credits
    UPDATE public.user_profiles
    SET credits = credits - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log the transaction
    INSERT INTO public.credit_transactions (
        user_id,
        transaction_type,
        amount,
        description,
        related_entity_type,
        related_entity_id
    ) VALUES (
        p_user_id,
        'debit',
        -p_amount,
        p_description,
        p_entity_type,
        p_entity_id
    );
    
    RETURN TRUE; -- Success
END;
$$;

-- 10. Create helper function to add credits
CREATE OR REPLACE FUNCTION public.add_credits(
    p_user_id TEXT,
    p_amount INTEGER,
    p_description TEXT DEFAULT 'Credit addition',
    p_transaction_type TEXT DEFAULT 'credit'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Add credits
    UPDATE public.user_profiles
    SET credits = credits + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Check if user exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- Log the transaction
    INSERT INTO public.credit_transactions (
        user_id,
        transaction_type,
        amount,
        description
    ) VALUES (
        p_user_id,
        p_transaction_type,
        p_amount,
        p_description
    );
    
    RETURN TRUE; -- Success
END;
$$;

-- 11. Add comments for documentation
COMMENT ON COLUMN public.user_profiles.credits IS 'Number of credits available for user actions (CV generation, applications, etc.)';
COMMENT ON TABLE public.credit_transactions IS 'Tracks all credit additions and deductions for users';
COMMENT ON FUNCTION public.deduct_credits IS 'Safely deducts credits from user account with transaction logging';
COMMENT ON FUNCTION public.add_credits IS 'Adds credits to user account with transaction logging';

-- Migration complete!
-- Users now have a credits system with transaction tracking 
-- Gmail Tables Only Migration Script
-- This creates only the new tables without modifying job_applications
-- Run this if you're getting column conflicts

-- 1. Create application_emails table (stores all emails linked to applications)
CREATE TABLE IF NOT EXISTS public.application_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    gmail_message_id TEXT NOT NULL,
    gmail_thread_id TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    subject TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    email_snippet TEXT,
    full_content TEXT,
    status_detected TEXT,
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create application status history table (tracks status changes)
CREATE TABLE IF NOT EXISTS public.application_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'email', 'system')) DEFAULT 'manual',
    trigger_source TEXT,
    notes TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Add foreign key constraints (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_emails_application_id_fkey') THEN
        ALTER TABLE public.application_emails 
        ADD CONSTRAINT application_emails_application_id_fkey 
        FOREIGN KEY (application_id) REFERENCES public.job_applications(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_status_history_application_id_fkey') THEN
        ALTER TABLE public.application_status_history 
        ADD CONSTRAINT application_status_history_application_id_fkey 
        FOREIGN KEY (application_id) REFERENCES public.job_applications(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_application_emails_application_id ON public.application_emails(application_id);
CREATE INDEX IF NOT EXISTS idx_application_emails_user_id ON public.application_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_application_emails_gmail_message ON public.application_emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_application_emails_sender ON public.application_emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_application_emails_received_at ON public.application_emails(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_application_status_history_application_id ON public.application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_user_id ON public.application_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_changed_at ON public.application_status_history(changed_at DESC);

-- 5. Create unique constraint for email deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_application_emails_unique_message 
ON public.application_emails(gmail_message_id, user_id);

-- 6. Enable RLS
ALTER TABLE public.application_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
-- Application emails policies
DROP POLICY IF EXISTS "Users can view their own application emails" ON public.application_emails;
CREATE POLICY "Users can view their own application emails" ON public.application_emails
    FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert their own application emails" ON public.application_emails;
CREATE POLICY "Users can insert their own application emails" ON public.application_emails
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own application emails" ON public.application_emails;
CREATE POLICY "Users can update their own application emails" ON public.application_emails
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Status history policies
DROP POLICY IF EXISTS "Users can view their own application status history" ON public.application_status_history;
CREATE POLICY "Users can view their own application status history" ON public.application_status_history
    FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert their own application status history" ON public.application_status_history;
CREATE POLICY "Users can insert their own application status history" ON public.application_status_history
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 8. Create helper functions
CREATE OR REPLACE FUNCTION public.match_email_to_application(
    p_user_id TEXT,
    p_sender_email TEXT,
    p_subject TEXT,
    p_snippet TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    matched_app_id UUID;
    sender_domain TEXT;
BEGIN
    -- Extract domain from sender email
    sender_domain := LOWER(SPLIT_PART(p_sender_email, '@', 2));
    
    -- Try exact company name match first (case insensitive)
    SELECT id INTO matched_app_id
    FROM public.job_applications
    WHERE user_id = p_user_id
    AND (
        LOWER(company_name) = LOWER(SPLIT_PART(sender_domain, '.', 1))
        OR LOWER(p_subject) LIKE '%' || LOWER(company_name) || '%'
        OR LOWER(p_snippet) LIKE '%' || LOWER(company_name) || '%'
        OR sender_domain LIKE '%' || LOWER(REPLACE(company_name, ' ', '')) || '%'
    )
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no exact match, try fuzzy matching on job title
    IF matched_app_id IS NULL THEN
        SELECT id INTO matched_app_id
        FROM public.job_applications
        WHERE user_id = p_user_id
        AND (
            LOWER(p_subject) LIKE '%' || LOWER(job_title) || '%'
            OR LOWER(p_snippet) LIKE '%' || LOWER(job_title) || '%'
        )
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN matched_app_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_application_status(
    p_application_id UUID,
    p_user_id TEXT,
    p_new_status TEXT,
    p_trigger_type TEXT DEFAULT 'manual',
    p_trigger_source TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_email_data JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_status TEXT;
    app_exists BOOLEAN;
BEGIN
    -- Get current status and check if application exists
    SELECT application_status INTO current_status
    FROM public.job_applications
    WHERE id = p_application_id AND user_id = p_user_id;
    
    app_exists := FOUND;
    
    IF NOT app_exists THEN
        RAISE EXCEPTION 'Application not found or access denied: %', p_application_id;
    END IF;
    
    -- Only update if status is actually changing
    IF current_status != p_new_status THEN
        -- Update application status
        UPDATE public.job_applications
        SET 
            application_status = p_new_status,
            updated_at = NOW()
        WHERE id = p_application_id;
        
        -- Insert status history record
        INSERT INTO public.application_status_history (
            application_id,
            user_id,
            old_status,
            new_status,
            trigger_type,
            trigger_source,
            notes,
            metadata
        ) VALUES (
            p_application_id,
            p_user_id,
            current_status,
            p_new_status,
            p_trigger_type,
            p_trigger_source,
            p_notes,
            p_email_data
        );
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE; -- No change needed
END;
$$;

-- 9. Comments
COMMENT ON TABLE public.application_emails IS 'Stores all emails linked to job applications for status tracking';
COMMENT ON TABLE public.application_status_history IS 'Tracks all status changes for job applications with triggers';
COMMENT ON FUNCTION public.match_email_to_application IS 'Matches incoming emails to existing job applications';
COMMENT ON FUNCTION public.update_application_status IS 'Updates application status with automatic history tracking';

-- Done! This creates the necessary tables without touching job_applications 
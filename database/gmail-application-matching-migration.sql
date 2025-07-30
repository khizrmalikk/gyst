-- Gmail Application Matching Migration Script
-- This updates the job_applications table to store linked emails and track status changes

-- 1. Add email-related fields to job_applications table
ALTER TABLE public.job_applications 
ADD COLUMN IF NOT EXISTS latest_email_id TEXT,
ADD COLUMN IF NOT EXISTS latest_email_subject TEXT,
ADD COLUMN IF NOT EXISTS latest_email_from TEXT,
ADD COLUMN IF NOT EXISTS latest_email_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS latest_email_snippet TEXT,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS email_count INTEGER DEFAULT 0;

-- 2. Create application_emails junction table to store all related emails
CREATE TABLE IF NOT EXISTS public.application_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    gmail_message_id TEXT NOT NULL,
    gmail_thread_id TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    subject TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    email_snippet TEXT,
    full_content TEXT, -- Store more detailed content if needed
    status_detected TEXT, -- What status this email suggests
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create application status history table
CREATE TABLE IF NOT EXISTS public.application_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'email', 'system')) DEFAULT 'manual',
    trigger_source TEXT, -- email_id, user_action, etc.
    notes TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_emails_application_id ON public.application_emails(application_id);
CREATE INDEX IF NOT EXISTS idx_application_emails_user_id ON public.application_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_application_emails_gmail_message ON public.application_emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_application_emails_sender ON public.application_emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_application_emails_received_at ON public.application_emails(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_application_status_history_application_id ON public.application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_user_id ON public.application_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_changed_at ON public.application_status_history(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_applications_latest_email_date ON public.job_applications(latest_email_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_job_applications_status_updated_at ON public.job_applications(status_updated_at DESC);

-- 5. Create unique constraint to prevent duplicate email processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_application_emails_unique_message 
ON public.application_emails(gmail_message_id, user_id);

-- 6. Enable RLS
ALTER TABLE public.application_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for application_emails
CREATE POLICY "Users can view their own application emails" ON public.application_emails
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own application emails" ON public.application_emails
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own application emails" ON public.application_emails
    FOR UPDATE USING (auth.uid()::text = user_id);

-- 8. Create RLS policies for application_status_history
CREATE POLICY "Users can view their own application status history" ON public.application_status_history
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own application status history" ON public.application_status_history
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 9. Create function to update application status with history tracking
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
            status_updated_at = NOW(),
            updated_at = NOW(),
            -- Update email fields if provided
            latest_email_id = COALESCE((p_email_data->>'message_id')::TEXT, latest_email_id),
            latest_email_subject = COALESCE((p_email_data->>'subject')::TEXT, latest_email_subject),
            latest_email_from = COALESCE((p_email_data->>'from')::TEXT, latest_email_from),
            latest_email_date = COALESCE((p_email_data->>'received_at')::TIMESTAMPTZ, latest_email_date),
            latest_email_snippet = COALESCE((p_email_data->>'snippet')::TEXT, latest_email_snippet)
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

-- 10. Create function to match email to application
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
    company_variations TEXT[];
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

-- 11. Create view for applications with email summaries
CREATE OR REPLACE VIEW public.applications_with_emails AS
SELECT 
    ja.*,
    ae.email_count,
    ae.latest_email_subject,
    ae.latest_email_from,
    ae.latest_email_date,
    ae.latest_email_snippet,
    -- Status history count
    (SELECT COUNT(*) FROM application_status_history ash WHERE ash.application_id = ja.id) as status_changes_count,
    -- Latest status change
    (SELECT changed_at FROM application_status_history ash WHERE ash.application_id = ja.id ORDER BY changed_at DESC LIMIT 1) as last_status_change
FROM public.job_applications ja
LEFT JOIN (
    SELECT 
        application_id,
        COUNT(*) as email_count,
        MAX(subject) as latest_email_subject,
        MAX(sender_email) as latest_email_from,
        MAX(received_at) as latest_email_date,
        MAX(email_snippet) as latest_email_snippet
    FROM public.application_emails
    GROUP BY application_id
) ae ON ja.id = ae.application_id;

-- 12. Add helpful comments
COMMENT ON TABLE public.application_emails IS 'Stores all emails linked to job applications for status tracking';
COMMENT ON TABLE public.application_status_history IS 'Tracks all status changes for job applications with triggers';
COMMENT ON FUNCTION public.update_application_status IS 'Updates application status with automatic history tracking';
COMMENT ON FUNCTION public.match_email_to_application IS 'Matches incoming emails to existing job applications';
COMMENT ON VIEW public.applications_with_emails IS 'Applications with aggregated email data for dashboard display';

-- Migration complete!
-- Applications can now be automatically updated based on Gmail responses 
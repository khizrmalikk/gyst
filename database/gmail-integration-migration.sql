-- Gmail Integration Migration Script
-- Run this in your Supabase SQL editor to add Gmail integration support

-- 1. Create Gmail integrations table
CREATE TABLE IF NOT EXISTS public.gmail_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    gmail_email TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    is_active BOOLEAN DEFAULT true,
    sync_enabled BOOLEAN DEFAULT true,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    total_emails_processed INTEGER DEFAULT 0,
    responses_found INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create unique constraint (only one active integration per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gmail_integrations_user_active 
ON public.gmail_integrations(user_id) 
WHERE is_active = true;

-- 3. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_gmail_integrations_user_id ON public.gmail_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_integrations_active ON public.gmail_integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_gmail_integrations_sync_enabled ON public.gmail_integrations(sync_enabled) WHERE is_active = true;

-- 4. Create email responses tracking table
CREATE TABLE IF NOT EXISTS public.email_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    integration_id UUID NOT NULL REFERENCES public.gmail_integrations(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.job_applications(id) ON DELETE SET NULL,
    gmail_message_id TEXT NOT NULL,
    gmail_thread_id TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    subject TEXT NOT NULL,
    response_type TEXT CHECK (response_type IN ('interview', 'rejection', 'follow_up', 'acknowledgment', 'other')) DEFAULT 'other',
    confidence_score DECIMAL(3,2) DEFAULT 0.5, -- AI confidence in categorization (0.0 to 1.0)
    content_snippet TEXT,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT false,
    ai_analysis JSONB DEFAULT '{}'::jsonb, -- Store AI analysis results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create unique constraint to prevent duplicate email processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_responses_unique_message 
ON public.email_responses(gmail_message_id, user_id);

-- 6. Create indexes for email responses
CREATE INDEX IF NOT EXISTS idx_email_responses_user_id ON public.email_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_email_responses_application_id ON public.email_responses(application_id);
CREATE INDEX IF NOT EXISTS idx_email_responses_integration_id ON public.email_responses(integration_id);
CREATE INDEX IF NOT EXISTS idx_email_responses_type ON public.email_responses(response_type);
CREATE INDEX IF NOT EXISTS idx_email_responses_received_at ON public.email_responses(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_responses_confidence ON public.email_responses(confidence_score DESC);

-- 7. Enable Row Level Security
ALTER TABLE public.gmail_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_responses ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for gmail_integrations
CREATE POLICY "Users can view their own gmail integrations" ON public.gmail_integrations
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own gmail integrations" ON public.gmail_integrations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own gmail integrations" ON public.gmail_integrations
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own gmail integrations" ON public.gmail_integrations
    FOR DELETE USING (auth.uid()::text = user_id);

-- 9. Create RLS policies for email_responses
CREATE POLICY "Users can view their own email responses" ON public.email_responses
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own email responses" ON public.email_responses
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own email responses" ON public.email_responses
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own email responses" ON public.email_responses
    FOR DELETE USING (auth.uid()::text = user_id);

-- 10. Create helper functions for Gmail integration

-- Function to get active Gmail integration for a user
CREATE OR REPLACE FUNCTION public.get_user_gmail_integration(p_user_id text)
RETURNS TABLE (
    id uuid,
    gmail_email text,
    is_active boolean,
    sync_enabled boolean,
    connected_at timestamptz,
    last_sync_at timestamptz,
    total_emails_processed integer,
    responses_found integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        gi.id,
        gi.gmail_email,
        gi.is_active,
        gi.sync_enabled,
        gi.connected_at,
        gi.last_sync_at,
        gi.total_emails_processed,
        gi.responses_found
    FROM public.gmail_integrations gi
    WHERE gi.user_id = p_user_id 
      AND gi.is_active = true
    LIMIT 1;
$$;

-- Function to update sync statistics
CREATE OR REPLACE FUNCTION public.update_gmail_sync_stats(
    p_user_id text,
    p_emails_processed integer,
    p_responses_found integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.gmail_integrations 
    SET 
        last_sync_at = NOW(),
        total_emails_processed = total_emails_processed + p_emails_processed,
        responses_found = responses_found + p_responses_found,
        updated_at = NOW()
    WHERE user_id = p_user_id 
      AND is_active = true;
    
    RETURN FOUND;
END;
$$;

-- Function to get email responses with application details
CREATE OR REPLACE FUNCTION public.get_user_email_responses(
    p_user_id text,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    sender_email text,
    sender_name text,
    subject text,
    response_type text,
    confidence_score decimal,
    received_at timestamptz,
    job_title text,
    company_name text,
    application_status text,
    content_snippet text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        er.id,
        er.sender_email,
        er.sender_name,
        er.subject,
        er.response_type,
        er.confidence_score,
        er.received_at,
        ja.job_title,
        ja.company_name,
        ja.application_status,
        er.content_snippet
    FROM public.email_responses er
    LEFT JOIN public.job_applications ja ON er.application_id = ja.id
    WHERE er.user_id = p_user_id
      AND er.is_archived = false
    ORDER BY er.received_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- 11. Create a view for Gmail integration dashboard
CREATE OR REPLACE VIEW public.gmail_integration_dashboard AS
SELECT 
    gi.user_id,
    gi.gmail_email,
    gi.is_active,
    gi.sync_enabled,
    gi.connected_at,
    gi.last_sync_at,
    gi.total_emails_processed,
    gi.responses_found,
    -- Count responses by type
    COUNT(CASE WHEN er.response_type = 'interview' THEN 1 END) as interview_requests,
    COUNT(CASE WHEN er.response_type = 'rejection' THEN 1 END) as rejections,
    COUNT(CASE WHEN er.response_type = 'follow_up' THEN 1 END) as follow_ups,
    COUNT(CASE WHEN er.response_type = 'acknowledgment' THEN 1 END) as acknowledgments,
    COUNT(CASE WHEN er.response_type = 'other' THEN 1 END) as other_responses,
    -- Recent activity
    MAX(er.received_at) as last_response_received
FROM public.gmail_integrations gi
LEFT JOIN public.email_responses er ON gi.id = er.integration_id AND er.is_archived = false
WHERE gi.is_active = true
GROUP BY 
    gi.user_id, gi.gmail_email, gi.is_active, gi.sync_enabled, 
    gi.connected_at, gi.last_sync_at, gi.total_emails_processed, gi.responses_found;

-- 12. Add comments for documentation
COMMENT ON TABLE public.gmail_integrations IS 'Stores Gmail OAuth integration details for users';
COMMENT ON TABLE public.email_responses IS 'Tracks job application responses found in user emails';
COMMENT ON COLUMN public.email_responses.confidence_score IS 'AI confidence score for response categorization (0.0-1.0)';
COMMENT ON COLUMN public.email_responses.ai_analysis IS 'JSON field storing detailed AI analysis of the email';
COMMENT ON VIEW public.gmail_integration_dashboard IS 'Dashboard view showing Gmail integration statistics';
COMMENT ON FUNCTION public.get_user_gmail_integration IS 'Retrieves active Gmail integration for a user';
COMMENT ON FUNCTION public.update_gmail_sync_stats IS 'Updates email processing statistics after sync';
COMMENT ON FUNCTION public.get_user_email_responses IS 'Retrieves email responses with linked application details';

-- Migration complete!
-- Gmail integration tables and functions are now ready for use 
-- Create Gmail integrations table
CREATE TABLE IF NOT EXISTS gmail_integrations (
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, is_active) -- Only one active integration per user
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_gmail_integrations_user_id ON gmail_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_integrations_active ON gmail_integrations(is_active);

-- Create email responses tracking table
CREATE TABLE IF NOT EXISTS email_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    integration_id UUID NOT NULL REFERENCES gmail_integrations(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    gmail_message_id TEXT NOT NULL,
    gmail_thread_id TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    subject TEXT NOT NULL,
    response_type TEXT CHECK (response_type IN ('interview', 'rejection', 'follow_up', 'other')) DEFAULT 'other',
    confidence_score DECIMAL(3,2) DEFAULT 0.5, -- AI confidence in categorization
    content_snippet TEXT,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gmail_message_id, user_id) -- Prevent duplicate processing
);

-- Create indexes for email responses
CREATE INDEX IF NOT EXISTS idx_email_responses_user_id ON email_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_email_responses_application_id ON email_responses(application_id);
CREATE INDEX IF NOT EXISTS idx_email_responses_type ON email_responses(response_type);
CREATE INDEX IF NOT EXISTS idx_email_responses_received_at ON email_responses(received_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE gmail_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_responses ENABLE ROW LEVEL SECURITY;

-- Gmail integrations policies
CREATE POLICY "Users can view their own gmail integrations" ON gmail_integrations
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own gmail integrations" ON gmail_integrations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own gmail integrations" ON gmail_integrations
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Email responses policies
CREATE POLICY "Users can view their own email responses" ON email_responses
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own email responses" ON email_responses
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own email responses" ON email_responses
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Grant permissions to service role (for API operations)
GRANT ALL ON gmail_integrations TO service_role;
GRANT ALL ON email_responses TO service_role; 
-- Workflows table to track overall job application workflows
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    search_query TEXT NOT NULL,
    total_jobs INTEGER NOT NULL DEFAULT 0,
    processed_jobs INTEGER NOT NULL DEFAULT 0,
    successful_applications INTEGER NOT NULL DEFAULT 0,
    failed_applications INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'initializing' CHECK (status IN ('initializing', 'processing', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent tasks table to track individual agent tasks
CREATE TABLE agent_tasks (
    id TEXT PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('website_checker', 'form_analyzer', 'application_filler')),
    job_id TEXT NOT NULL,
    job_url TEXT NOT NULL,
    payload JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    max_retries INTEGER NOT NULL DEFAULT 3,
    current_retry INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled')),
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_agent TEXT
);

-- Agent logs table for debugging and monitoring
CREATE TABLE agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL,
    message TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'error', 'debug')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Job applications table to track successful applications
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    job_url TEXT NOT NULL,
    job_title TEXT,
    company_name TEXT,
    application_status TEXT NOT NULL DEFAULT 'submitted' CHECK (application_status IN ('submitted', 'confirmed', 'rejected', 'pending')),
    application_data JSONB,
    screenshots JSONB,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_agent_tasks_workflow_id ON agent_tasks(workflow_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_type ON agent_tasks(type);
CREATE INDEX idx_agent_tasks_priority ON agent_tasks(priority);
CREATE INDEX idx_agent_logs_workflow_id ON agent_logs(workflow_id);
CREATE INDEX idx_agent_logs_timestamp ON agent_logs(timestamp);
CREATE INDEX idx_job_applications_workflow_id ON job_applications(workflow_id);
CREATE INDEX idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX idx_job_applications_status ON job_applications(application_status);

-- Enable RLS (Row Level Security) for multi-tenancy
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (Note: These will be created using service key, so they're for reference)
-- Users can only see their own workflows
CREATE POLICY "Users can view their own workflows" ON workflows
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own workflows" ON workflows
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own workflows" ON workflows
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Agent tasks are accessible through workflow ownership
CREATE POLICY "Users can view agent tasks for their workflows" ON agent_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workflows 
            WHERE workflows.id = agent_tasks.workflow_id 
            AND workflows.user_id = auth.uid()::text
        )
    );

-- Agent logs are accessible through workflow ownership
CREATE POLICY "Users can view agent logs for their workflows" ON agent_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workflows 
            WHERE workflows.id = agent_logs.workflow_id 
            AND workflows.user_id = auth.uid()::text
        )
    );

-- Job applications are accessible by user
CREATE POLICY "Users can view their own job applications" ON job_applications
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own job applications" ON job_applications
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own job applications" ON job_applications
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_workflows_updated_at 
    BEFORE UPDATE ON workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_tasks_updated_at 
    BEFORE UPDATE ON agent_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at 
    BEFORE UPDATE ON job_applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
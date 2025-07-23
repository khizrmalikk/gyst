import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Check if the workflows table exists
    const { data, error } = await supabaseAdmin
      .from('workflows')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({
        success: false,
        error: 'Database tables not found',
        details: error.message,
        suggestion: 'Please run the database schema setup'
      });
    }

    // Also test job_applications table and show extension apps
    const { data: applications, error: appsError } = await supabaseAdmin
      .from('job_applications')
      .select('id, user_id, job_title, company_name, application_status, created_at, applied_at, application_data')
      .eq('user_id', 'extension-user')
      .order('created_at', { ascending: false })
      .limit(2);

    // Show cleanup recommendation for old extension-user applications
    const cleanupRecommendation = applications && applications.length > 0 ? {
      warning: "Found old 'extension-user' applications that lack proper user isolation",
      count: applications.length,
      recommendation: "These should be cleaned up for security",
      cleanupSQL: `
        -- WARNING: This will delete all old extension-user applications
        -- Only run this after implementing proper authentication
        DELETE FROM job_applications WHERE user_id = 'extension-user';
      `
    } : null;

    // Test the same data transformation that the GET /api/applications uses
    const formattedApplications = applications?.map(app => ({
      id: app.id,
      userId: app.user_id,
      jobInfo: {
        title: app.job_title,
        company: app.company_name,
        location: app.application_data?.jobInfo?.location || null,
        description: app.application_data?.jobInfo?.description || null,
        requirements: app.application_data?.jobInfo?.requirements || [],
        salary: app.application_data?.jobInfo?.salary || null
      },
      applicationData: {
        url: app.application_data?.url || '',
        status: app.application_status,
        appliedAt: app.applied_at,
        applicationMethod: app.application_data?.applicationMethod || 'manual',
        cvGenerated: app.application_data?.cvGenerated || false,
        coverLetterGenerated: app.application_data?.coverLetterGenerated || false,
        formFieldsCount: app.application_data?.formFieldsCount || 0,
        aiResponsesCount: app.application_data?.aiResponsesCount || 0,
        notes: app.application_data?.notes || ''
      },
      metadata: {
        pageTitle: app.application_data?.metadata?.pageTitle || '',
        pageType: app.application_data?.metadata?.pageType || 'unknown',
        timestamp: app.application_data?.metadata?.timestamp || app.created_at
      },
      createdAt: app.created_at,
      isExtensionSubmission: app.user_id === 'extension-user'
    })) || [];

    return NextResponse.json({
      success: true,
      message: 'Database tables exist and are accessible',
      tablesChecked: ['workflows', 'agent_tasks', 'agent_logs', 'job_applications'],
      extensionApplications: {
        count: applications?.length || 0,
        recent: applications || [],
        error: appsError?.message || null
      },
      cleanupRecommendation,
      formattedSample: {
        count: formattedApplications.length,
        sampleStructure: formattedApplications[0] || null,
        hasAppliedAt: formattedApplications[0]?.applicationData?.appliedAt ? true : false
      }
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // For now, just return instructions for manual table creation
    const sql = `
-- Copy and paste this SQL into your Supabase SQL Editor to create the tables:

-- Workflows table to track overall job application workflows
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    search_query TEXT NOT NULL,
    total_jobs INTEGER NOT NULL DEFAULT 0,
    processed_jobs INTEGER NOT NULL DEFAULT 0,
    successful_applications INTEGER NOT NULL DEFAULT 0,
    failed_applications INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'initializing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent tasks table to track individual agent tasks
CREATE TABLE IF NOT EXISTS agent_tasks (
    id TEXT PRIMARY KEY,
    workflow_id UUID NOT NULL,
    type TEXT NOT NULL,
    job_id TEXT NOT NULL,
    job_url TEXT NOT NULL,
    payload JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    max_retries INTEGER NOT NULL DEFAULT 3,
    current_retry INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_agent TEXT
);

-- Agent logs table for debugging and monitoring
CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    agent_type TEXT NOT NULL,
    message TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'info',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Job applications table to track successful applications
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    job_url TEXT NOT NULL,
    job_title TEXT,
    company_name TEXT,
    application_status TEXT NOT NULL DEFAULT 'submitted',
    application_data JSONB,
    screenshots JSONB,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_workflow_id ON agent_tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_type ON agent_tasks(type);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_priority ON agent_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_agent_logs_workflow_id ON agent_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON agent_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_job_applications_workflow_id ON job_applications(workflow_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(application_status);
`;

    return NextResponse.json({
      success: true,
      message: 'Database setup instructions provided',
      instructions: 'Please copy the SQL below and run it in your Supabase SQL Editor',
      sql: sql
    });

  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Orchestrator } from '@/lib/agents/orchestrator';
import { WorkflowState, WorkflowStatus, AgentContext, AgentType, TaskStatus } from '@/lib/agents/types';
import { OpenAIService } from '@/lib/llm/openai';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchQuery, jobUrls } = await request.json();

    if (!searchQuery || !jobUrls || !Array.isArray(jobUrls)) {
      return NextResponse.json({ 
        error: 'Search query and job URLs are required' 
      }, { status: 400 });
    }

    // Get user profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ 
        error: 'User profile not found' 
      }, { status: 404 });
    }

    // Create workflow
    const { data: workflowData, error: workflowError } = await supabaseAdmin
      .from('workflows')
      .insert({
        user_id: userId,
        search_query: searchQuery,
        total_jobs: jobUrls.length,
        status: WorkflowStatus.INITIALIZING
      })
      .select()
      .single();

    if (workflowError) {
      console.error('Error creating workflow:', workflowError);
      console.error('Workflow data attempted:', {
        user_id: userId,
        search_query: searchQuery,
        total_jobs: jobUrls.length,
        status: WorkflowStatus.INITIALIZING
      });
      return NextResponse.json({ 
        error: 'Failed to create workflow',
        details: workflowError.message || 'Unknown database error'
      }, { status: 500 });
    }

    // Create initial website checker tasks for each job URL
    const initialTasks = jobUrls.map((jobUrl: string, index: number) => ({
      id: `website-checker-${workflowData.id}-${index}`,
      workflow_id: workflowData.id,
      type: AgentType.WEBSITE_CHECKER,
      job_id: `job-${index}`,
      job_url: jobUrl,
      payload: JSON.stringify({ jobUrl }),
      priority: 1,
      max_retries: 3,
      current_retry: 0,
      status: TaskStatus.PENDING
    }));

    const { error: tasksError } = await supabaseAdmin
      .from('agent_tasks')
      .insert(initialTasks);

    if (tasksError) {
      console.error('Error creating initial tasks:', tasksError);
      return NextResponse.json({ 
        error: 'Failed to create initial tasks' 
      }, { status: 500 });
    }

    // Create workflow state
    const workflowState: WorkflowState = {
      id: workflowData.id,
      userId: userId,
      searchQuery: searchQuery,
      totalJobs: jobUrls.length,
      processedJobs: 0,
      successfulApplications: 0,
      failedApplications: 0,
      status: WorkflowStatus.INITIALIZING,
      createdAt: new Date(workflowData.created_at),
      updatedAt: new Date(workflowData.updated_at),
      tasks: []
    };

    // Create agent context
    const agentContext: AgentContext = {
      workflowId: workflowData.id,
      userId: userId,
      userProfile: profileData,
      tools: {
        browser: null, // Will be initialized by orchestrator
        llm: new OpenAIService(),
        database: supabaseAdmin
      }
    };

    // Start the workflow in the background
    const orchestrator = new Orchestrator(workflowState, agentContext);
    
    // Start workflow asynchronously (don't await)
    orchestrator.startWorkflow().catch(error => {
      console.error('Workflow execution error:', error);
    });

    return NextResponse.json({
      success: true,
      workflowId: workflowData.id,
      message: 'Workflow started successfully'
    });

  } catch (error) {
    console.error('Error starting workflow:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId } = await params;

    // Get workflow status
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json({ 
        error: 'Workflow not found' 
      }, { status: 404 });
    }

    // Get all tasks for this workflow
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('agent_tasks')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json({ 
        error: 'Failed to fetch tasks' 
      }, { status: 500 });
    }

    // Get job applications
    const { data: applications, error: applicationsError } = await supabaseAdmin
      .from('job_applications')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('user_id', userId);

    if (applicationsError) {
      console.error('Error fetching applications:', applicationsError);
    }

    // Get recent logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('agent_logs')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error('Error fetching logs:', logsError);
    }

    // Calculate progress
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const failedTasks = tasks?.filter(t => t.status === 'failed').length || 0;
    const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
    const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;

    // Categorize tasks by type
    const tasksByType = {
      website_checker: tasks?.filter(t => t.type === 'website_checker') || [],
      form_analyzer: tasks?.filter(t => t.type === 'form_analyzer') || [],
      application_filler: tasks?.filter(t => t.type === 'application_filler') || []
    };

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflow.id,
        status: workflow.status,
        searchQuery: workflow.search_query,
        totalJobs: workflow.total_jobs,
        processedJobs: workflow.processed_jobs,
        successfulApplications: workflow.successful_applications,
        failedApplications: workflow.failed_applications,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at
      },
      progress: {
        totalTasks,
        completedTasks,
        failedTasks,
        pendingTasks,
        inProgressTasks,
        percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      tasksByType,
      applications: applications || [],
      recentLogs: logs || []
    });

  } catch (error) {
    console.error('Error fetching workflow status:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 
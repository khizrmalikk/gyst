import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Fetching applications...');
    
    // Check if user is authenticated
    const { userId } = await auth();
    
    if (!userId) {
      console.log('❌ User not authenticated');
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', userId);
    
    // Fetch applications (basic query without email columns)
    const { data: applications, error: applicationsError } = await supabaseAdmin
      .from('job_applications')
      .select('*')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });
    
    if (applicationsError) {
      console.error('❌ Error fetching applications:', applicationsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch applications'
      }, { status: 500 });
    }
    
    const applicationIds = applications?.map(app => app.id) || [];
    
    let emailsData = [];
    let statusHistoryData = [];
    
    if (applicationIds.length > 0) {
      // Fetch emails for all applications (if table exists)
      try {
        const { data: emails, error: emailsError } = await supabaseAdmin
          .from('application_emails')
          .select('*')
          .in('application_id', applicationIds)
          .eq('user_id', userId)
          .order('received_at', { ascending: false });
        
        if (!emailsError) {
          emailsData = emails || [];
        }
      } catch (error) {
        console.warn('Application emails table not found, skipping email data');
      }
      
      // Fetch status history for all applications (if table exists)
      try {
        const { data: history, error: historyError } = await supabaseAdmin
          .from('application_status_history')
          .select('*')
          .in('application_id', applicationIds)
          .eq('user_id', userId)
          .order('changed_at', { ascending: false });
        
        if (!historyError) {
          statusHistoryData = history || [];
        }
      } catch (error) {
        console.warn('Application status history table not found, skipping history data');
      }
    }
    
    // Transform applications to match the expected frontend format
    const transformedApplications = applications?.map(app => {
      // Get emails for this application
      const appEmails = emailsData.filter(email => email.application_id === app.id);
      
      // Get status history for this application
      const appStatusHistory = statusHistoryData.filter(history => history.application_id === app.id);
      
      // Parse application_data if it exists and is valid JSON
      let parsedApplicationData: any = {};
      try {
        if (app.application_data) {
          parsedApplicationData = typeof app.application_data === 'string' 
            ? JSON.parse(app.application_data) 
            : app.application_data;
        }
      } catch (error) {
        console.warn('Failed to parse application_data for app:', app.id);
      }
      
      return {
        id: app.id,
        userId: app.user_id,
        jobInfo: {
          title: app.job_title || 'Unknown Position',
          company: app.company_name || 'Unknown Company',
          location: parsedApplicationData.jobInfo?.location || parsedApplicationData.location || 'Not specified',
          description: parsedApplicationData.jobInfo?.description || parsedApplicationData.description,
          requirements: parsedApplicationData.jobInfo?.requirements || parsedApplicationData.requirements || [],
          salary: parsedApplicationData.jobInfo?.salary || parsedApplicationData.salary,
        },
        applicationData: {
          url: app.job_url || '',
          status: app.application_status || 'submitted',
          appliedAt: app.applied_at || app.created_at,
          applicationMethod: parsedApplicationData.applicationMethod || 'manual',
          cvGenerated: parsedApplicationData.cvGenerated || false,
          coverLetterGenerated: parsedApplicationData.coverLetterGenerated || false,
          formFieldsCount: parsedApplicationData.formFieldsCount || 0,
          aiResponsesCount: parsedApplicationData.aiResponsesCount || 0,
          notes: parsedApplicationData.notes,
          formData: parsedApplicationData.formData || [],
        },
        // Add email and status tracking data
        emailData: {
          count: appEmails.length,
          latestEmail: appEmails[0] || null, // Most recent email
          emails: appEmails, // All emails for this application
          hasEmails: appEmails.length > 0
        },
        statusHistory: {
          count: appStatusHistory.length,
          changes: appStatusHistory,
          lastChange: appStatusHistory[0] || null
        },
        metadata: {
          pageTitle: parsedApplicationData.metadata?.pageTitle || app.job_title || 'Job Application',
          pageType: parsedApplicationData.metadata?.pageType || 'job_board',
          timestamp: app.created_at,
        },
        createdAt: app.created_at,
        updatedAt: app.updated_at,
        statusUpdatedAt: app.status_updated_at || app.updated_at,
      };
    }) || [];
    
    console.log(`✅ Successfully fetched ${transformedApplications.length} applications with email data`);
    
    return NextResponse.json({
      success: true,
      applications: transformedApplications,
      summary: {
        total: transformedApplications.length,
        withEmails: transformedApplications.filter(app => app.emailData.hasEmails).length,
        statusUpdates: transformedApplications.reduce((sum, app) => sum + app.statusHistory.count, 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Applications fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Creating new application...');
    
    // Check if user is authenticated
    const { userId } = await auth();
    
    if (!userId) {
      console.log('❌ User not authenticated');
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }
    
    const body = await request.json();
    console.log('📋 Received application data:', JSON.stringify(body, null, 2));
    
    // Handle multiple data formats for backward compatibility
    let jobTitle: string;
    let companyName: string; 
    let jobUrl: string;
    let applicationStatus = 'submitted';
    let applicationData: any = {};
    
    // Extract required fields from various formats
    jobTitle = body.jobTitle || body.job_title || body.jobInfo?.title || '';
    companyName = body.companyName || body.company_name || body.company || body.jobInfo?.company || '';
    jobUrl = body.jobUrl || body.job_url || body.url || body.applicationData?.url || '';
    applicationStatus = body.applicationStatus || body.application_status || body.status || body.applicationData?.status || 'submitted';
    
    // Build applicationData object with all the details
    applicationData = {
      url: jobUrl,
      status: applicationStatus,
      appliedAt: body.appliedAt || body.applied_at || body.application_date || new Date().toISOString(),
      applicationMethod: body.source === 'extension' ? 'chrome_extension' : (body.applicationMethod || 'manual'),
      cvGenerated: body.cvGenerated || false,
      coverLetterGenerated: body.coverLetterGenerated || false,
      formFieldsCount: body.formFieldsCount || 0,
      aiResponsesCount: body.aiResponsesCount || 0,
      notes: body.notes || '',
      formData: body.formData || null,
      jobInfo: {
        location: body.location || body.jobInfo?.location || '',
        description: body.job_description || body.description || body.jobInfo?.description || '',
        requirements: body.requirements || body.jobInfo?.requirements || [],
        salary: body.salary || body.jobInfo?.salary || ''
      },
      metadata: {
        pageTitle: body.pageTitle || '',
        pageType: body.pageType || '',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('✅ User authenticated:', userId);
    console.log('📋 Parsed application data:', { jobTitle, companyName, jobUrl, applicationStatus });
    
    // Validate required fields
    if (!jobTitle || !companyName || !jobUrl) {
      console.error('❌ Missing required fields after parsing:', { jobTitle, companyName, jobUrl });
      console.error('❌ Available keys in body:', Object.keys(body));
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${!jobTitle ? 'jobTitle ' : ''}${!companyName ? 'companyName ' : ''}${!jobUrl ? 'jobUrl' : ''}. Received keys: ${Object.keys(body).join(', ')}`
      }, { status: 400 });
    }
    
    // Create or get default workflow for applications
    let workflowId;
    const { data: existingWorkflow } = await supabaseAdmin
      .from('workflows')
      .select('id')
      .eq('user_id', userId)
      .eq('search_query', 'Manual Applications')
      .single();
    
    if (existingWorkflow) {
      workflowId = existingWorkflow.id;
    } else {
      const { data: newWorkflow, error: workflowError } = await supabaseAdmin
        .from('workflows')
        .insert({
          user_id: userId,
          search_query: 'Manual Applications',
          status: 'active'
        })
        .select('id')
        .single();
      
      if (workflowError) {
        console.error('❌ Error creating workflow:', workflowError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create workflow'
        }, { status: 500 });
      }
      
      workflowId = newWorkflow.id;
    }
    
    // Insert the application
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('job_applications')
      .insert({
        workflow_id: workflowId,
        user_id: userId,
        job_id: `manual_${Date.now()}`,
        job_url: jobUrl,
        job_title: jobTitle,
        company_name: companyName,
        application_status: applicationStatus,
        application_data: applicationData,
        applied_at: applicationData.appliedAt
      })
      .select()
      .single();
    
    if (applicationError) {
      console.error('❌ Error creating application:', applicationError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create application'
      }, { status: 500 });
    }
    
    console.log('✅ Application created successfully:', application.id);
    
    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        jobTitle: application.job_title,
        companyName: application.company_name,
        jobUrl: application.job_url,
        applicationStatus: application.application_status,
        appliedAt: application.applied_at,
        createdAt: application.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ Application creation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 
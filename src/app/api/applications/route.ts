import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from '@/lib/supabase';

// Helper function to get or create default workflow for extension applications
async function getOrCreateDefaultWorkflow(userId: string): Promise<string> {
  try {
    // Check if user has a default extension workflow
    const { data: existingWorkflow, error: fetchError } = await supabaseAdmin
      .from('workflows')
      .select('id')
      .eq('user_id', userId)
      .eq('search_query', 'Extension Applications')
      .single();

    if (existingWorkflow && !fetchError) {
      return existingWorkflow.id;
    }

    // Create new default workflow for extension applications
    const { data: newWorkflow, error: createError } = await supabaseAdmin
      .from('workflows')
      .insert({
        user_id: userId,
        search_query: 'Extension Applications',
        status: 'active'
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating default workflow:', createError);
      throw createError;
    }

    console.log('✅ Created default workflow for extension:', newWorkflow.id);
    return newWorkflow.id;

  } catch (error) {
    console.error('❌ Error with default workflow:', error);
    // Return a placeholder - will be handled by migration that makes workflow_id optional
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('📋 Fetching applications for user:', authResult.userId);

    // Get applications for the authenticated user only (proper user isolation)
    const { data: applications, error } = await supabaseAdmin
      .from('job_applications')
      .select(`
        id,
        user_id,
        job_url,
        job_title,
        company_name,
        application_status,
        application_data,
        applied_at,
        created_at,
        updated_at
      `)
      .eq('user_id', authResult.userId)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching applications:', error);
      return NextResponse.json({ 
        error: "Failed to fetch applications",
        details: error.message 
      }, { status: 500 });
    }

    console.log(`✅ Found ${applications?.length || 0} applications for user ${authResult.userId}`);

    // Log breakdown of application sources
    const userApps = applications?.filter(app => app.user_id === authResult.userId) || [];
    const extensionApps = applications?.filter(app => app.user_id === 'extension-user') || [];
    console.log(`📊 Application breakdown: ${userApps.length} user apps, ${extensionApps.length} extension apps`);

    // Transform the data for frontend consumption
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
        url: app.job_url,
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
      updatedAt: app.updated_at,
      // Add indicator for extension vs regular submissions
      submissionSource: app.user_id === 'extension-user' ? 'extension' : 'webapp',
      isExtensionSubmission: app.user_id === 'extension-user'
    })) || [];

    // Separate extension applications for special handling
    const extensionApplications = formattedApplications.filter(app => 
      app.applicationData.applicationMethod === 'chrome_extension'
    );
    
    const regularApplications = formattedApplications.filter(app => 
      app.applicationData.applicationMethod !== 'chrome_extension'
    );

    return NextResponse.json({
      success: true,
      applications: formattedApplications,
      extensionApplications,
      regularApplications,
      stats: {
        total: formattedApplications.length,
        extension: extensionApplications.length,
        regular: regularApplications.length,
        cvGenerated: formattedApplications.filter(app => app.applicationData.cvGenerated).length,
        coverLetterGenerated: formattedApplications.filter(app => app.applicationData.coverLetterGenerated).length
      }
    });

  } catch (error) {
    console.error("❌ Applications fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📋 Application submission request received');
    
    // REQUIRE proper authentication for ALL requests - no bypasses for security
    const authResult = await auth();
    if (!authResult.userId) {
      console.log('❌ Authentication required - no anonymous submissions allowed');
      return NextResponse.json({ 
        error: "Authentication required. Please login to submit applications." 
      }, { status: 401 });
    }

    const userId = authResult.userId;
    console.log('✅ Authenticated user:', userId);

    const body = await request.json();
    console.log('📥 Request body:', JSON.stringify(body, null, 2));
    
    // Handle comprehensive extension application - map to existing schema
    if (body.jobInfo || (body.jobTitle && body.company) || (body.job_title && body.company_name)) {
      console.log('🚀 Creating Supabase application...');
      
      // Handle both old and new data formats for backward compatibility
      let jobInfo;
      if (body.jobInfo) {
        // New format: {jobInfo: {title, company, ...}}
        jobInfo = body.jobInfo;
      } else if (body.job_title && body.company_name) {
        // Old format: {job_title: "...", company_name: "..."}
        jobInfo = {
          title: body.job_title,
          company: body.company_name,
          location: body.location,
          description: body.job_description,
          requirements: body.requirements || [],
          salary: body.salary
        };
      } else {
        // Legacy format: {jobTitle: "...", company: "..."}
        jobInfo = {
          title: body.jobTitle,
          company: body.company,
          location: body.location,
          description: body.description,
          requirements: body.requirements || [],
          salary: body.salary
        };
      }
      
      // Handle both old and new application data formats
      let applicationData;
      if (body.applicationMethod || body.appliedAt) {
        // New format
        applicationData = {
          url: body.url || body.job_url,
          status: body.status || 'submitted',
          appliedAt: body.appliedAt || body.application_date || new Date().toISOString(),
          applicationMethod: body.applicationMethod || body.source === 'extension' ? 'chrome_extension' : 'manual',
          cvGenerated: body.cvGenerated || false,
          coverLetterGenerated: body.coverLetterGenerated || false,
          cvContent: body.cvContent,
          coverLetterContent: body.coverLetterContent,
          formData: body.formData,
          formFieldsCount: body.formFieldsCount || 0,
          aiResponsesCount: body.aiResponsesCount || 0,
          notes: body.notes || ''
        };
      } else {
        // Old format - convert to new format
        applicationData = {
          url: body.job_url || body.url,
          status: body.status || 'submitted',
          appliedAt: body.application_date || new Date().toISOString(),
          applicationMethod: body.source === 'extension' ? 'chrome_extension' : 'manual',
          cvGenerated: false,
          coverLetterGenerated: false,
          formData: null,
          formFieldsCount: 0,
          aiResponsesCount: 0,
          notes: body.tailored_profile_id ? `Tailored profile: ${body.tailored_profile_id}` : ''
        };
      }
      
      try {
        const application = await createSupabaseApplication({
          userId,
          jobInfo,
          applicationData,
          metadata: {
            pageTitle: body.pageTitle,
            pageType: body.pageType,
            userAgent: request.headers.get('user-agent'),
            timestamp: new Date().toISOString()
          }
        });
        
        console.log('✅ Application created successfully:', application.id);
        
        return NextResponse.json({
          success: true,
          application
        });
        
      } catch (applicationError) {
        console.error('❌ Application creation failed:', applicationError);
        console.error('Error details:', {
          message: applicationError instanceof Error ? applicationError.message : 'Unknown error',
          stack: applicationError instanceof Error ? applicationError.stack : 'No stack trace'
        });
        
        return NextResponse.json({
          error: "Failed to create application",
          details: applicationError instanceof Error ? applicationError.message : 'Unknown error'
        }, { status: 500 });
      }
    }
    
    // Handle regular app format (legacy)
    const { jobId, status, notes } = body;
    const application = await createApplication({
      userId,
      jobId,
      status,
      notes
    });
    
    return NextResponse.json({
      success: true,
      application
    });
    
  } catch (error) {
    console.error("Application creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getUserApplications(userId: string) {
  // TODO: Replace with actual Supabase query
  // SELECT * FROM job_applications WHERE user_id = $1 ORDER BY applied_at DESC
  
  // Enhanced mock data that matches Supabase schema structure
  return [
    {
      id: "app-1",
      workflow_id: "workflow-1", // From existing schema
      user_id: userId,
      job_id: "job-1",
      job_url: "https://techcorp.com/careers/senior-engineer",
      job_title: "Senior Software Engineer",
      company_name: "TechCorp Inc.",
      application_status: "submitted",
      application_data: {
        // Extension-specific data stored in jsonb field
        applicationMethod: "chrome_extension",
        cvGenerated: true,
        coverLetterGenerated: true,
        formFieldsCount: 12,
        aiResponsesCount: 3,
        jobInfo: {
          location: "San Francisco, CA",
          description: "We are looking for a senior software engineer...",
          requirements: ["React", "Node.js", "TypeScript"],
          salary: "$120,000 - $150,000"
        },
        formData: [
          { name: "name", value: "John Doe", type: "text" },
          { name: "email", value: "john@example.com", type: "email" },
          { name: "why_interested", value: "I am excited about this role because...", type: "textarea" }
        ],
        metadata: {
          pageTitle: "Senior Software Engineer - TechCorp Careers",
          pageType: "application_form"
        },
        notes: "Applied via extension with AI-generated responses"
      },
      applied_at: "2024-01-15T10:30:00Z",
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-15T10:30:00Z",
      
      // Transform to frontend-compatible format
      jobInfo: {
        title: "Senior Software Engineer",
        company: "TechCorp Inc.",
        location: "San Francisco, CA",
        description: "We are looking for a senior software engineer...",
        requirements: ["React", "Node.js", "TypeScript"],
        salary: "$120,000 - $150,000"
      },
      applicationData: {
        url: "https://techcorp.com/careers/senior-engineer",
        status: "submitted",
        appliedAt: "2024-01-15T10:30:00Z",
        applicationMethod: "chrome_extension",
        cvGenerated: true,
        coverLetterGenerated: true,
        formFieldsCount: 12,
        aiResponsesCount: 3,
        notes: "Applied via extension with AI-generated responses"
      },
      metadata: {
        pageTitle: "Senior Software Engineer - TechCorp Careers",
        pageType: "application_form",
        timestamp: "2024-01-15T10:30:00Z"
      }
    },
    {
      id: "app-2",
      workflow_id: null, // Manual application without workflow
      user_id: userId,
      job_id: "job-2",
      job_url: "https://startupxyz.com/jobs/frontend-dev",
      job_title: "Frontend Developer",
      company_name: "StartupXYZ",
      application_status: "interview",
      application_data: {
        applicationMethod: "manual",
        cvGenerated: false,
        coverLetterGenerated: false,
        formFieldsCount: 8,
        aiResponsesCount: 0,
        jobInfo: {
          location: "Remote",
          description: "Join our team as a frontend developer...",
          requirements: ["React", "CSS", "JavaScript"],
          salary: "$80,000 - $100,000"
        },
        metadata: {
          pageTitle: "Frontend Developer - StartupXYZ Careers",
          pageType: "job_listing"
        },
        notes: "Manual application, interview scheduled for next week"
      },
      applied_at: "2024-01-10T14:20:00Z",
      created_at: "2024-01-10T14:20:00Z",
      updated_at: "2024-01-12T09:15:00Z",
      
      // Transform to frontend-compatible format
      jobInfo: {
        title: "Frontend Developer",
        company: "StartupXYZ",
        location: "Remote",
        description: "Join our team as a frontend developer...",
        requirements: ["React", "CSS", "JavaScript"],
        salary: "$80,000 - $100,000"
      },
      applicationData: {
        url: "https://startupxyz.com/jobs/frontend-dev",
        status: "interview",
        appliedAt: "2024-01-10T14:20:00Z",
        applicationMethod: "manual",
        cvGenerated: false,
        coverLetterGenerated: false,
        formFieldsCount: 8,
        aiResponsesCount: 0,
        notes: "Manual application, interview scheduled for next week"
      },
      metadata: {
        pageTitle: "Frontend Developer - StartupXYZ Careers",
        pageType: "job_listing",
        timestamp: "2024-01-10T14:20:00Z"
      }
    },
    {
      id: "app-3",
      workflow_id: "workflow-2",
      user_id: userId,
      job_id: "job-3",
      job_url: "https://innovatetech.com/careers/fullstack",
      job_title: "Full Stack Engineer",
      company_name: "InnovateTech",
      application_status: "submitted",
      application_data: {
        applicationMethod: "chrome_extension",
        cvGenerated: true,
        coverLetterGenerated: true,
        formFieldsCount: 15,
        aiResponsesCount: 5,
        jobInfo: {
          location: "New York, NY",
          description: "Looking for a full stack engineer with experience in React and Python...",
          requirements: ["React", "Python", "PostgreSQL", "AWS"],
          salary: "$110,000 - $140,000"
        },
        metadata: {
          pageTitle: "Full Stack Engineer - InnovateTech",
          pageType: "application_form"
        },
        notes: "Applied with personalized CV and cover letter"
      },
      applied_at: "2024-01-20T16:45:00Z",
      created_at: "2024-01-20T16:45:00Z",
      updated_at: "2024-01-20T16:45:00Z",
      
      // Transform to frontend-compatible format
      jobInfo: {
        title: "Full Stack Engineer",
        company: "InnovateTech",
        location: "New York, NY",
        description: "Looking for a full stack engineer with experience in React and Python...",
        requirements: ["React", "Python", "PostgreSQL", "AWS"],
        salary: "$110,000 - $140,000"
      },
      applicationData: {
        url: "https://innovatetech.com/careers/fullstack",
        status: "submitted",
        appliedAt: "2024-01-20T16:45:00Z",
        applicationMethod: "chrome_extension",
        cvGenerated: true,
        coverLetterGenerated: true,
        formFieldsCount: 15,
        aiResponsesCount: 5,
        notes: "Applied with personalized CV and cover letter"
      },
      metadata: {
        pageTitle: "Full Stack Engineer - InnovateTech",
        pageType: "application_form",
        timestamp: "2024-01-20T16:45:00Z"
      }
    }
  ];
}

async function createApplication({
  userId,
  jobId,
  status,
  notes
}: {
  userId: string;
  jobId: string;
  status: string;
  notes: string;
}) {
  // Legacy application creation (keeping for backward compatibility)
  return {
    id: `app-${Date.now()}`,
    userId,
    jobId,
    status,
    notes,
    createdAt: new Date().toISOString()
  };
}

async function createSupabaseApplication({
  userId,
  jobInfo,
  applicationData,
  metadata
}: {
  userId: string;
  jobInfo: any;
  applicationData: any;
  metadata: any;
}) {
  console.log('🔧 Starting createSupabaseApplication with:', {
    userId,
    jobInfoTitle: jobInfo?.title,
    applicationDataStatus: applicationData?.status
  });
  
  try {
    // Create or get default workflow for extension applications
    console.log('📋 Getting or creating default workflow...');
    const defaultWorkflowId = await getOrCreateDefaultWorkflow(userId);
    console.log('✅ Default workflow ID:', defaultWorkflowId);
    
    // Map extension data to Supabase job_applications schema
    const supabaseApplication = {
      workflow_id: defaultWorkflowId, 
      user_id: userId,
      job_id: `job-${Date.now()}`, // Generate job ID
      job_url: applicationData.url,
      job_title: jobInfo.title || jobInfo.jobTitle,
      company_name: jobInfo.company,
      application_status: applicationData.status,
      application_data: {
        // Store all extension-specific data here
        applicationMethod: applicationData.applicationMethod,
        cvGenerated: applicationData.cvGenerated,
        coverLetterGenerated: applicationData.coverLetterGenerated,
        formFieldsCount: applicationData.formFieldsCount || 0,
        aiResponsesCount: applicationData.aiResponsesCount || 0,
        jobInfo: {
          location: jobInfo.location,
          description: jobInfo.description,
          requirements: jobInfo.requirements || [],
          salary: jobInfo.salary
        },
        formData: applicationData.formData,
        documentsData: {
          cvContent: applicationData.cvContent,
          coverLetterContent: applicationData.coverLetterContent
        },
        sessionData: applicationData.sessionData || {},
        metadata: {
          pageTitle: metadata.pageTitle,
          pageType: metadata.pageType,
          userAgent: metadata.userAgent,
          timestamp: metadata.timestamp
        },
        notes: applicationData.notes || ''
      },
      applied_at: applicationData.appliedAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📊 Prepared application data:', JSON.stringify(supabaseApplication, null, 2));

    console.log('💾 Inserting into Supabase...');
    const { data, error } = await supabaseAdmin
      .from('job_applications')
      .insert(supabaseApplication)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase insert error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      throw error;
    }

    console.log('✅ Supabase application inserted successfully:', data.id);
    
    // Return the actual Supabase data in format expected by frontend
    return {
      id: data.id,
      userId: data.user_id,
      jobInfo: {
        title: data.job_title,
        company: data.company_name,
        location: data.application_data?.jobInfo?.location,
        description: data.application_data?.jobInfo?.description,
        requirements: data.application_data?.jobInfo?.requirements || [],
        salary: data.application_data?.jobInfo?.salary
      },
      applicationData: {
        url: data.job_url,
        status: data.application_status,
        appliedAt: data.applied_at,
        applicationMethod: data.application_data?.applicationMethod,
        cvGenerated: data.application_data?.cvGenerated,
        coverLetterGenerated: data.application_data?.coverLetterGenerated,
        formFieldsCount: data.application_data?.formFieldsCount || 0,
        aiResponsesCount: data.application_data?.aiResponsesCount || 0,
        notes: data.application_data?.notes || ''
      },
      documents: {
        cvContent: data.application_data?.documentsData?.cvContent,
        coverLetterContent: data.application_data?.documentsData?.coverLetterContent
      },
      metadata: {
        pageTitle: data.application_data?.metadata?.pageTitle,
        pageType: data.application_data?.metadata?.pageType,
        userAgent: data.application_data?.metadata?.userAgent,
        timestamp: data.application_data?.metadata?.timestamp
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
  } catch (applicationError) {
    console.error('❌ Error in createSupabaseApplication:', applicationError);
    throw applicationError;
  }
} 
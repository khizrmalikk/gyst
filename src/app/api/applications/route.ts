import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Fetch user's applications from Supabase
    const applications = await getUserApplications(userId);
    
    return NextResponse.json({
      success: true,
      applications
    });
    
  } catch (error) {
    console.error("Applications fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Skip auth for extension requests (for now)
    const extensionRequest = request.headers.get('user-agent')?.includes('Chrome');
    let userId = 'extension-user'; // Default for extension
    
    if (!extensionRequest) {
      const authResult = await auth();
      if (!authResult.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = authResult.userId;
    }

    const body = await request.json();
    
    // Handle comprehensive extension application - map to existing schema
    if (body.jobInfo || (body.jobTitle && body.company)) {
      const application = await createSupabaseApplication({
        userId,
        jobInfo: body.jobInfo || {
          title: body.jobTitle,
          company: body.company,
          location: body.location,
          description: body.description,
          requirements: body.requirements,
          salary: body.salary
        },
        applicationData: {
          url: body.url,
          status: body.status || 'submitted',
          appliedAt: body.appliedAt || new Date().toISOString(),
          applicationMethod: body.applicationMethod || 'chrome_extension',
          cvGenerated: body.cvGenerated || false,
          coverLetterGenerated: body.coverLetterGenerated || false,
          cvContent: body.cvContent,
          coverLetterContent: body.coverLetterContent,
          formData: body.formData,
          formFieldsCount: body.formFieldsCount,
          aiResponsesCount: body.aiResponsesCount,
          notes: body.notes
        },
        metadata: {
          pageTitle: body.pageTitle,
          pageType: body.pageType,
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString()
        }
      });
      
      return NextResponse.json({
        success: true,
        application
      });
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
  // TODO: Replace with actual Supabase insert
  const applicationId = `app-${Date.now()}`;
  
  // Create or get default workflow for extension applications
  const defaultWorkflowId = await getOrCreateDefaultWorkflow(userId);
  
  // Map extension data to Supabase job_applications schema
  const supabaseApplication = {
    id: applicationId,
    workflow_id: defaultWorkflowId, // Required by schema
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

  // TODO: Insert into Supabase
  // const { data, error } = await supabase
  //   .from('job_applications')
  //   .insert(supabaseApplication)
  //   .select()
  //   .single();
  
  console.log('Creating Supabase application:', supabaseApplication);
  
  // Return in format expected by frontend
  return {
    id: applicationId,
    userId,
    jobInfo: {
      title: jobInfo.title || jobInfo.jobTitle,
      company: jobInfo.company,
      location: jobInfo.location,
      description: jobInfo.description,
      requirements: jobInfo.requirements || [],
      salary: jobInfo.salary
    },
    applicationData: {
      url: applicationData.url,
      status: applicationData.status,
      appliedAt: applicationData.appliedAt,
      applicationMethod: applicationData.applicationMethod,
      cvGenerated: applicationData.cvGenerated,
      coverLetterGenerated: applicationData.coverLetterGenerated,
      formFieldsCount: applicationData.formFieldsCount || 0,
      aiResponsesCount: applicationData.aiResponsesCount || 0,
      notes: applicationData.notes || ''
    },
    documents: {
      cvContent: applicationData.cvContent,
      coverLetterContent: applicationData.coverLetterContent
    },
    metadata: {
      pageTitle: metadata.pageTitle,
      pageType: metadata.pageType,
      userAgent: metadata.userAgent,
      timestamp: metadata.timestamp
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function getOrCreateDefaultWorkflow(userId: string) {
  // TODO: Check if default extension workflow exists, create if not
  // For now, return a placeholder workflow ID
  return `extension-workflow-${userId}`;
  
  /* TODO: Implement with Supabase
  const { data: existingWorkflow, error } = await supabase
    .from('workflows')
    .select('id')
    .eq('user_id', userId)
    .eq('search_query', 'Extension Applications')
    .single();

  if (existingWorkflow) {
    return existingWorkflow.id;
  }

  const { data: newWorkflow, error: createError } = await supabase
    .from('workflows')
    .insert({
      user_id: userId,
      search_query: 'Extension Applications',
      status: 'active'
    })
    .select('id')
    .single();

  return newWorkflow.id;
  */
} 
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSmartLLMService } from '../../../../lib/llm';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper authentication for Chrome extension
    const userId = 'extension-user';

    const { url, jobInfo, formFields, userProfile } = await request.json();

    if (!url || !jobInfo || !formFields) {
      return NextResponse.json(
        { error: 'URL, job info, and form fields are required' },
        { status: 400 }
      );
    }

    // Check AI availability
    const llmResult = await getSmartLLMService();
    
    if (!llmResult.available) {
      return NextResponse.json({
        success: false,
        error: 'AI features are temporarily unavailable',
        message: llmResult.message
      }, { status: 503 });
    }

    // Generate documents and form data
    const result = await generateApplicationData(
      url,
      jobInfo,
      formFields,
      userProfile || {},
      llmResult.service!
    );

    // Track the application
    await trackApplication(userId, url, jobInfo, result);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Extension fill error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateApplicationData(
  url: string,
  jobInfo: any,
  formFields: any[],
  userProfile: any,
  llmService: any
) {
  try {
    // Generate custom CV
    const cv = await generateCustomCV(jobInfo, userProfile, llmService);
    
    // Generate cover letter
    const coverLetter = await generateCoverLetter(jobInfo, userProfile, llmService);
    
    // Generate form field mappings
    const formData = await generateFormData(formFields, userProfile, llmService);

    return {
      cv,
      coverLetter,
      formData,
      documents: {
        cvGenerated: true,
        coverLetterGenerated: true
      }
    };

  } catch (error) {
    console.error('Application data generation error:', error);
    throw error;
  }
}

async function generateCustomCV(jobInfo: any, userProfile: any, llmService: any) {
  try {
    const cv = await llmService.generateChatResponse({
      userMessage: `Generate a custom CV for this job application:\n\nJob: ${jobInfo.title} at ${jobInfo.company}\nRequirements: ${jobInfo.requirements?.join(', ')}\nUser Profile: ${JSON.stringify(userProfile)}`,
      conversationHistory: [],
      context: {
        instruction: 'Generate a tailored CV that highlights relevant experience and skills for this specific job. Return as formatted text.'
      }
    });

    return {
      content: cv.response,
      filename: `CV_${jobInfo.company}_${jobInfo.title}.txt`.replace(/[^a-zA-Z0-9]/g, '_'),
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('CV generation error:', error);
    return {
      content: `${userProfile.name || 'Applicant'}\n\nExperience: ${userProfile.experience || 'Not specified'}\nSkills: ${userProfile.skills?.join(', ') || 'Not specified'}`,
      filename: `CV_${jobInfo.company}_${jobInfo.title}.txt`.replace(/[^a-zA-Z0-9]/g, '_'),
      generatedAt: new Date().toISOString()
    };
  }
}

async function generateCoverLetter(jobInfo: any, userProfile: any, llmService: any) {
  try {
    const coverLetter = await llmService.generateCoverLetter({
      jobDescription: jobInfo,
      userProfile,
      tone: 'professional'
    });

    return {
      content: coverLetter.content || coverLetter,
      filename: `CoverLetter_${jobInfo.company}_${jobInfo.title}.txt`.replace(/[^a-zA-Z0-9]/g, '_'),
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Cover letter generation error:', error);
    return {
      content: `Dear ${jobInfo.company} Hiring Manager,\n\nI am writing to express my interest in the ${jobInfo.title} position at ${jobInfo.company}.\n\nBest regards,\n${userProfile.name || 'Applicant'}`,
      filename: `CoverLetter_${jobInfo.company}_${jobInfo.title}.txt`.replace(/[^a-zA-Z0-9]/g, '_'),
      generatedAt: new Date().toISOString()
    };
  }
}

async function generateFormData(formFields: any[], userProfile: any, llmService: any) {
  const formData: any = {};

  formFields.forEach(field => {
    switch (field.name.toLowerCase()) {
      case 'name':
      case 'full_name':
      case 'first_name':
        formData[field.name] = userProfile.name || '';
        break;
      case 'email':
        formData[field.name] = userProfile.email || '';
        break;
      case 'phone':
      case 'phone_number':
        formData[field.name] = userProfile.phone || '';
        break;
      case 'location':
      case 'address':
        formData[field.name] = userProfile.location || '';
        break;
      case 'experience':
      case 'work_experience':
        formData[field.name] = userProfile.experience || '';
        break;
      case 'skills':
        formData[field.name] = userProfile.skills?.join(', ') || '';
        break;
      case 'summary':
      case 'about':
        formData[field.name] = userProfile.summary || '';
        break;
      case 'education':
        formData[field.name] = userProfile.education ? 
          `${userProfile.education.degree} from ${userProfile.education.school} (${userProfile.education.year})` : '';
        break;
      case 'cover_letter':
        formData[field.name] = 'Generated cover letter will be provided separately';
        break;
      default:
        formData[field.name] = '';
    }
  });

  return formData;
}

async function trackApplication(userId: string, url: string, jobInfo: any, result: any) {
  try {
    // Create application record (integrate with existing applications API)
    const applicationData = {
      userId,
      jobUrl: url,
      jobTitle: jobInfo.title,
      company: jobInfo.company,
      location: jobInfo.location,
      salary: jobInfo.salary,
      status: 'applied',
      appliedAt: new Date().toISOString(),
      applicationMethod: 'chrome_extension',
      documents: {
        cvGenerated: result.documents?.cvGenerated || false,
        coverLetterGenerated: result.documents?.coverLetterGenerated || false
      }
    };

    // TODO: Save to database
    console.log('Tracking application:', applicationData);

    return applicationData;

  } catch (error) {
    console.error('Application tracking error:', error);
    // Don't throw here - tracking failure shouldn't break the main flow
  }
} 
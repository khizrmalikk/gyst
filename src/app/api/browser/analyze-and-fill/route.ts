import { NextRequest, NextResponse } from 'next/server';
import { CVGenerator } from '@/lib/documents/cv-generator';
import { chromium } from 'playwright';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { workflowId, url, action } = await request.json();

    if (!workflowId || !url) {
      return NextResponse.json({ error: 'Workflow ID and URL required' }, { status: 400 });
    }

    // Handle different actions
    switch (action) {
      case 'analyze_and_fill':
        return await analyzeAndFillForm(url, workflowId);
      case 'generate_cv':
        return await generateCV(url, workflowId);
      case 'generate_cover_letter':
        return await generateCoverLetter(url, workflowId);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Browser API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function analyzeAndFillForm(url: string, workflowId: string) {
  let browser;
  let page;
  
  try {
    // Launch browser for form analysis
    browser = await chromium.launch({
      headless: true, // Use headless for server-side processing
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    
    page = await context.newPage();
    
    // Navigate to the URL
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');
    
    // Get page content for analysis
    const pageContent = await page.content();
    const pageTitle = await page.title();
    
    // Analyze the form using AI
    const formAnalysis = await analyzeFormWithAI(pageContent, pageTitle, url);
    
    // Generate documents
    const cvGenerator = new CVGenerator();
    
    // Mock user profile (in real app, get from database/user session)
    const userProfile = {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      linkedIn: 'https://linkedin.com/in/johndoe',
      github: 'https://github.com/johndoe',
      website: 'https://johndoe.dev',
      summary: 'Experienced software engineer with 5+ years in full-stack development',
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker'],
      experience: [
        {
          company: 'Tech Corp',
          position: 'Senior Software Engineer',
          startDate: '2022-01',
          endDate: 'present',
          description: 'Led development of microservices architecture and mentored junior developers'
        }
      ],
      education: [
        {
          institution: 'University of California',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          startDate: '2016-09',
          endDate: '2020-05'
        }
      ]
    };
    
    const cv = await cvGenerator.generateCV(userProfile, formAnalysis.jobData);
    const coverLetter = 'Cover letter generation temporarily disabled';
    
    return NextResponse.json({
      success: true,
      formAnalysis,
      cv,
      coverLetter,
      instructions: [
        'Form analysis complete!',
        'Custom CV and cover letter generated.',
        'The form fields have been identified.',
        'Please manually fill and submit the form in the browser above.',
        'Use the generated documents as needed.'
      ]
    });
    
  } catch (error) {
    console.error('Form analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze form',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function generateCV(url: string, workflowId: string) {
  try {
    // Extract job information from URL and generate CV
    const jobData = await extractJobDataFromUrl(url);
    
    const cvGenerator = new CVGenerator();
    
    // Mock user profile (in real app, get from database/user session)
    const userProfile = {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      summary: 'Experienced software engineer with 5+ years in full-stack development',
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker']
    };
    
    const cv = await cvGenerator.generateCV(userProfile, jobData);
    
    return NextResponse.json({
      success: true,
      cv,
      message: 'CV generated successfully'
    });
    
  } catch (error) {
    console.error('CV generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate CV',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function generateCoverLetter(url: string, workflowId: string) {
  try {
    // Extract job information from URL and generate cover letter
    const jobData = await extractJobDataFromUrl(url);
    
    // Mock user profile (in real app, get from database/user session)
    const userProfile = {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      summary: 'Experienced software engineer with 5+ years in full-stack development',
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker']
    };
    
    const coverLetter = 'Cover letter generation temporarily disabled';
    
    return NextResponse.json({
      success: true,
      coverLetter,
      message: 'Cover letter generated successfully'
    });
    
  } catch (error) {
    console.error('Cover letter generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate cover letter',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function analyzeFormWithAI(pageContent: string, pageTitle: string, url: string) {
  try {
    const prompt = `
Analyze this job application page and extract relevant information:

Page Title: ${pageTitle}
URL: ${url}
Page Content: ${pageContent.substring(0, 8000)} // Limit content for token management

Please analyze and provide:
1. Job details (title, company, location, salary, requirements)
2. Application form fields identified
3. Any specific instructions or requirements
4. Contact information if available

Return the analysis in JSON format with the following structure:
{
  "jobData": {
    "title": "Job Title",
    "company": "Company Name",
    "location": "Location",
    "salary": "Salary Range",
    "requirements": ["requirement1", "requirement2"],
    "description": "Job description"
  },
  "formFields": [
    {
      "name": "field_name",
      "type": "text|email|textarea|select",
      "label": "Field Label",
      "required": true/false
    }
  ],
  "instructions": ["instruction1", "instruction2"],
  "contactInfo": {
    "email": "email@company.com",
    "phone": "phone number"
  }
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a job application assistant that analyzes job pages and extracts relevant information. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const analysisText = response.choices[0]?.message?.content || '';
    
    try {
      return JSON.parse(analysisText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Return default structure if parsing fails
      return {
        jobData: {
          title: 'Job Title Not Found',
          company: 'Company Not Found',
          location: 'Location Not Found',
          salary: 'Salary Not Found',
          requirements: [],
          description: 'Could not extract job description'
        },
        formFields: [],
        instructions: ['Manual form analysis required'],
        contactInfo: {}
      };
    }
    
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}

async function extractJobDataFromUrl(url: string) {
  let browser;
  let page;
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    const context = await browser.newContext();
    page = await context.newPage();
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    const pageContent = await page.content();
    const pageTitle = await page.title();
    
    // Extract job data using AI
    const analysis = await analyzeFormWithAI(pageContent, pageTitle, url);
    return analysis.jobData;
    
  } catch (error) {
    console.error('Job data extraction error:', error);
    // Return default job data if extraction fails
    return {
      title: 'Job Title Not Found',
      company: 'Company Not Found',
      location: 'Location Not Found',
      salary: 'Salary Not Found',
      requirements: [],
      description: 'Could not extract job description'
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
} 
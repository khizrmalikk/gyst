import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PDFGenerator } from '../../../../lib/pdf-generator';
import { getSmartLLMService } from '../../../../lib/llm';

export async function POST(request: NextRequest) {
  try {
    // REQUIRE authentication for ALL requests - no bypasses for security
    const { userId } = await auth();
    if (!userId) {
      console.log('❌ Cover letter generation request - authentication required');
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          message: 'Please log in to your account to generate documents.',
          requiresAuth: true 
        },
        { status: 401 }
      );
    }
    
    console.log('✅ Cover letter generation request authenticated for user:', userId);

    const { jobInfo, userProfile } = await request.json();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile is required' },
        { status: 400 }
      );
    }

    // Validate required profile fields
    if (!userProfile.name) {
      return NextResponse.json(
        { error: 'User profile name is required' },
        { status: 400 }
      );
    }

    console.log('📝 Generating Cover Letter for:', userProfile.name);
    if (jobInfo?.company) {
      console.log('🏢 Target company:', jobInfo.company);
    } else {
      console.log('🌐 General Cover Letter (no specific company)');
    }

    // Check AI availability
    const llmResult = await getSmartLLMService();
    
    if (!llmResult.available) {
      console.log('⚠️ AI service unavailable, using fallback cover letter generation');
      // Generate fallback cover letter when AI is not available
      const fallbackCoverLetterContent = generateFallbackCoverLetter(userProfile, jobInfo || {});
      
      // Generate PDF with fallback content
      const pdfGenerator = new PDFGenerator({
        title: `Cover Letter - ${userProfile.name}`,
        author: userProfile.name,
        subject: `Cover Letter${jobInfo?.company ? ` for ${jobInfo.company}` : ''}`
      });

      const pdfBuffer = pdfGenerator.generateCoverLetter(fallbackCoverLetterContent, jobInfo || {}, userProfile);
      
      // Generate filename: profileName-companyName-CoverLetter.pdf or profileName-CoverLetter.pdf
      const sanitizeName = (name: string): string => name.replace(/[^a-zA-Z0-9]/g, '');
      const profileName = sanitizeName(userProfile.name);
      const companyPart = jobInfo?.company ? `${sanitizeName(jobInfo.company)}-` : '';
      const filename = `${profileName}-${companyPart}CoverLetter.pdf`;

      console.log('✅ Fallback Cover Letter generated successfully:', filename);

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });
    }

    // Generate custom cover letter content with AI
    let coverLetterContent: string;
    try {
      coverLetterContent = await generateCustomCoverLetterContent(jobInfo || {}, userProfile, llmResult.service);
    } catch (error) {
      console.error('⚠️ AI cover letter generation failed, using fallback:', error);
      coverLetterContent = generateFallbackCoverLetter(userProfile, jobInfo || {});
    }
    
    // Generate PDF
    const pdfGenerator = new PDFGenerator({
      title: `Cover Letter - ${userProfile.name}`,
      author: userProfile.name,
      subject: `Cover Letter${jobInfo?.company ? ` for ${jobInfo.company}` : ''}`
    });

    const pdfBuffer = pdfGenerator.generateCoverLetter(coverLetterContent, jobInfo || {}, userProfile);
    
    // Generate filename: profileName-companyName-CoverLetter.pdf or profileName-CoverLetter.pdf
    const sanitizeName = (name: string): string => name.replace(/[^a-zA-Z0-9]/g, '');
    const profileName = sanitizeName(userProfile.name);
    const companyPart = jobInfo?.company ? `${sanitizeName(jobInfo.company)}-` : '';
    const filename = `${profileName}-${companyPart}CoverLetter.pdf`;

    console.log('✅ Cover Letter generated successfully:', filename);

    // Return PDF file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Cover Letter generation failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate cover letter',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function generateCustomCoverLetterContent(jobInfo: any, userProfile: any, llmService: any): Promise<string> {
  try {
    const jobTitle = jobInfo.title || jobInfo.jobTitle || 'this position';
    const companyName = jobInfo.company || 'your company';
    const jobRequirements = jobInfo.requirements?.join(', ') || jobInfo.description || 'the role requirements';
    
    const prompt = `Generate a professional cover letter tailored for this job application:

Job Title: ${jobTitle}
Company: ${companyName}
Location: ${jobInfo.location || 'Not specified'}
Job Requirements: ${jobRequirements}

Candidate Profile:
Name: ${userProfile.name}
Email: ${userProfile.email || 'Not provided'}
Experience: ${userProfile.experience || 'Not provided'}
Skills: ${userProfile.skills?.join(', ') || 'Not provided'}
Summary: ${userProfile.summary || 'Not provided'}

Work History: ${userProfile.workHistory?.map((work: any) => 
  `${work.title} at ${work.company} (${work.duration}) - ${work.description}`
).join('\n') || 'Not specified'}

Please generate a professional cover letter that:
1. Addresses the hiring manager professionally
2. Expresses genuine interest in the role and company
3. Highlights relevant experience and skills that match the job requirements
4. Shows enthusiasm and cultural fit
5. Includes a professional closing
6. Keeps it concise (3-4 paragraphs)
7. Works as a general cover letter if no specific job info is provided

Return only the cover letter content, no additional formatting or explanations.`;

    const coverLetter = await llmService.generateChatResponse({
      userMessage: prompt,
      conversationHistory: [],
      context: {
        instruction: 'Generate a tailored professional cover letter that shows enthusiasm and highlights relevant qualifications. Return as clean, formatted text suitable for PDF generation.'
      }
    });

    return coverLetter.response || coverLetter.content || coverLetter;

  } catch (error) {
    console.error('Cover letter content generation error:', error);
    // Return fallback cover letter content
    return generateFallbackCoverLetter(userProfile, jobInfo);
  }
}

function generateFallbackCoverLetter(userProfile: any, jobInfo: any): string {
  const date = new Date().toLocaleDateString();
  const jobTitle = jobInfo?.title || jobInfo?.jobTitle || 'the position';
  const companyName = jobInfo?.company || 'your company';
  
  return `${date}

Dear Hiring Manager,

I am writing to express my strong interest in the ${jobTitle} position at ${companyName}. With my background in ${userProfile.experience || 'relevant experience'} and skills in ${userProfile.skills?.slice(0, 3).join(', ') || 'various technologies'}, I am confident I would be a valuable addition to your team.

${userProfile.summary || 'I bring a diverse skill set and strong problem-solving abilities to every project I work on.'} My experience has prepared me to tackle the challenges of this role and contribute to your organization's continued success.

I am particularly drawn to ${companyName} because of its reputation and commitment to excellence. I would welcome the opportunity to discuss how my background and enthusiasm can contribute to your team.

Thank you for your time and consideration. I look forward to hearing from you.

Sincerely,
${userProfile.name}`;
} 
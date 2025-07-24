import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PDFGenerator } from '../../../../lib/pdf-generator';
import { getSmartLLMService } from '../../../../lib/llm';

export async function POST(request: NextRequest) {
  try {
    // REQUIRE authentication for ALL requests - no bypasses for security
    const { userId } = await auth();
    if (!userId) {
      console.log('❌ CV generation request - authentication required');
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          message: 'Please log in to your account to generate documents.',
          requiresAuth: true 
        },
        { status: 401 }
      );
    }
    
    console.log('✅ CV generation request authenticated for user:', userId);

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

    console.log('📄 Generating CV for:', userProfile.name);
    if (jobInfo?.company) {
      console.log('🏢 Target company:', jobInfo.company);
    } else {
      console.log('🌐 General CV (no specific company)');
    }

    // Check AI availability
    const llmResult = await getSmartLLMService();
    
    if (!llmResult.available) {
      console.log('⚠️ AI service unavailable, using fallback CV generation');
      // Generate fallback CV when AI is not available
      const fallbackCvContent = generateFallbackCV(userProfile, jobInfo || {});
      
      // Generate PDF with fallback content
      const pdfGenerator = new PDFGenerator({
        title: `CV - ${userProfile.name}`,
        author: userProfile.name,
        subject: `CV${jobInfo?.company ? ` for ${jobInfo.company}` : ''}`
      });

      const pdfBuffer = pdfGenerator.generateCV(fallbackCvContent, userProfile);
      
      // Generate filename: profileName-companyName.pdf or profileName-CV.pdf
      const sanitizeName = (name: string): string => name.replace(/[^a-zA-Z0-9]/g, '');
      const profileName = sanitizeName(userProfile.name);
      const companyPart = jobInfo?.company ? sanitizeName(jobInfo.company) : 'CV';
      const filename = `${profileName}-${companyPart}.pdf`;

      console.log('✅ Fallback CV generated successfully:', filename);

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });
    }

    // Generate custom CV content with AI
    let cvContent: string;
    try {
      cvContent = await generateCustomCVContent(jobInfo || {}, userProfile, llmResult.service);
    } catch (error) {
      console.error('⚠️ AI CV generation failed, using fallback:', error);
      cvContent = generateFallbackCV(userProfile, jobInfo || {});
    }
    
    // Generate PDF
    const pdfGenerator = new PDFGenerator({
      title: `CV - ${userProfile.name}`,
      author: userProfile.name,
      subject: `CV${jobInfo?.company ? ` for ${jobInfo.company}` : ''}`
    });

    const pdfBuffer = pdfGenerator.generateCV(cvContent, userProfile);
    
    // Generate filename: profileName-companyName.pdf or profileName-CV.pdf
    const sanitizeName = (name: string): string => name.replace(/[^a-zA-Z0-9]/g, '');
    const profileName = sanitizeName(userProfile.name);
    const companyPart = jobInfo?.company ? sanitizeName(jobInfo.company) : 'CV';
    const filename = `${profileName}-${companyPart}.pdf`;

    console.log('✅ CV generated successfully:', filename);

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
    console.error('❌ CV generation failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate CV',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function generateCustomCVContent(jobInfo: any, userProfile: any, llmService: any): Promise<string> {
  try {
    // Use the proper generateCV method instead of generateChatResponse
    const cvContent = await llmService.generateCV({
      jobDescription: {
        title: jobInfo.title || jobInfo.jobTitle,
        company: jobInfo.company,
        location: jobInfo.location,
        description: jobInfo.description,
        requirements: jobInfo.requirements || []
      },
      userProfile: {
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        location: userProfile.location,
        experience: userProfile.experience,
        skills: userProfile.skills || [],
        summary: userProfile.summary,
        education: userProfile.education,
        workHistory: userProfile.workHistory || []
      }
    });

    return cvContent;

  } catch (error) {
    console.error('CV content generation error:', error);
    // Return fallback CV content
    return generateFallbackCV(userProfile, jobInfo);
  }
}

function generateFallbackCV(userProfile: any, jobInfo: any): string {
  const sections = [];
  
  // Professional Summary (always include) with proper header
  const summary = userProfile.summary || 'Experienced professional with strong problem-solving skills and dedication to excellence. Committed to delivering high-quality results and contributing to team success.';
  sections.push(`PROFESSIONAL SUMMARY\n\n${summary}\n\n`);
  
  // Skills (only if we have real skills data) with proper header
  if (userProfile.skills && userProfile.skills.length > 0 && !userProfile.skills.includes('Please add skills to your profile')) {
    sections.push(`KEY SKILLS\n\n${userProfile.skills.join(' • ')}\n\n`);
  }
  
  // Work History - Complete section (only if we have real work data) with proper header
  if (userProfile.workHistory && userProfile.workHistory.length > 0 && 
      !userProfile.workHistory[0].title.includes('Please add work experience')) {
    sections.push('WORK EXPERIENCE\n\n');
    userProfile.workHistory.forEach((work: any, index: number) => {
      sections.push(`${work.title}\n`);
      sections.push(`${work.company}`);
      if (work.location && work.location !== 'Location not specified') {
        sections.push(` | ${work.location}`);
      }
      sections.push(` | ${work.duration}\n`);
      sections.push(`${work.description}\n`);
      
      // Add skills if available
      if (work.skills && work.skills.length > 0) {
        sections.push(`Skills Used: ${work.skills.join(', ')}\n`);
      }
      
      // Add space between positions (but not after the last one)
      if (index < userProfile.workHistory.length - 1) {
        sections.push('\n');
      }
    });
    sections.push('\n');
  }
  
  // Education (only if we have real education data) with proper header
  if (userProfile.education && userProfile.education.degree && 
      !userProfile.education.degree.includes('Please add education to your profile')) {
    sections.push('EDUCATION\n\n');
    sections.push(`${userProfile.education.degree}`);
    if (userProfile.education.field && userProfile.education.field !== 'Field not specified') {
      sections.push(` in ${userProfile.education.field}`);
    }
    sections.push('\n');
    sections.push(`${userProfile.education.school || 'University'} | ${userProfile.education.year || '2020'}\n\n`);
    if (userProfile.education.gpa) {
      sections.push(`GPA: ${userProfile.education.gpa}\n`);
    }
  }
  
  // Only add additional sections if we have real data (not placeholders) with proper headers
  if (userProfile.certifications && userProfile.certifications.length > 0) {
    sections.push('CERTIFICATIONS\n\n');
    userProfile.certifications.forEach((cert: any) => {
      sections.push(`${cert.name || cert}\n`);
      if (cert.issuer) sections.push(`${cert.issuer} | ${cert.issue_date || cert.year || 'Current'}\n`);
    });
    sections.push('\n');
  }
  
  if (userProfile.languages && userProfile.languages.length > 0) {
    sections.push('LANGUAGES\n\n');
    const languageList = userProfile.languages.map((lang: any) => 
      typeof lang === 'string' ? lang : `${lang.language} (${lang.proficiency})`
    ).join(', ');
    sections.push(`${languageList}\n\n`);
  }
  
  // Add professional links only if they exist with proper header
  const hasLinks = userProfile.linkedIn || userProfile.portfolio || userProfile.website;
  if (hasLinks) {
    sections.push('PROFESSIONAL LINKS\n\n');
    if (userProfile.linkedIn) sections.push(`LinkedIn: ${userProfile.linkedIn}\n`);
    if (userProfile.portfolio) sections.push(`Portfolio: ${userProfile.portfolio}\n`);
    if (userProfile.website) sections.push(`Website: ${userProfile.website}\n`);
  }
  
  return sections.join('');
} 
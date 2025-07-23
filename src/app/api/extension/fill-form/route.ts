import { NextRequest, NextResponse } from 'next/server';
import { getSmartLLMService } from '../../../../lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { jobInfo, userProfile, formFields } = await request.json();

    console.log('📋 Form fill request received:', {
      hasJobInfo: !!jobInfo,
      hasUserProfile: !!userProfile,
      formFieldsCount: formFields?.length || 0,
      profileType: userProfile?.id ? 'base' : 'tailored',
      profileStructure: {
        hasName: !!userProfile?.name,
        hasEmail: !!userProfile?.email,
        hasSkills: !!(userProfile?.skills?.length > 0),
        hasWorkHistory: !!(userProfile?.workHistory?.length > 0)
      }
    });

    if (!jobInfo || !userProfile || !formFields) {
      console.error('❌ Missing required fields:', {
        jobInfo: !!jobInfo,
        userProfile: !!userProfile, 
        formFields: !!formFields
      });
      return NextResponse.json(
        { error: 'Job info, user profile, and form fields are required' },
        { status: 400 }
      );
    }

    if (formFields.length === 0) {
      console.log('⚠️ No form fields provided');
      return NextResponse.json(
        { error: 'No form fields to fill' },
        { status: 400 }
      );
    }

    console.log('📝 Processing form fields:', formFields.map((f: { name: string; type: string; label: string }) => ({
      name: f.name,
      type: f.type,
      label: f.label
    })));

    // Check AI availability
    const llmResult = await getSmartLLMService();
    
    if (!llmResult.available) {
      return NextResponse.json({
        success: false,
        error: 'AI features are temporarily unavailable',
        message: llmResult.message
      }, { status: 503 });
    }

    // Generate form data mappings
    const formData = await generateIntelligentFormData(formFields, userProfile, jobInfo, llmResult.service);

    console.log('✅ Generated form data:', {
      fieldsCount: formData.length,
      filledFields: formData.filter((f: { value: string }) => f.value && f.value.trim()).length
    });

    return NextResponse.json({
      success: true,
      formData
    });

  } catch (error) {
    console.error('❌ Form filling error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

async function generateIntelligentFormData(formFields: any[], userProfile: any, jobInfo: any, llmService: any) {
  const formData: any[] = [];

  for (const field of formFields) {
    let value = '';
    
    // First, try to map from user profile
    value = mapFromProfile(field, userProfile);
    
    // Special handling for common dropdown questions
    if (!value && field.type === 'select-one') {
      value = handleCommonDropdowns(field, userProfile, jobInfo);
    }
    
    // If no direct mapping, use AI for application-specific questions
    if (!value && needsAIResponse(field)) {
      console.log(`🤖 Generating AI response for field: ${field.label || field.name}`);
      value = await generateAIResponse(field, userProfile, jobInfo, llmService);
    }
    
    // Add to form data array
    formData.push({
      name: field.name,
      selector: field.selector,
      type: field.type,
      value: value,
      label: field.label,
      placeholder: field.placeholder
    });
  }

  return formData;
}

function mapFromProfile(field: { name?: string; label?: string; placeholder?: string }, userProfile: any): string {
  const fieldName = field.name?.toLowerCase() || '';
  const fieldLabel = field.label?.toLowerCase() || '';
  const fieldPlaceholder = field.placeholder?.toLowerCase() || '';
  
  // Combine all identifiers for matching
  const identifier = `${fieldName} ${fieldLabel} ${fieldPlaceholder}`.toLowerCase();

  console.log(`🔍 Mapping field "${field.name}" with identifier: "${identifier}"`);

  // Safety check: Don't map generic card fields or unknown fields to profile data
  const isGenericCardField = field.name && field.name.includes('cards[') && (!field.label || field.label === field.name);
  const hasEmptyLabel = !field.label || field.label.trim() === '' || field.label === field.name;
  
  if (isGenericCardField || (hasEmptyLabel && field.name && field.name.includes('field'))) {
    console.log(`   → Skipping generic/unlabeled field: "${field.name}"`);
    return '';
  }

  // Basic profile mappings that work for both base and tailored profiles
  if (identifier.includes('name') && identifier.includes('first')) {
    const firstName = userProfile.name?.split(' ')[0] || '';
    console.log(`   → First name: "${firstName}"`);
    return firstName;
  }
  
  if (identifier.includes('name') && identifier.includes('last')) {
    const lastName = userProfile.name?.split(' ').slice(1).join(' ') || '';
    console.log(`   → Last name: "${lastName}"`);
    return lastName;
  }
  
  // Handle preferred name, pronunciation, or "what to call you" questions
  if (identifier.includes('preferred') || identifier.includes('call you') || identifier.includes('pronounce')) {
    const preferredName = userProfile.name?.split(' ')[0] || userProfile.name || '';
    console.log(`   → Preferred name: "${preferredName}"`);
    return preferredName;
  }
  
  if (identifier.includes('name') && !identifier.includes('company')) {
    const fullName = userProfile.name || '';
    console.log(`   → Full name: "${fullName}"`);
    return fullName;
  }
  
  if (identifier.includes('email')) {
    const email = userProfile.email || '';
    console.log(`   → Email: "${email}"`);
    return email;
  }
  
  if (identifier.includes('phone')) {
    const phone = userProfile.phone || '';
    console.log(`   → Phone: "${phone}"`);
    return phone;
  }
  
  if (identifier.includes('address') || identifier.includes('location')) {
    const location = userProfile.location || '';
    console.log(`   → Location: "${location}"`);
    return location;
  }
  
  if (identifier.includes('linkedin')) {
    const linkedin = userProfile.linkedin || '';
    console.log(`   → LinkedIn: "${linkedin}"`);
    return linkedin;
  }
  
  if (identifier.includes('portfolio') || identifier.includes('website')) {
    const portfolio = userProfile.portfolio || userProfile.website || '';
    console.log(`   → Portfolio: "${portfolio}"`);
    return portfolio;
  }
  
  // Experience years (try different approaches for base vs tailored profiles)
  if (identifier.includes('experience') && identifier.includes('years')) {
    let experienceYears = '';
    
    // Try direct experience field first
    if (userProfile.experience) {
      experienceYears = userProfile.experience;
    }
    // Try calculating from work history
    else if (userProfile.workHistory && Array.isArray(userProfile.workHistory) && userProfile.workHistory.length > 0) {
      // Calculate years from work history
      const totalYears = userProfile.workHistory.reduce((years: number, job: any) => {
        if (job.startDate) {
          const start = new Date(job.startDate);
          const end = job.endDate ? new Date(job.endDate) : new Date();
          const jobYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
          return years + jobYears;
        }
        return years;
      }, 0);
      experienceYears = Math.round(totalYears).toString();
    }
    
    console.log(`   → Experience years: "${experienceYears}"`);
    return experienceYears;
  }
  
  if (identifier.includes('salary') || identifier.includes('compensation')) {
    const range = userProfile.preferences?.salaryRange;
    if (range) {
      const salary = `$${range.min} - $${range.max}`;
      console.log(`   → Salary: "${salary}"`);
      return salary;
    }
  }

  // Handle education fields
  if (identifier.includes('university') || identifier.includes('college') || identifier.includes('school')) {
    const school = userProfile.education?.school || userProfile.education?.institution || '';
    console.log(`   → School: "${school}"`);
    return school;
  }
  
  if (identifier.includes('degree')) {
    const degree = userProfile.education?.degree || '';
    console.log(`   → Degree: "${degree}"`);
    return degree;
  }
  
  if (identifier.includes('major') || (identifier.includes('field') && identifier.includes('study'))) {
    const field = userProfile.education?.field || userProfile.education?.field_of_study || '';
    console.log(`   → Field of study: "${field}"`);
    return field;
  }
  
  if (identifier.includes('gpa')) {
    const gpa = userProfile.education?.gpa || '';
    console.log(`   → GPA: "${gpa}"`);
    return gpa;
  }
  
  // Handle current position
  if (identifier.includes('current') && (identifier.includes('position') || identifier.includes('title') || identifier.includes('job'))) {
    const currentJob = userProfile.workHistory?.[0]?.title || userProfile.workHistory?.[0]?.position || '';
    console.log(`   → Current position: "${currentJob}"`);
    return currentJob;
  }
  
  if (identifier.includes('current') && identifier.includes('company')) {
    const currentCompany = userProfile.workHistory?.[0]?.company || '';
    console.log(`   → Current company: "${currentCompany}"`);
    return currentCompany;
  }

  // Handle work authorization questions
  if (identifier.includes('authorized') || identifier.includes('legally') || identifier.includes('work authorization')) {
    const authorized = userProfile.workAuthorization || 'Yes'; // Default to Yes for US-based profiles
    console.log(`   → Work authorization: "${authorized}"`);
    return authorized;
  }
  
  if (identifier.includes('sponsorship') || identifier.includes('visa') || identifier.includes('h-1b') || identifier.includes('h1b')) {
    const needsSponsorship = userProfile.needsSponsorship || 'No'; // Default to No
    console.log(`   → Needs sponsorship: "${needsSponsorship}"`);
    return needsSponsorship;
  }

  // Handle "how did you hear about us" questions
  if (identifier.includes('hear about') || identifier.includes('find out') || identifier.includes('learn about')) {
    const hearAbout = userProfile.referralSource || 'Online job board';
    console.log(`   → How heard about us: "${hearAbout}"`);
    return hearAbout;
  }

  // Handle preferred name / what to call you questions  
  if (identifier.includes('preferred') || identifier.includes('call you') || identifier.includes('like us to call')) {
    const preferredName = userProfile.preferredName || userProfile.name?.split(' ')[0] || userProfile.name || '';
    console.log(`   → Preferred name: "${preferredName}"`);
    return preferredName;
  }

  // Handle pronunciation questions
  if (identifier.includes('pronounce') || identifier.includes('pronunciation')) {
    const pronunciation = userProfile.namePronunciation || `${userProfile.name?.split(' ')[0] || 'My name'} is pronounced as written`;
    console.log(`   → Name pronunciation: "${pronunciation}"`);
    return pronunciation;
  }

  console.log(`   → No mapping found, returning empty string`);
  return '';
}

function handleCommonDropdowns(field: { name?: string; label?: string; placeholder?: string; type: string }, userProfile: any, jobInfo: any): string {
  const fieldName = field.name?.toLowerCase() || '';
  const fieldLabel = field.label?.toLowerCase() || '';
  const fieldPlaceholder = field.placeholder?.toLowerCase() || '';
  
  const identifier = `${fieldName} ${fieldLabel} ${fieldPlaceholder}`.toLowerCase();
  
  console.log(`📋 Handling dropdown field: "${field.label || field.name}" -> "${identifier}"`);

  // How did you hear about us questions
  if (identifier.includes('hear about') || identifier.includes('find out') || identifier.includes('learn about') || 
      identifier.includes('how did you') || identifier.includes('source') || identifier.includes('referral')) {
    const commonSources = [
      'LinkedIn', 'Indeed', 'Company website', 'Online job board', 'Job board',
      'Glassdoor', 'Referral', 'Friend', 'University career center', 'Career fair',
      'Google search', 'Online search', 'Social media', 'Professional network'
    ];
    
    const preferredSource = userProfile.referralSource || 'LinkedIn';
    console.log(`   → How heard about us: "${preferredSource}"`);
    return preferredSource;
  }

  // Work authorization questions
  if (identifier.includes('authorized') || identifier.includes('eligible') || identifier.includes('legally')) {
    const authorization = userProfile.workAuthorization || 'Yes';
    console.log(`   → Work authorization: "${authorization}"`);
    return authorization;
  }

  // Sponsorship questions  
  if (identifier.includes('sponsorship') || identifier.includes('visa') || identifier.includes('require sponsor')) {
    const needsSponsorship = userProfile.needsSponsorship || 'No';
    console.log(`   → Needs sponsorship: "${needsSponsorship}"`);
    return needsSponsorship;
  }

  // Experience level questions
  if (identifier.includes('experience level') || identifier.includes('years of experience') || identifier.includes('seniority')) {
    let experienceLevel = 'Mid-level';
    
    if (userProfile.workHistory && Array.isArray(userProfile.workHistory)) {
      const totalYears = userProfile.workHistory.reduce((years: number, job: any) => {
        if (job.startDate) {
          const start = new Date(job.startDate);
          const end = job.endDate ? new Date(job.endDate) : new Date();
          const jobYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
          return years + jobYears;
        }
        return years;
      }, 0);
      
      if (totalYears < 2) experienceLevel = 'Entry-level';
      else if (totalYears < 5) experienceLevel = 'Mid-level';
      else if (totalYears < 10) experienceLevel = 'Senior-level';
      else experienceLevel = 'Executive';
    }
    
    console.log(`   → Experience level: "${experienceLevel}"`);
    return experienceLevel;
  }

  // Education level questions
  if (identifier.includes('education') || identifier.includes('degree level') || identifier.includes('highest degree')) {
    const educationLevel = userProfile.education?.degree || 'Bachelor\'s degree';
    console.log(`   → Education level: "${educationLevel}"`);
    return educationLevel;
  }

  // Gender/demographic questions (handle carefully)
  if (identifier.includes('gender') || identifier.includes('pronouns')) {
    const gender = userProfile.gender || 'Prefer not to answer';
    console.log(`   → Gender: "${gender}"`);
    return gender;
  }

  console.log(`   → No dropdown mapping found`);
  return '';
}

function needsAIResponse(field: any): boolean {
  const fieldName = field.name?.toLowerCase() || '';
  const fieldLabel = field.label?.toLowerCase() || '';
  const fieldPlaceholder = field.placeholder?.toLowerCase() || '';
  
  const identifier = `${fieldName} ${fieldLabel} ${fieldPlaceholder}`.toLowerCase();

  console.log(`🤖 Checking if field needs AI response: "${field.label || field.name}" -> "${identifier}"`);

  // First check if this is a basic profile field that should NEVER use AI
  const basicFieldIndicators = [
    'name', 'email', 'phone', 'address', 'location', 'linkedin', 'portfolio', 'website'
  ];
  
  const isBasicField = basicFieldIndicators.some(indicator => 
    identifier.includes(indicator) && !identifier.includes('company')
  );
  
  if (isBasicField) {
    console.log(`   → Basic profile field, using direct mapping`);
    return false;
  }

  // Questions that typically need AI responses
  const aiResponseIndicators = [
    // Question words (but not basic info questions)
    'why', 'what', 'how', 'describe', 'explain', 'tell us', 'share', 'discuss',
    
    // Motivation and fit questions  
    'motivation', 'interest', 'interested', 'passionate', 'fit', 'contribution', 'contribute',
    'want to work', 'join', 'choose', 'apply', 'attracted',
    
    // Experience and achievement questions
    'challenge', 'achievement', 'accomplishment', 'example', 'experience with', 'project',
    'proud', 'favorite', 'proudest', 'success', 'failure', 'learn',
    
    // Skills and knowledge
    'skills in', 'knowledge of', 'familiar with', 'proficient', 'expertise',
    
    // Additional content
    'cover letter', 'additional', 'other', 'anything else', 'more', 'elaborate',
    'personal statement', 'essay', 'statement', 'summary',
    
    // Specific application questions
    'about yourself', 'background', 'qualifications', 'strengths', 'weaknesses',
    'goals', 'career', 'future', 'where do you see', 'vision'
  ];

  const needsAI = aiResponseIndicators.some(indicator => identifier.includes(indicator));
  
  // Also check if it's a textarea or long text field with any question-like content
  const isLongTextField = field.type === 'textarea' || (field.type === 'text' && identifier.length > 20);
  const hasQuestionMark = identifier.includes('?');
  
  const result = needsAI || (isLongTextField && hasQuestionMark);
  
  console.log(`   → Needs AI: ${result} (indicators: ${needsAI}, long field with ?: ${isLongTextField && hasQuestionMark})`);
  
  return result;
}

async function generateAIResponse(field: any, userProfile: any, jobInfo: any, llmService: any): Promise<string> {
  try {
    const fieldContext = `${field.label || field.name || ''}`.trim();
    const fieldIdentifier = fieldContext.toLowerCase();
    
    console.log(`🤖 Generating AI response for: "${fieldContext}"`);
    console.log(`🔍 User profile for AI:`, {
      name: userProfile.name,
      hasSkills: !!userProfile.skills,
      hasWorkHistory: !!userProfile.workHistory,
      hasSummary: !!userProfile.summary
    });
    console.log(`🔍 Job info for AI:`, {
      title: jobInfo.jobTitle || jobInfo.title,
      company: jobInfo.company,
      hasDescription: !!jobInfo.description
    });
    
    // Handle specific question types with tailored prompts
    let specificPrompt = '';
    
    if (fieldIdentifier.includes('preferred name') || fieldIdentifier.includes('call you')) {
      // For preferred name questions, just return the first name
      const firstName = userProfile.name?.split(' ')[0] || userProfile.name || '';
      console.log(`   → Preferred name (direct): "${firstName}"`);
      return firstName;
    }
    
    if (fieldIdentifier.includes('pronounce') || fieldIdentifier.includes('pronunciation')) {
      // For pronunciation questions
      const name = userProfile.name?.split(' ')[0] || 'My name';
      const response = `${name} is pronounced as written`;
      console.log(`   → Pronunciation (direct): "${response}"`);
      return response;
    }
    
    if (fieldIdentifier.includes('favorite project') || fieldIdentifier.includes('proudest accomplishment')) {
      specificPrompt = `Generate a response about a favorite project or proudest accomplishment. Focus on a specific technical project that demonstrates skills relevant to ${jobInfo.jobTitle || jobInfo.title || 'this role'}. Include what you built, technologies used, challenges overcome, and impact achieved. Keep it concise but compelling (2-3 sentences).`;
    } else if (fieldIdentifier.includes('why') && fieldIdentifier.includes('work') && jobInfo.company) {
      specificPrompt = `Generate a response for why you want to work at ${jobInfo.company}. Research what you know about the company from the job description and explain how your background aligns with their mission and values. Be specific and genuine (2-3 sentences).`;
    } else if (fieldIdentifier.includes('why') && (fieldIdentifier.includes('interested') || fieldIdentifier.includes('want'))) {
      specificPrompt = `Generate a response explaining why you're interested in this ${jobInfo.jobTitle || jobInfo.title || 'position'}. Connect your background, skills, and career goals to this specific role. Be enthusiastic but professional (2-3 sentences).`;
    } else {
      specificPrompt = `Generate a professional response to this application question: "${fieldContext}". Tailor the response to show how you're a good fit for the ${jobInfo.jobTitle || jobInfo.title || 'position'} at ${jobInfo.company || 'this company'}.`;
    }
    
    const prompt = `You are helping a job applicant fill out an application form. ${specificPrompt}

Job Information:
- Title: ${jobInfo.jobTitle || jobInfo.title || 'Software Engineer'}
- Company: ${jobInfo.company || 'this company'}
- Description: ${jobInfo.description ? jobInfo.description.substring(0, 500) + '...' : 'A technology role focused on building innovative solutions'}

Applicant Profile:
- Name: ${userProfile.name || 'The applicant'}
- Summary: ${userProfile.summary || 'Experienced software engineer with a passion for technology'}
- Skills: ${userProfile.skills?.slice(0, 10).join(', ') || 'JavaScript, Python, React, Node.js'}
- Current Role: ${userProfile.workHistory?.[0] ? `${userProfile.workHistory[0].title} at ${userProfile.workHistory[0].company}` : 'Software Engineer at a technology company'}
- Education: ${userProfile.education ? `${userProfile.education.degree} from ${userProfile.education.school}` : 'Computer Science degree'}

Instructions:
1. Generate a tailored, professional response that directly answers the question
2. Use specific details from the applicant's profile when relevant
3. Keep the tone professional but personable
4. For short fields (preferred name, etc.), keep responses very brief
5. For longer questions, provide 2-3 sentences with specific examples
6. Make it authentic and avoid generic responses
7. Don't use overly formal language - sound natural and enthusiastic
8. DO NOT just return "Software Engineering" or any single generic term

Return only the response text, no additional formatting or explanations.`;

    console.log(`🚀 Sending AI request for field: ${field.label || field.name}`);
    console.log(`📝 AI Prompt (first 200 chars): ${prompt.substring(0, 200)}...`);
    
    const response = await llmService.generateChatResponse({
      userMessage: prompt,
      conversationHistory: [],
      context: {
        instruction: 'Generate a professional, tailored response for a job application form field based on the applicant\'s profile and the specific job.'
      }
    });

    console.log(`🤖 Raw AI service response:`, response);
    
    const aiResponse = response.response || response.content || response || '';
    
    if (!aiResponse || aiResponse.trim() === '') {
      console.error(`❌ Empty AI response for field: ${field.label || field.name}`);
      return `I'm interested in this opportunity because it aligns with my background and career goals.`; // Better fallback
    }
    
    // Don't allow generic single-word responses
    if (aiResponse.trim().toLowerCase() === 'software engineering' || aiResponse.trim().split(' ').length < 3) {
      console.warn(`⚠️ Generic response detected, generating fallback for: ${field.label || field.name}`);
      return `This is an exciting opportunity that matches my skills and interests in ${jobInfo.jobTitle || 'technology'}.`;
    }
    
    console.log(`   ✅ AI response generated (${aiResponse.length} chars): "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`);
    
    return aiResponse;

  } catch (error) {
    console.error('❌ AI response generation error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack : '');
    // Return a meaningful fallback instead of empty string
    return `I'm excited about this opportunity and believe my experience would be valuable for this role.`;
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getSmartLLMService } from '../../../../lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { jobInfo, userProfile, formFields } = await request.json();

    if (!jobInfo || !userProfile || !formFields) {
      return NextResponse.json(
        { error: 'Job info, user profile, and form fields are required' },
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

    // Generate form data mappings
    const formData = await generateIntelligentFormData(formFields, userProfile, jobInfo, llmResult.service);

    return NextResponse.json({
      success: true,
      formData
    });

  } catch (error) {
    console.error('Form filling error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    
    // If no direct mapping, use AI for application-specific questions
    if (!value && needsAIResponse(field)) {
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

function mapFromProfile(field: any, userProfile: any): string {
  const fieldName = field.name?.toLowerCase() || '';
  const fieldLabel = field.label?.toLowerCase() || '';
  const fieldPlaceholder = field.placeholder?.toLowerCase() || '';
  
  // Combine all identifiers for matching
  const identifier = `${fieldName} ${fieldLabel} ${fieldPlaceholder}`.toLowerCase();

  // Basic profile mappings
  if (identifier.includes('name') && identifier.includes('first')) {
    return userProfile.name?.split(' ')[0] || '';
  }
  
  if (identifier.includes('name') && identifier.includes('last')) {
    return userProfile.name?.split(' ').slice(1).join(' ') || '';
  }
  
  if (identifier.includes('name') && !identifier.includes('company')) {
    return userProfile.name || '';
  }
  
  if (identifier.includes('email')) {
    return userProfile.email || '';
  }
  
  if (identifier.includes('phone')) {
    return userProfile.phone || '';
  }
  
  if (identifier.includes('address') || identifier.includes('location')) {
    return userProfile.location || '';
  }
  
  if (identifier.includes('linkedin')) {
    return userProfile.linkedin || '';
  }
  
  if (identifier.includes('portfolio') || identifier.includes('website')) {
    return userProfile.portfolio || '';
  }
  
  if (identifier.includes('experience') && identifier.includes('years')) {
    return userProfile.experience || '';
  }
  
  if (identifier.includes('salary') || identifier.includes('compensation')) {
    const range = userProfile.preferences?.salaryRange;
    if (range) {
      return `$${range.min} - $${range.max}`;
    }
  }
  
  if (identifier.includes('education') || identifier.includes('degree')) {
    return userProfile.education?.degree || '';
  }
  
  if (identifier.includes('school') || identifier.includes('university')) {
    return userProfile.education?.school || '';
  }
  
  if (identifier.includes('graduation') && identifier.includes('year')) {
    return userProfile.education?.year?.toString() || '';
  }

  return '';
}

function needsAIResponse(field: any): boolean {
  const fieldName = field.name?.toLowerCase() || '';
  const fieldLabel = field.label?.toLowerCase() || '';
  const fieldPlaceholder = field.placeholder?.toLowerCase() || '';
  
  const identifier = `${fieldName} ${fieldLabel} ${fieldPlaceholder}`.toLowerCase();

  // Questions that typically need AI responses
  const aiResponseIndicators = [
    'why', 'what', 'how', 'describe', 'explain', 'tell us',
    'motivation', 'interest', 'passionate', 'fit', 'contribution',
    'challenge', 'achievement', 'example', 'experience with',
    'skills in', 'knowledge of', 'familiar with',
    'cover letter', 'additional', 'other', 'anything else'
  ];

  return aiResponseIndicators.some(indicator => identifier.includes(indicator));
}

async function generateAIResponse(field: any, userProfile: any, jobInfo: any, llmService: any): Promise<string> {
  try {
    const fieldContext = `${field.label || field.name || ''} ${field.placeholder || ''}`.trim();
    
    const prompt = `You are helping a job applicant fill out an application form. Generate a professional response to this form field:

Field: ${fieldContext}
Field Type: ${field.type}

Job Information:
- Title: ${jobInfo.title || jobInfo.jobTitle}
- Company: ${jobInfo.company}
- Description: ${jobInfo.description || 'Not provided'}

Applicant Profile:
- Name: ${userProfile.name}
- Experience: ${userProfile.experience}
- Skills: ${userProfile.skills?.join(', ') || 'Not specified'}
- Summary: ${userProfile.summary || 'Not provided'}
- Work History: ${userProfile.workHistory?.map((work: any) => 
    `${work.title} at ${work.company} (${work.duration})`
  ).join(', ') || 'Not provided'}
- Education: ${userProfile.education ? 
    `${userProfile.education.degree} from ${userProfile.education.school}` : 'Not specified'}

Instructions:
1. Generate a tailored, professional response that fits this specific field
2. Keep it concise and relevant (1-3 sentences for short fields, 1-2 paragraphs for longer ones)
3. Highlight relevant experience and skills for this specific job
4. Use a professional but engaging tone
5. Make it authentic and personal to the applicant's profile
6. For text areas, use proper paragraphs. For short fields, keep it brief.

Return only the response text, no additional formatting or explanations.`;

    const response = await llmService.generateChatResponse({
      userMessage: prompt,
      conversationHistory: [],
      context: {
        instruction: 'Generate a professional, tailored response for a job application form field based on the applicant\'s profile and the specific job.'
      }
    });

    return response.response || response.content || response || '';

  } catch (error) {
    console.error('AI response generation error:', error);
    return ''; // Return empty string if AI fails
  }
} 
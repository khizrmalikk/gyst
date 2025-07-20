import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface JobCriteria {
  jobTitle: string;
  location?: string;
  remote?: boolean;
  salaryRange?: {
    min?: number;
    max?: number;
  };
  experience?: 'entry' | 'mid' | 'senior';
  companySize?: 'startup' | 'mid' | 'large';
  industry?: string[];
  skills?: string[];
  keywords?: string[];
}

export interface JobDescription {
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  benefits?: string[];
  salary?: string;
}

export class OpenAIService {
  
  /**
   * Parse user query to extract job search criteria
   */
  async parseJobSearchQuery(query: string): Promise<{
    criteria: JobCriteria;
    intent: 'search' | 'apply' | 'question' | 'modify_search';
    confidence: number;
  }> {
    const prompt = `
You are a job search assistant AI. Parse the following user query and extract job search criteria.
The user is looking for a job. Extract the following information:

Query: "${query}"

Please return a JSON object with the following structure:
{
  "criteria": {
    "jobTitle": "extracted job title",
    "location": "extracted location or null",
    "remote": true/false/null,
    "salaryRange": {"min": number, "max": number} or null,
    "experience": "entry|mid|senior" or null,
    "companySize": "startup|mid|large" or null,
    "industry": ["industry1", "industry2"] or null,
    "skills": ["skill1", "skill2"] or null,
    "keywords": ["keyword1", "keyword2"] or null
  },
  "intent": "search|apply|question|modify_search",
  "confidence": 0.0-1.0
}

Examples:
- "I want a remote software engineer job in San Francisco paying $120k+" -> {"criteria": {"jobTitle": "Software Engineer", "location": "San Francisco", "remote": true, "salaryRange": {"min": 120000}}, "intent": "search", "confidence": 0.9}
- "Looking for entry-level marketing roles at startups" -> {"criteria": {"jobTitle": "Marketing", "experience": "entry", "companySize": "startup"}, "intent": "search", "confidence": 0.8}
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: query }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      // Log the raw OpenAI response
      console.log("Raw OpenAI Query Parse Response:", JSON.stringify(response, null, 2));
      
      const rawContent = response.choices[0].message.content || '{}';
      console.log("OpenAI Query Parse Content:", rawContent);
      
      const result = JSON.parse(rawContent);
      console.log("Parsed Query Result:", JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.error('Error parsing job search query:', error);
      // If OpenAI fails due to quota, use fallback parsing
      if (error instanceof Error && (error.message.includes('429') || error.message.includes('quota'))) {
        console.log('OpenAI quota exceeded, using fallback parsing');
        const { fallbackLLMService } = await import('./fallback');
        return fallbackLLMService.parseJobSearchQuery(query);
      }
      throw new Error('Failed to parse job search query');
    }
  }

  /**
   * Generate personalized cover letter
   */
  async generateCoverLetter(params: {
    jobDescription: JobDescription;
    userProfile: {
      name: string;
      experience: string;
      skills: string[];
      achievements: string[];
    };
    tone?: 'professional' | 'enthusiastic' | 'casual';
  }): Promise<string> {
    const { jobDescription, userProfile, tone = 'professional' } = params;
    
    const prompt = `
You are a professional cover letter writer. Generate a personalized cover letter for the following job application.

Job Details:
- Title: ${jobDescription.title}
- Company: ${jobDescription.company}
- Location: ${jobDescription.location}
- Description: ${jobDescription.description}
- Requirements: ${jobDescription.requirements.join(', ')}

User Profile:
- Name: ${userProfile.name}
- Experience: ${userProfile.experience}
- Skills: ${userProfile.skills.join(', ')}
- Achievements: ${userProfile.achievements.join(', ')}

Tone: ${tone}

Generate a compelling cover letter that:
1. Addresses the specific job requirements
2. Highlights relevant experience and skills
3. Shows enthusiasm for the role and company
4. Is concise (2-3 paragraphs)
5. Includes a strong opening and closing

Return only the cover letter text, no additional formatting or explanations.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating cover letter:', error);
      // If OpenAI fails due to quota, use fallback
      if (error instanceof Error && (error.message.includes('429') || error.message.includes('quota'))) {
        console.log('OpenAI quota exceeded, using fallback cover letter generation');
        const { fallbackLLMService } = await import('./fallback');
        return fallbackLLMService.generateCoverLetter(params);
      }
      throw new Error('Failed to generate cover letter');
    }
  }

  /**
   * Generate a professional CV tailored for specific job
   */
  async generateCV(params: {
    jobDescription?: {
      title?: string;
      company?: string;
      location?: string;
      description?: string;
      requirements?: string[];
    };
    userProfile: {
      name: string;
      email?: string;
      phone?: string;
      location?: string;
      experience?: string;
      skills?: string[];
      summary?: string;
      education?: {
        degree?: string;
        school?: string;
        year?: string;
      };
      workHistory?: {
        title: string;
        company: string;
        duration: string;
        description: string;
      }[];
    };
  }): Promise<string> {
    const { jobDescription, userProfile } = params;
    
    const jobTitle = jobDescription?.title || 'the position';
    const companyName = jobDescription?.company || 'your target company';
    const jobRequirements = jobDescription?.requirements?.join(', ') || jobDescription?.description || 'general requirements';
    
    const prompt = `
You are a professional CV writer specializing in job-tailored CVs. Generate a comprehensive, ATS-friendly CV that is specifically customized for this job application.

${jobDescription ? `🎯 TARGET JOB ANALYSIS:
- Position: ${jobTitle} 
- Company: ${companyName}
- Location: ${jobDescription.location || 'Not specified'}
- Job Requirements: ${jobRequirements}

CUSTOMIZATION FOCUS:
- Tailor ALL content to highlight relevance for this specific ${jobTitle} role
- Emphasize skills and experience that match the job requirements
- Use keywords from the job description throughout the CV
- Prioritize relevant experience over general experience
- Adapt professional summary to target this specific opportunity
` : `🌐 GENERAL PROFESSIONAL CV:
Create a comprehensive professional CV showcasing all qualifications and experience.`}

📋 CANDIDATE PROFILE DATA:
Personal Information:
- Name: ${userProfile.name}
- Email: ${userProfile.email || 'Email not provided'}
- Phone: ${userProfile.phone || 'Phone not provided'}  
- Location: ${userProfile.location || 'Location not specified'}

Professional Background:
- Experience Level: ${userProfile.experience || 'Not specified'}
- Professional Summary: ${userProfile.summary || 'Experienced professional with strong problem-solving skills'}

Core Skills: ${userProfile.skills?.join(', ') || 'General professional skills'}

Work Experience: ${userProfile.workHistory?.map((work: any, index) => 
  `${index + 1}. ${work.title} at ${work.company} (${work.duration})
     Location: ${work.location || 'Not specified'}
     Description: ${work.description}
     Skills Used: ${work.skills?.join(', ') || 'Not specified'}`
).join('\n') || 'Work history not provided'}

Education: ${userProfile.education ? 
  `${userProfile.education.degree || 'Degree'} in ${(userProfile.education as any).field || 'Field'} from ${userProfile.education.school || 'Institution'} (${userProfile.education.year || 'Year'})
   GPA: ${(userProfile.education as any).gpa || 'Not specified'}
   Additional Info: ${(userProfile.education as any).description || 'None'}` : 
  'Education details not specified'}

${(userProfile as any).certifications?.length ? `Certifications: ${(userProfile as any).certifications.map((cert: any) => 
  `${cert.name || cert} (${cert.issuer || 'Issuer not specified'})`).join(', ')}` : ''}

${(userProfile as any).languages?.length ? `Languages: ${(userProfile as any).languages.map((lang: any) => 
  typeof lang === 'string' ? lang : `${lang.language} (${lang.proficiency})`).join(', ')}` : ''}

${(userProfile as any).linkedIn || (userProfile as any).portfolio || (userProfile as any).website ? 
`Professional Links:
${(userProfile as any).linkedIn ? `LinkedIn: ${(userProfile as any).linkedIn}` : ''}
${(userProfile as any).portfolio ? `Portfolio: ${(userProfile as any).portfolio}` : ''} 
${(userProfile as any).website ? `Website: ${(userProfile as any).website}` : ''}` : ''}

🎯 CV CUSTOMIZATION REQUIREMENTS:

${jobDescription ? `JOB-SPECIFIC TAILORING:
1. **Professional Summary**: Rewrite to directly address the ${jobTitle} role at ${companyName}, highlighting the most relevant qualifications
2. **Skills Section**: Prioritize skills mentioned in job requirements, reorganize to show job-relevant skills first
3. **Work Experience**: Emphasize achievements and responsibilities that relate to ${jobTitle} requirements
4. **Keyword Optimization**: Naturally incorporate keywords from the job description throughout
5. **Achievement Focus**: Highlight quantifiable results that would be valuable for this role
6. **Relevance Ranking**: Present experience in order of relevance to this position, not just chronologically` : 
`GENERAL PROFESSIONAL FOCUS:
1. **Professional Summary**: Showcase overall expertise and career highlights
2. **Skills Section**: Display all professional skills comprehensively
3. **Work Experience**: Present complete professional journey with achievements
4. **Achievement Focus**: Highlight quantifiable results and career progression`}

FORMATTING REQUIREMENTS:
1. Use proper CV structure with clear sections:
   - Header (Name and Contact Info already handled)
   - PROFESSIONAL SUMMARY  
   - KEY SKILLS
   - WORK EXPERIENCE
   - EDUCATION
   - CERTIFICATIONS (if applicable)
   - LANGUAGES (if applicable)
2. Use professional language and active voice
3. Keep descriptions concise but impactful
4. Ensure ATS-friendly formatting
5. Make each section stand out clearly
6. Use bullet points and proper spacing for readability

${jobDescription ? `
🎯 FINAL CHECK: Ensure every section emphasizes relevance to the ${jobTitle} position at ${companyName}. The CV should clearly demonstrate why this candidate is perfect for THIS specific role.` : ''}

CRITICAL REQUIREMENTS:
1. **NO PLACEHOLDER TEXT**: Never include suggestions like "[Add certifications]", "[List languages]", or "[If applicable]"
2. **ONLY USE PROVIDED DATA**: Only include sections and information that is actually provided in the candidate profile
3. **NO EMPTY SECTIONS**: If a section has no data, skip it entirely - do not create empty sections or placeholders
4. **PROFESSIONAL TONE**: Write as if this is a real, finished CV ready for submission
5. **NO AI INDICATORS**: Never indicate this was AI-generated or suggest what should be added

SECTION INCLUSION RULES:
- CERTIFICATIONS: Only include if certifications are provided in the profile data
- LANGUAGES: Only include if languages are provided in the profile data  
- PROFESSIONAL LINKS: Only include if LinkedIn, portfolio, or website URLs are provided
- If no data exists for a section, completely omit that section

MANDATORY FORMATTING STRUCTURE:
You MUST use these EXACT section headers (all caps) with double line breaks:

PROFESSIONAL SUMMARY

[Summary content here]

KEY SKILLS

[Skills content with bullet points or formatting]

WORK EXPERIENCE

[Work experience entries with proper formatting]

EDUCATION

[Education details]

CERTIFICATIONS (only if data exists)

[Certification details]

LANGUAGES (only if data exists)

[Language details]

Each section MUST be separated by double line breaks for proper PDF formatting.

Return ONLY the CV content as clean, well-structured text suitable for PDF generation. No additional explanations, formatting instructions, metadata, or placeholder suggestions.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a professional CV writer. Generate clean, properly formatted CV content suitable for professional job applications." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000  // Increased from 2000 to allow for complete CVs with multiple sections
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating CV:', error);
      // If OpenAI fails due to quota, use fallback
      if (error instanceof Error && (error.message.includes('429') || error.message.includes('quota'))) {
        console.log('OpenAI quota exceeded, using fallback CV generation');
        const { fallbackLLMService } = await import('./fallback');
        return fallbackLLMService.generateCV?.(params) || 'CV generation failed';
      }
      throw new Error('Failed to generate CV');
    }
  }

  /**
   * Customize resume bullet points for specific job
   */
  async customizeResumeBullets(params: {
    jobDescription: JobDescription;
    originalBullets: string[];
    userSkills: string[];
  }): Promise<string[]> {
    const { jobDescription, originalBullets, userSkills } = params;
    
    const prompt = `
You are a resume optimization expert. Customize the following resume bullet points to better match the job description.

Job Description:
- Title: ${jobDescription.title}
- Company: ${jobDescription.company}
- Requirements: ${jobDescription.requirements.join(', ')}
- Description: ${jobDescription.description}

User Skills: ${userSkills.join(', ')}

Original Resume Bullets:
${originalBullets.map((bullet, i) => `${i + 1}. ${bullet}`).join('\n')}

Please:
1. Rewrite each bullet point to better align with the job requirements
2. Emphasize relevant skills and achievements
3. Use action verbs and quantify results where possible
4. Keep the same number of bullet points
5. Maintain truthfulness - don't add false information

Return a JSON array of the customized bullet points.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"bullets": []}');
      return result.bullets || originalBullets;
    } catch (error) {
      console.error('Error customizing resume bullets:', error);
      // If OpenAI fails due to quota, use fallback
      if (error instanceof Error && (error.message.includes('429') || error.message.includes('quota'))) {
        console.log('OpenAI quota exceeded, using fallback resume customization');
        const { fallbackLLMService } = await import('./fallback');
        return fallbackLLMService.customizeResumeBullets(params);
      }
      throw new Error('Failed to customize resume bullets');
    }
  }

  /**
   * Score job match based on user profile
   */
  async scoreJobMatch(params: {
    jobDescription: JobDescription;
    userProfile: {
      skills: string[];
      experience: string;
      preferences: {
        location?: string;
        remote?: boolean;
        salary?: { min?: number; max?: number };
        industry?: string[];
      };
    };
  }): Promise<{
    score: number;
    reasons: string[];
    concerns: string[];
  }> {
    const { jobDescription, userProfile } = params;
    
    const prompt = `
You are a job matching expert. Score how well this job matches the user's profile on a scale of 0-100.

Job Details:
- Title: ${jobDescription.title}
- Company: ${jobDescription.company}
- Location: ${jobDescription.location}
- Description: ${jobDescription.description}
- Requirements: ${jobDescription.requirements.join(', ')}
- Salary: ${jobDescription.salary || 'Not specified'}

User Profile:
- Skills: ${userProfile.skills.join(', ')}
- Experience: ${userProfile.experience}
- Location Preference: ${userProfile.preferences.location || 'Not specified'}
- Remote Preference: ${userProfile.preferences.remote ? 'Yes' : 'No'}
- Salary Range: ${userProfile.preferences.salary ? `$${userProfile.preferences.salary.min || 0} - $${userProfile.preferences.salary.max || 'unlimited'}` : 'Not specified'}

Provide a JSON response with:
{
  "score": 0-100,
  "reasons": ["reason1", "reason2", ...],
  "concerns": ["concern1", "concern2", ...]
}

Consider:
- Skill alignment
- Experience level match
- Location/remote preferences
- Salary expectations
- Company culture fit
- Growth potential
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"score": 0, "reasons": [], "concerns": []}');
      return result;
    } catch (error) {
      console.error('Error scoring job match:', error);
      // If OpenAI fails due to quota, use fallback
      if (error instanceof Error && (error.message.includes('429') || error.message.includes('quota'))) {
        console.log('OpenAI quota exceeded, using fallback job scoring');
        const { fallbackLLMService } = await import('./fallback');
        return fallbackLLMService.scoreJobMatch(params);
      }
      throw new Error('Failed to score job match');
    }
  }

  /**
   * Generate conversational response for job search chat
   */
  async generateChatResponse(params: {
    userMessage: string;
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    context?: {
      recentSearches?: JobCriteria[];
      applications?: any[];
    };
  }): Promise<{
    response: string;
    suggestedActions: Array<{
      type: 'search' | 'apply' | 'refine' | 'question';
      label: string;
      data?: any;
    }>;
  }> {
    const { userMessage, conversationHistory, context } = params;
    
    const systemPrompt = `
You are a helpful job search assistant. Keep responses SHORT and casual, like text messages.

Context:
- Recent searches: ${context?.recentSearches?.length || 0} searches
- Applications: ${context?.applications?.length || 0} applications

Guidelines:
1. Keep responses under 2 sentences max
2. Use casual, friendly tone like texting a friend
3. When user provides job criteria (title, location, salary, etc.), trigger a search immediately
4. Be direct and to the point
5. No long explanations or formal language
6. No emojis or special characters
7. Use proper formatting with line breaks (\n) for better readability when needed
8. Use bullet points (•) for lists when appropriate

IMPORTANT: If the user provides specific job criteria (like "software engineer in San Francisco" or "remote marketing roles"), respond with "Let me search for those jobs!" and use type "search" with their criteria.

Examples of good responses:
- "Got it! What kind of role are you looking for?"
- "Nice! Remote or in-person?"
- "Perfect. What's your experience level?"
- "Let me search for those jobs!" (when they give criteria)
- For multiple questions: "Great! A few quick questions:\n• What's your experience level?\n• Remote or in-person?\n• Any salary preferences?"

Current conversation:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User: ${userMessage}

Provide a JSON response with:
{
  "response": "your SHORT conversational response (1-2 sentences max) with proper formatting",
  "suggestedActions": [
    {
      "type": "search|apply|refine|question",
      "label": "Action button text",
      "data": {} // optional action data
    }
  ]
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.8,
        max_tokens: 150,
        response_format: { type: "json_object" }
      });

      // Log the raw OpenAI response
      console.log("Raw OpenAI Chat Response:", JSON.stringify(response, null, 2));
      
      const rawContent = response.choices[0].message.content || '{"response": "I\'m here to help with your job search!", "suggestedActions": []}';
      console.log("OpenAI Chat Content:", rawContent);
      
      const result = JSON.parse(rawContent);
      console.log("Parsed Chat Result:", JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.error('Error generating chat response:', error);
      // If OpenAI fails due to quota, use fallback
      if (error instanceof Error && (error.message.includes('429') || error.message.includes('quota'))) {
        console.log('OpenAI quota exceeded, using fallback chat response');
        const { fallbackLLMService } = await import('./fallback');
        return fallbackLLMService.generateChatResponse(params);
      }
      throw new Error('Failed to generate chat response');
    }
  }
}

export const openaiService = new OpenAIService(); 
// Fallback LLM service for when OpenAI is not available
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

export class FallbackLLMService {
  
  async parseJobSearchQuery(query: string): Promise<{
    criteria: JobCriteria;
    intent: 'search' | 'apply' | 'question' | 'modify_search';
    confidence: number;
  }> {
    // Simple keyword-based parsing as fallback
    const lowerQuery = query.toLowerCase();
    
    const criteria: JobCriteria = {
      jobTitle: this.extractJobTitle(lowerQuery),
      location: this.extractLocation(lowerQuery),
      remote: this.extractRemote(lowerQuery),
      salaryRange: this.extractSalary(lowerQuery),
      experience: this.extractExperience(lowerQuery),
      skills: this.extractSkills(lowerQuery)
    };

    const intent = this.extractIntent(lowerQuery);
    
    return {
      criteria,
      intent,
      confidence: 0.7 // Lower confidence for fallback parsing
    };
  }

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
    
    // Generate comprehensive fallback CV content
    const sections = [];
    
    // Professional Summary (always include) with proper header
    const summary = userProfile.summary || 'Experienced professional with strong problem-solving skills and dedication to excellence. Committed to delivering high-quality results and contributing to team success.';
    sections.push(`PROFESSIONAL SUMMARY\n\n${summary}\n\n`);
    
    // Skills (only if we have real skills) with proper header
    if (userProfile.skills && userProfile.skills.length > 0 && !userProfile.skills.includes('Please add skills to your profile')) {
      sections.push(`KEY SKILLS\n\n${userProfile.skills.join(' • ')}\n\n`);
    }
    
          // Work History - Complete section (only if we have real work data) with proper header
      if (userProfile.workHistory && userProfile.workHistory.length > 0 && 
          userProfile.workHistory[0] && !userProfile.workHistory[0].title.includes('Please add work experience')) {
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
        if (index < (userProfile.workHistory?.length || 0) - 1) {
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
      if ((userProfile.education as any).field && (userProfile.education as any).field !== 'Field not specified') {
        sections.push(` in ${(userProfile.education as any).field}`);
      }
      sections.push('\n');
      sections.push(`${userProfile.education.school || 'University'} | ${userProfile.education.year || '2020'}\n\n`);
      if ((userProfile.education as any).gpa) {
        sections.push(`GPA: ${(userProfile.education as any).gpa}\n`);
      }
    }
    
    // Only add additional sections if we have real data with proper headers
    if ((userProfile as any).certifications && (userProfile as any).certifications.length > 0) {
      sections.push('CERTIFICATIONS\n\n');
      (userProfile as any).certifications.forEach((cert: any) => {
        sections.push(`${cert.name || cert}\n`);
        if (cert.issuer) sections.push(`${cert.issuer} | ${cert.issue_date || 'Current'}\n`);
      });
      sections.push('\n');
    }
    
    if ((userProfile as any).languages && (userProfile as any).languages.length > 0) {
      sections.push('LANGUAGES\n\n');
      const languageList = (userProfile as any).languages.map((lang: any) => 
        typeof lang === 'string' ? lang : `${lang.language} (${lang.proficiency})`
      ).join(', ');
      sections.push(`${languageList}\n\n`);
    }
    
    // Add professional links only if they exist with proper header
    const hasLinks = (userProfile as any).linkedIn || (userProfile as any).portfolio || (userProfile as any).website;
    if (hasLinks) {
      sections.push('PROFESSIONAL LINKS\n\n');
      if ((userProfile as any).linkedIn) sections.push(`LinkedIn: ${(userProfile as any).linkedIn}\n`);
      if ((userProfile as any).portfolio) sections.push(`Portfolio: ${(userProfile as any).portfolio}\n`);
      if ((userProfile as any).website) sections.push(`Website: ${(userProfile as any).website}\n`);
    }
    
    return sections.join('');
  }

  async generateCoverLetter(params: {
    jobDescription: any;
    userProfile: any;
    tone?: string;
  }): Promise<string> {
    const { jobDescription, userProfile } = params;
    
    // Template-based cover letter generation
    return `Dear Hiring Manager,

I am writing to express my interest in the ${jobDescription.title} position at ${jobDescription.company}. With ${userProfile.experience}, I am excited about the opportunity to contribute to your team.

My background in ${userProfile.skills.slice(0, 3).join(', ')} aligns well with your requirements. ${userProfile.achievements[0] || 'I have a proven track record of delivering results'}.

I am particularly drawn to ${jobDescription.company} because of your commitment to innovation and growth. I would welcome the opportunity to discuss how my skills and enthusiasm can contribute to your team's success.

Thank you for your consideration.

Best regards,
${userProfile.name}`;
  }

  async customizeResumeBullets(params: {
    jobDescription: any;
    originalBullets: string[];
    userSkills: string[];
  }): Promise<string[]> {
    // Return original bullets with minor enhancements
    return params.originalBullets.map(bullet => {
      // Add relevant skills to bullets if not present
      const relevantSkills = params.userSkills.slice(0, 2);
      if (!relevantSkills.some(skill => bullet.toLowerCase().includes(skill.toLowerCase()))) {
        return `${bullet} using ${relevantSkills[0]}`;
      }
      return bullet;
    });
  }

  async scoreJobMatch(params: any): Promise<{
    score: number;
    reasons: string[];
    concerns: string[];
  }> {
    // Simple scoring based on keyword matching
    const { jobDescription, userProfile } = params;
    
    let score = 50; // Base score
    const reasons: string[] = [];
    const concerns: string[] = [];
    
    // Check skill matches
    const jobSkills = jobDescription.requirements || [];
    const userSkills = userProfile.skills || [];
    const matchingSkills = userSkills.filter((skill: string) => 
      jobSkills.some((req: string) => req.toLowerCase().includes(skill.toLowerCase()))
    );
    
    if (matchingSkills.length > 0) {
      score += matchingSkills.length * 10;
      reasons.push(`Matching skills: ${matchingSkills.join(', ')}`);
    } else {
      concerns.push('Limited skill overlap detected');
    }
    
    // Check location preference
    if (userProfile.preferences?.remote && jobDescription.location.toLowerCase().includes('remote')) {
      score += 15;
      reasons.push('Remote work available');
    }
    
    return {
      score: Math.min(score, 100),
      reasons,
      concerns
    };
  }

  async generateChatResponse(params: {
    userMessage: string;
    conversationHistory: Array<{ role: string; content: string }>;
    context?: any;
  }): Promise<{
    response: string;
    suggestedActions: Array<{
      type: 'search' | 'apply' | 'refine' | 'question';
      label: string;
      data?: any;
    }>;
  }> {
    const { userMessage } = params;
    const lowerMessage = userMessage.toLowerCase();
    
    // Simple pattern matching for responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return {
        response: "Hey! What kind of job are you looking for?",
        suggestedActions: [
          { type: 'search', label: 'Start Search', data: {} }
        ]
      };
    }
    
    if (lowerMessage.includes('job') || lowerMessage.includes('position')) {
      return {
        response: "Cool! What type of role?\n\nI can help you search for:\n• Remote positions\n• Specific locations\n• Salary ranges\n• Experience levels",
        suggestedActions: [
          { type: 'search', label: 'Search Jobs', data: {} },
          { type: 'refine', label: 'Set Preferences', data: {} }
        ]
      };
    }
    
    // Default response
    return {
      response: "Got it! What type of position are you interested in?",
      suggestedActions: [
        { type: 'search', label: 'Search Jobs', data: {} },
        { type: 'question', label: 'Tell me more', data: {} }
      ]
    };
  }

  private extractJobTitle(query: string): string {
    const jobTitles = [
      'software engineer', 'software developer', 'developer', 'engineer',
      'product manager', 'manager', 'data scientist', 'data analyst', 'analyst',
      'designer', 'ux designer', 'ui designer', 'graphic designer',
      'marketer', 'marketing', 'sales', 'consultant', 'devops', 'frontend', 'backend'
    ];
    
    // Sort by length (longest first) to match more specific titles first
    const sortedTitles = jobTitles.sort((a, b) => b.length - a.length);
    const found = sortedTitles.find(title => query.includes(title));
    
    // If no specific title found, try to extract from common patterns
    if (!found) {
      if (query.includes('engineer')) return 'Engineer';
      if (query.includes('develop')) return 'Developer';
      if (query.includes('design')) return 'Designer';
      if (query.includes('market')) return 'Marketing Specialist';
      if (query.includes('analy')) return 'Analyst';
    }
    
    return found || 'Software Engineer'; // Default fallback
  }

  private extractLocation(query: string): string | undefined {
    const locations = [
      'san francisco', 'sf', 'new york', 'nyc', 'seattle', 'austin', 'boston', 
      'chicago', 'los angeles', 'la', 'denver', 'portland', 'miami', 'atlanta',
      'dallas', 'houston', 'philadelphia', 'phoenix', 'san diego', 'washington dc'
    ];
    
    // Convert common abbreviations
    let normalizedQuery = query;
    if (query.includes(' sf ') || query.includes(' sf,')) normalizedQuery += ' san francisco';
    if (query.includes(' nyc ') || query.includes(' nyc,')) normalizedQuery += ' new york';
    if (query.includes(' la ') || query.includes(' la,')) normalizedQuery += ' los angeles';
    
    return locations.find(loc => normalizedQuery.includes(loc));
  }

  private extractRemote(query: string): boolean | undefined {
    if (query.includes('remote')) return true;
    if (query.includes('on-site') || query.includes('onsite')) return false;
    return undefined;
  }

  private extractSalary(query: string): { min?: number; max?: number } | undefined {
    const salaryMatch = query.match(/\$?(\d+)k?\+?/);
    if (salaryMatch) {
      const amount = parseInt(salaryMatch[1]) * (salaryMatch[0].includes('k') ? 1000 : 1);
      return query.includes('+') ? { min: amount } : { min: amount * 0.9, max: amount * 1.1 };
    }
    return undefined;
  }

  private extractExperience(query: string): 'entry' | 'mid' | 'senior' | undefined {
    if (query.includes('entry') || query.includes('junior')) return 'entry';
    if (query.includes('senior')) return 'senior';
    if (query.includes('mid') || query.includes('experienced')) return 'mid';
    return undefined;
  }

  private extractSkills(query: string): string[] {
    const skills = ['javascript', 'python', 'react', 'node', 'aws', 'sql', 'java', 'typescript'];
    return skills.filter(skill => query.includes(skill));
  }

  private extractIntent(query: string): 'search' | 'apply' | 'question' | 'modify_search' {
    if (query.includes('apply')) return 'apply';
    if (query.includes('?') || query.includes('how') || query.includes('what')) return 'question';
    if (query.includes('change') || query.includes('modify')) return 'modify_search';
    return 'search';
  }
}

export const fallbackLLMService = new FallbackLLMService(); 
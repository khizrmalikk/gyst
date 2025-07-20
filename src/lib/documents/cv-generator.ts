import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface CVGenerationResult {
  content: string;
  downloadUrl?: string;
  success: boolean;
  error?: string;
}

export class CVGenerator {
  
  async generateCV(userProfile: any, jobInfo: any): Promise<CVGenerationResult> {
    try {
      const prompt = this.createCVPrompt(userProfile, jobInfo);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert CV writer. Create professional, ATS-friendly CVs tailored to specific job requirements. Format the output in clean, professional format suitable for job applications."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      const cvContent = response.choices[0]?.message?.content;
      
      if (!cvContent) {
        throw new Error('No CV content generated');
      }

      // In a real implementation, you would:
      // 1. Convert to PDF format
      // 2. Store in file system or cloud storage
      // 3. Return download URL
      
      return {
        content: cvContent,
        downloadUrl: `/api/documents/cv/${Date.now()}.pdf`, // Mock URL
        success: true
      };

    } catch (error) {
      console.error('CV generation error:', error);
      return {
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private createCVPrompt(userProfile: any, jobInfo: any): string {
    return `Create a professional CV tailored for the following job application:

JOB INFORMATION:
- Title: ${jobInfo.title}
- Company: ${jobInfo.company}
- Description: ${jobInfo.description}

USER PROFILE:
- Name: ${userProfile.fullName}
- Email: ${userProfile.email}
- Phone: ${userProfile.phone}
- Location: ${userProfile.location}
- LinkedIn: ${userProfile.linkedIn || 'N/A'}
- GitHub: ${userProfile.github || 'N/A'}
- Website: ${userProfile.website || 'N/A'}
- Summary: ${userProfile.summary}

SKILLS:
${userProfile.skills?.join(', ') || 'N/A'}

WORK EXPERIENCE:
${userProfile.experience?.map((exp: any) => `
- ${exp.position} at ${exp.company} (${exp.startDate} - ${exp.endDate})
  ${exp.description}
`).join('\n') || 'N/A'}

EDUCATION:
${userProfile.education?.map((edu: any) => `
- ${edu.degree} in ${edu.field} from ${edu.institution} (${edu.startDate} - ${edu.endDate})
`).join('\n') || 'N/A'}

REQUIREMENTS:
1. Tailor the CV specifically for this "${jobInfo.title}" role at "${jobInfo.company}"
2. Highlight relevant skills and experience that match the job description
3. Use professional formatting with clear sections
4. Keep it concise but comprehensive (1-2 pages equivalent)
5. Make it ATS-friendly with clear headings and keywords
6. Emphasize achievements and quantifiable results where possible

Please create a well-structured CV that maximizes the chances of getting an interview for this specific position.`;
  }
} 
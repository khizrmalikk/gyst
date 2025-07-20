import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface CoverLetterGenerationResult {
  content: string;
  downloadUrl?: string;
  success: boolean;
  error?: string;
}

export class CoverLetterGenerator {
  
  async generateCoverLetter(userProfile: any, jobInfo: any): Promise<CoverLetterGenerationResult> {
    try {
      const prompt = this.createCoverLetterPrompt(userProfile, jobInfo);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert cover letter writer. Create compelling, personalized cover letters that highlight the candidate's strengths and demonstrate genuine interest in the specific role and company."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.4
      });

      const coverLetterContent = response.choices[0]?.message?.content;
      
      if (!coverLetterContent) {
        throw new Error('No cover letter content generated');
      }

      // In a real implementation, you would:
      // 1. Convert to PDF format
      // 2. Store in file system or cloud storage
      // 3. Return download URL
      
      return {
        content: coverLetterContent,
        downloadUrl: `/api/documents/cover-letter/${Date.now()}.pdf`, // Mock URL
        success: true
      };

    } catch (error) {
      console.error('Cover letter generation error:', error);
      return {
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private createCoverLetterPrompt(userProfile: any, jobInfo: any): string {
    return `Create a professional cover letter for the following job application:

JOB INFORMATION:
- Title: ${jobInfo.title}
- Company: ${jobInfo.company}
- Description: ${jobInfo.description}
- Application URL: ${jobInfo.url}

CANDIDATE PROFILE:
- Name: ${userProfile.fullName}
- Email: ${userProfile.email}
- Phone: ${userProfile.phone}
- Location: ${userProfile.location}
- Professional Summary: ${userProfile.summary}

KEY SKILLS:
${userProfile.skills?.join(', ') || 'N/A'}

RECENT EXPERIENCE:
${userProfile.experience?.slice(0, 2).map((exp: any) => `
- ${exp.position} at ${exp.company} (${exp.startDate} - ${exp.endDate})
  ${exp.description}
`).join('\n') || 'N/A'}

EDUCATION:
${userProfile.education?.[0] ? `${userProfile.education[0].degree} in ${userProfile.education[0].field} from ${userProfile.education[0].institution}` : 'N/A'}

REQUIREMENTS:
1. Address the letter to "Hiring Manager" or "Dear Hiring Team"
2. Show enthusiasm for the specific role and company
3. Highlight 2-3 most relevant experiences that match the job requirements
4. Demonstrate knowledge of the company (if identifiable from job description)
5. Explain why the candidate is a perfect fit for this role
6. Include a strong call to action
7. Keep it concise (3-4 paragraphs, about 250-400 words)
8. Use professional tone but show personality
9. End with "Sincerely, ${userProfile.fullName}"

Create a compelling cover letter that makes the candidate stand out and increases their chances of getting an interview.`;
  }
} 
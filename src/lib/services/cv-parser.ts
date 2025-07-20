import { getLLMClient } from '../llm';

interface EducationItem {
  school: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  description?: string;
}

interface ExperienceItem {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface ExtractedData {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  skills?: string[];
  education?: EducationItem[];
  experience?: ExperienceItem[];
}

async function processWithOpenAI(content: string, mimeType: string): Promise<ExtractedData> {
  try {
    console.log('Processing with OpenAI, content length:', content.length);
    
    const openai = getLLMClient();
    
    const systemPrompt = `You are an expert CV/resume parser. Extract structured information from the provided document and return it as a JSON object with this exact structure:

{
  "fullName": "string",
  "email": "string", 
  "phone": "string",
  "location": "string",
  "skills": ["skill1", "skill2"],
  "education": [
    {
      "school": "University Name",
      "degree": "Degree Type",
      "fieldOfStudy": "Field of Study", 
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "description": "Optional description"
    }
  ],
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM", 
      "endDate": "YYYY-MM",
      "description": "Job description"
    }
  ]
}

Rules:
- Extract as much information as possible
- For dates, use YYYY-MM format (e.g., "2023-01", "2020-09")
- If end date is current/present, use "present"
- Leave fields as empty strings if not found
- Return ONLY the JSON object, no additional text
- Extract all education entries (university, college, certifications, etc.)
- Extract all work experience entries
- Include relevant skills mentioned throughout the document`;

    console.log('Sending text content to OpenAI...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Please extract all information from this CV/resume text:\n\n${content}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response received:', result.substring(0, 200) + '...');
    
    try {
      const extractedData = JSON.parse(result);
      console.log('Successfully parsed OpenAI response:', {
        fullName: extractedData.fullName,
        email: extractedData.email,
        educationCount: extractedData.education?.length || 0,
        experienceCount: extractedData.experience?.length || 0,
        skillsCount: extractedData.skills?.length || 0
      });
      return extractedData;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw response:', result);
      throw new Error('Failed to parse OpenAI response as JSON');
    }
  } catch (error) {
    console.error('Error processing with OpenAI:', error);
    throw error;
  }
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    console.log('Attempting to extract text from PDF using mammoth fallback...');
    // For now, let's try a simple approach - just return a helpful message
    // In a production environment, you'd want to use a proper PDF text extraction service
    
    // Since PDF text extraction is complex, let's provide a clear message
    return `PDF text extraction is currently limited. For best results, please:
1. Convert your PDF to a Word document (.docx) and upload that instead
2. Or manually copy and paste the text content from your PDF

This document appears to be a PDF CV/resume. To extract education and experience information automatically, please upload a Word document (.docx) version instead.

If you continue with this PDF, only basic profile information will be saved (CV uploaded status), but education and experience details will need to be entered manually.`;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    console.log('Extracting text from DOCX...');
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    console.log('DOCX text extracted, length:', result.value.length);
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw error;
  }
}

export async function parseCV(fileBuffer: Buffer, mimeType: string): Promise<ExtractedData> {
  try {
    console.log('Starting CV parsing process...', { mimeType, bufferSize: fileBuffer.length });
    
    let extractedText: string;
    
    if (mimeType === 'application/pdf') {
      console.log('Processing PDF file...');
      extractedText = await extractTextFromPdf(fileBuffer);
      
      // Check if we got the PDF limitation message
      if (extractedText.includes('PDF text extraction is currently limited')) {
        console.log('PDF processing limited, returning minimal data structure');
        return {
          fullName: '',
          email: '',
          phone: '',
          location: '',
          skills: [],
          education: [],
          experience: []
        };
      }
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('Processing DOCX file...');
      extractedText = await extractTextFromDocx(fileBuffer);
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the DOCX file');
      }
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Process the extracted text with OpenAI
    return await processWithOpenAI(extractedText, mimeType);
  } catch (error) {
    console.error('Error in parseCV:', error);
    throw error;
  }
} 
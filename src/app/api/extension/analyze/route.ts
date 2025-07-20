import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSmartLLMService } from '../../../../lib/llm';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper authentication for Chrome extension
    const userId = 'extension-user';

    const { url, title, content, action } = await request.json();

    if (!url || !content) {
      return NextResponse.json(
        { error: 'URL and content are required' },
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

    switch (action) {
      case 'analyze_page':
        return await analyzePage(url, title, content, llmResult.service!);
      case 'analyze_form':
        return await analyzeForm(url, title, content, llmResult.service!);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Extension analyze error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function analyzePage(url: string, title: string, content: string, llmService: any) {
  try {
    const analysis = await llmService.generateChatResponse({
      userMessage: `Analyze this job page and extract job information:\n\nURL: ${url}\nTitle: ${title}\nContent: ${content.substring(0, 5000)}`,
      conversationHistory: [],
      context: {
        instruction: 'Extract job details (title, company, location, salary, description, requirements) and return as JSON'
      }
    });

    // Parse the job information from the LLM response
    const jobInfo = parseJobInfo(analysis.response);

    return NextResponse.json({
      success: true,
      jobInfo,
      hasApplicationForm: content.includes('application') || content.includes('apply'),
      confidence: 0.8
    });

  } catch (error) {
    console.error('Page analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze page'
    });
  }
}

async function analyzeForm(url: string, title: string, content: string, llmService: any) {
  try {
    const analysis = await llmService.generateChatResponse({
      userMessage: `Analyze this application form and identify fillable fields:\n\nURL: ${url}\nTitle: ${title}\nContent: ${content.substring(0, 5000)}`,
      conversationHistory: [],
      context: {
        instruction: 'Identify form fields (name, email, phone, resume upload, cover letter, experience, etc.) and return as JSON'
      }
    });

    // Parse the form fields from the LLM response
    const formFields = parseFormFields(analysis.response);

    return NextResponse.json({
      success: true,
      formFields,
      confidence: 0.8
    });

  } catch (error) {
    console.error('Form analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze form'
    });
  }
}

function parseJobInfo(response: string) {
  // Try to extract structured job information from LLM response
  try {
    // Look for JSON in the response
    const jsonMatch = response.match(/\{[^}]+\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.warn('Failed to parse JSON from LLM response');
  }

  // Fallback to pattern matching
  return {
    title: extractPattern(response, /title[:\s]*(.*?)(?:\n|$)/i) || 'Not found',
    company: extractPattern(response, /company[:\s]*(.*?)(?:\n|$)/i) || 'Not found',
    location: extractPattern(response, /location[:\s]*(.*?)(?:\n|$)/i) || 'Not found',
    salary: extractPattern(response, /salary[:\s]*(.*?)(?:\n|$)/i) || 'Not specified',
    description: extractPattern(response, /description[:\s]*(.*?)(?:\n|Requirements|Skills|$)/i) || 'Not available',
    requirements: extractList(response, /requirements[:\s]*(.*?)(?:\n|$)/i) || []
  };
}

function parseFormFields(response: string) {
  // Try to extract form field information from LLM response
  try {
    const jsonMatch = response.match(/\[.*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.warn('Failed to parse form fields JSON');
  }

  // Fallback to common form fields
  return [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'tel', required: false },
    { name: 'resume', type: 'file', required: true },
    { name: 'cover_letter', type: 'textarea', required: false },
    { name: 'experience', type: 'textarea', required: false }
  ];
}

function extractPattern(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function extractList(text: string, pattern: RegExp): string[] {
  const match = text.match(pattern);
  if (!match) return [];
  
  return match[1]
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
} 
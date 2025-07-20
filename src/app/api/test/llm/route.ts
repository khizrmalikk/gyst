import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { openaiService, validateLLMConfig } from "@/lib/llm";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check LLM configuration
    const config = validateLLMConfig();
    if (!config.isValid) {
      return NextResponse.json({
        success: false,
        error: "LLM not configured",
        issues: config.errors
      }, { status: 500 });
    }

    // Test basic LLM functionality
    const testQuery = "I'm looking for a remote software engineering job in San Francisco";
    const parsedQuery = await openaiService.parseJobSearchQuery(testQuery);
    
    const testChatResponse = await openaiService.generateChatResponse({
      userMessage: "Hello! I need help finding a job.",
      conversationHistory: [],
      context: {
        recentSearches: [],
        applications: []
      }
    });

    return NextResponse.json({
      success: true,
      message: "LLM integration working correctly",
      tests: {
        queryParsing: {
          input: testQuery,
          output: parsedQuery
        },
        chatResponse: {
          input: "Hello! I need help finding a job.",
          output: testChatResponse
        }
      }
    });
    
  } catch (error) {
    console.error("LLM test error:", error);
    return NextResponse.json({
      success: false,
      error: "LLM test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { testType, data } = await request.json();

    switch (testType) {
      case 'parse_query':
        const parsed = await openaiService.parseJobSearchQuery(data.query);
        return NextResponse.json({ success: true, result: parsed });
        
      case 'generate_cover_letter':
        const coverLetter = await openaiService.generateCoverLetter(data);
        return NextResponse.json({ success: true, result: coverLetter });
        
      case 'score_job':
        const score = await openaiService.scoreJobMatch(data);
        return NextResponse.json({ success: true, result: score });
        
      case 'customize_resume':
        const bullets = await openaiService.customizeResumeBullets(data);
        return NextResponse.json({ success: true, result: bullets });
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: "Invalid test type" 
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error("LLM test error:", error);
    return NextResponse.json({
      success: false,
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 
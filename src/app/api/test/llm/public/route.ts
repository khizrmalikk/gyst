import { NextRequest, NextResponse } from "next/server";
import { getSmartLLMService, validateLLMConfig } from "@/lib/llm";

export async function GET(request: NextRequest) {
  try {
    // Check AI availability first to avoid consuming credits
    const llmResult = await getSmartLLMService();
    
    if (!llmResult.available) {
      return NextResponse.json({
        success: true,
        aiAvailable: false,
        message: llmResult.message,
        note: "AI features are currently unavailable - no tests performed to avoid consuming credits",
        timestamp: new Date().toISOString()
      });
    }
    
    if (!llmResult.service) {
      throw new Error("Service is null despite being available");
    }
    
    // Test basic LLM functionality
    const testQuery = "I'm looking for a remote software engineering job in San Francisco";
    const parsedQuery = await llmResult.service.parseJobSearchQuery(testQuery);
    
    const testChatResponse = await llmResult.service.generateChatResponse({
      userMessage: "Hello! I need help finding a job.",
      conversationHistory: [],
      context: {
        recentSearches: [],
        applications: []
      }
    });

    return NextResponse.json({
      success: true,
      aiAvailable: true,
      message: "LLM integration working correctly",
      provider: "openai",
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
    const { testType, data } = await request.json();
    const llmResult = await getSmartLLMService();
    
    if (!llmResult.available) {
      return NextResponse.json({
        success: false,
        error: "AI features are currently unavailable",
        message: llmResult.message,
        note: "Cannot perform test - AI service is not available"
      }, { status: 503 });
    }
    
    if (!llmResult.service) {
      throw new Error("Service is null despite being available");
    }

    const service = llmResult.service;
    
    switch (testType) {
      case 'parse_query':
        const parsed = await service.parseJobSearchQuery(data.query);
        return NextResponse.json({ success: true, result: parsed });
        
      case 'generate_cover_letter':
        const coverLetter = await service.generateCoverLetter(data);
        return NextResponse.json({ success: true, result: coverLetter });
        
      case 'score_job':
        const score = await service.scoreJobMatch(data);
        return NextResponse.json({ success: true, result: score });
        
      case 'customize_resume':
        const bullets = await service.customizeResumeBullets(data);
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
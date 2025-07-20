import { NextRequest, NextResponse } from "next/server";
import { checkAIAvailability, getAIStatusMessage } from "@/lib/llm";

export async function GET(request: NextRequest) {
  try {
    const availability = await checkAIAvailability();
    const statusMessage = getAIStatusMessage(availability);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      availability: {
        available: availability.available,
        provider: availability.provider,
        reason: availability.reason,
        message: availability.message,
        statusMessage: statusMessage
      },
      details: {
        hasApiKey: !!process.env.OPENAI_API_KEY,
        testDescription: "This endpoint checks AI availability without consuming credits"
      }
    });
    
  } catch (error) {
    console.error("AI availability test error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to check AI availability",
      message: "An error occurred while checking AI service status"
    }, { status: 500 });
  }
} 
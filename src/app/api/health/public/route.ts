import { NextRequest, NextResponse } from "next/server";
import { checkAIAvailability, validateLLMConfig } from "@/lib/llm";

export async function GET(request: NextRequest) {
  try {
    const llmConfig = validateLLMConfig();
    const aiAvailability = await checkAIAvailability();
    const clerkConfigured = !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
    
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        ai: {
          configured: llmConfig.isValid,
          available: aiAvailability.available,
          provider: aiAvailability.provider,
          status: aiAvailability.available ? "operational" : "degraded",
          message: aiAvailability.message,
          reason: aiAvailability.reason
        },
        auth: {
          configured: clerkConfigured,
          provider: "clerk"
        },
        database: {
          configured: !!process.env.DATABASE_URL,
          status: "not_implemented"
        }
             },
       recommendations: [] as Array<{
         service: string;
         message: string;
         priority: string;
       }>
     };
    
    // Add recommendations
    if (!llmConfig.isValid) {
      health.recommendations.push({
        service: "llm",
        message: "Add OPENAI_API_KEY to environment variables for full AI functionality",
        priority: "medium"
      });
    }
    
    if (!clerkConfigured) {
      health.recommendations.push({
        service: "auth",
        message: "Configure Clerk authentication keys",
        priority: "high"
      });
    }
    
    const allCriticalHealthy = clerkConfigured; // Only auth is critical for basic functionality
    
    return NextResponse.json(health, { 
      status: allCriticalHealthy ? 200 : 503 
    });
    
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json({
      status: "unhealthy",
      error: "Health check failed",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 
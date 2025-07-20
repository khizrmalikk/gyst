import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkAIAvailability, validateLLMConfig } from "@/lib/llm";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
          provider: "clerk",
          status: clerkConfigured ? "operational" : "down"
        },
        database: {
          configured: !!process.env.DATABASE_URL,
          status: "not_implemented"
        }
      }
    };
    
    const allHealthy = clerkConfigured && aiAvailability.available;
    
    return NextResponse.json(health, { 
      status: allHealthy ? 200 : 503 
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
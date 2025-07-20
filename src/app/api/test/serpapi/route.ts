import { NextRequest, NextResponse } from "next/server";
import { serpAPIJobService } from "@/lib/services/serpapi";

export async function GET(request: NextRequest) {
  try {
    // Test SerpAPI availability
    const isAvailable = serpAPIJobService.isAvailable();
    
    if (!isAvailable) {
      return NextResponse.json({
        success: false,
        available: false,
        message: "SerpAPI is not configured. Add SERPAPI_API_KEY to your environment variables.",
        note: "Job search will use fallback mock data"
      });
    }

    // Perform a test search
    const testParams = {
      query: "software engineer",
      location: "San Francisco, CA",
      limit: 3
    };

    const searchResponse = await serpAPIJobService.searchJobs(testParams);
    
    return NextResponse.json({
      success: searchResponse.success,
      available: true,
      message: searchResponse.success 
        ? "SerpAPI is working correctly" 
        : "SerpAPI configuration issue",
      testSearch: {
        params: testParams,
        results: searchResponse.jobs.length,
        error: searchResponse.error,
        sampleJob: searchResponse.jobs[0] || null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("SerpAPI test error:", error);
    return NextResponse.json({
      success: false,
      available: false,
      error: "SerpAPI test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, location, remote, limit } = await request.json();
    
    if (!serpAPIJobService.isAvailable()) {
      return NextResponse.json({
        success: false,
        error: "SerpAPI is not configured"
      }, { status: 503 });
    }

    const searchParams = {
      query: query || "software engineer",
      location: location || "United States",
      remote: remote || false,
      limit: limit || 5
    };

    const searchResponse = await serpAPIJobService.searchJobs(searchParams);
    
    return NextResponse.json({
      success: searchResponse.success,
      results: searchResponse.jobs,
      total: searchResponse.total,
      error: searchResponse.error,
      searchParams: searchResponse.searchParams
    });
    
  } catch (error) {
    console.error("SerpAPI search test error:", error);
    return NextResponse.json({
      success: false,
      error: "Search test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 
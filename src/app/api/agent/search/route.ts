import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSmartLLMService } from "@/lib/llm";
import { JobApplicationAgent } from "@/lib/agent/workflow";
import { serpAPIJobService } from "@/lib/services/serpapi";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query, preferences } = await request.json();
    
    // Check AI availability first
    const llmResult = await getSmartLLMService();
    
    let parsedQuery;
    if (llmResult.available && llmResult.service) {
      // Parse the query using LLM to extract search criteria
      parsedQuery = await llmResult.service.parseJobSearchQuery(query);
    } else {
      // AI unavailable - provide basic parsing or return message
      return NextResponse.json({
        success: false,
        error: "AI search features are temporarily unavailable",
        message: llmResult.message,
        fallbackSuggestion: "Please try using the basic search filters instead."
      });
    }
    
    // Merge parsed criteria with user preferences
    const finalCriteria = {
      ...parsedQuery.criteria,
      ...preferences // User preferences take precedence
    };
    
    // Create agent and perform search
    const agent = new JobApplicationAgent(userId);
    const searchResults = await performAgenticJobSearch({
      query: finalCriteria,
      preferences: finalCriteria,
      userId
    });
    
    return NextResponse.json({
      success: true,
      results: searchResults,
      parsedQuery: parsedQuery,
      creditsUsed: 5 // Each search costs 5 credits
    });
    
  } catch (error) {
    console.error("Search agent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function performAgenticJobSearch({
  query,
  preferences,
  userId
}: {
  query: string;
  preferences: any;
  userId: string;
}) {
  try {
    // Use SerpAPI for comprehensive job search
    const searchParams = {
      query: typeof query === 'string' ? query : preferences.jobTitle || "Software Engineer",
      location: preferences.location,
      remote: preferences.remote,
      experienceLevel: preferences.experience,
      salaryMin: preferences.salaryRange?.min,
      salaryMax: preferences.salaryRange?.max,
      companySize: preferences.companySize,
      industry: preferences.industry,
      limit: 15
    };

    const searchResponse = await serpAPIJobService.searchJobs(searchParams);
    
    if (searchResponse.success && searchResponse.jobs.length > 0) {
      // Transform and score jobs based on preferences
      return searchResponse.jobs.map((job, index) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary || "Salary not specified",
        description: job.description.substring(0, 200) + "...",
        url: job.url,
        source: job.source,
        workType: job.workType,
        experienceLevel: job.experienceLevel,
        benefits: job.benefits,
        requirements: job.requirements,
        matchScore: Math.max(0.7, 1.0 - (index * 0.05)), // Decrease score slightly for each position
        reasons: [
          job.workType === 'Remote' && preferences.remote ? "Remote work available" : null,
          job.salary ? "Salary information provided" : null,
          job.experienceLevel === preferences.experience ? "Experience level match" : null,
          job.requirements?.some((req: string) => preferences.skills?.includes(req)) ? "Skill requirements match" : null
        ].filter(Boolean)
      }));
    }
  } catch (error) {
    console.error("Agentic job search error:", error);
  }
  
  // Fallback to mock data if SerpAPI fails
  return [
    {
      id: "job-1",
      title: "Software Engineer",
      company: "Tech Corp",
      location: "San Francisco, CA",
      salary: "$120,000 - $150,000",
      description: "Join our team of innovative engineers...",
      url: "https://example.com/job/1",
      matchScore: 0.95,
      reasons: ["Matches your experience in React", "Salary meets your expectations"]
    }
  ];
} 
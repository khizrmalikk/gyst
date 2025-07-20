import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSmartLLMService } from "@/lib/llm";
import { serpAPIJobService } from "@/lib/services/serpapi";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, context } = await request.json();
    
    // Log the user input for debugging
    console.log("User Message:", message);
    console.log("Conversation Context:", JSON.stringify(context, null, 2));
    
    // Check AI availability first to avoid wasting credits
    const llmResult = await getSmartLLMService();
    
    if (!llmResult.available) {
      // AI is unavailable - return user-friendly message
      return NextResponse.json({
        success: true,
        response: llmResult.message || "AI features are temporarily unavailable. Please try again later.",
        actions: [],
        aiUnavailable: true
      });
    }
    
    // AI is available - proceed with request
    if (!llmResult.service) {
      throw new Error("Service is null despite being available");
    }
    
    const response = await llmResult.service.generateChatResponse({
      userMessage: message,
      conversationHistory: context || [],
      context: {
        // TODO: Fetch user's recent searches and applications
        recentSearches: [],
        applications: []
      }
    });
    
    // Log the OpenAI response for debugging
    console.log("OpenAI Chat Response:", JSON.stringify(response, null, 2));
    
    // Check if this should trigger a job search
    const shouldSearch = response.suggestedActions?.some(action => action.type === 'search') || 
                        message.toLowerCase().includes('looking for') || 
                        message.toLowerCase().includes('job') || 
                        message.toLowerCase().includes('position');
    
    let searchResults = null;
    if (shouldSearch && (message.length > 20 || message.includes('engineer') || message.includes('manager'))) {
      try {
        // Parse the job criteria and trigger search
        const queryParsed = await llmResult.service.parseJobSearchQuery(message);
        console.log("Parsed job criteria:", JSON.stringify(queryParsed, null, 2));
        
        // Search for real jobs using SerpAPI
        let realJobs: any[] = [];
        try {
          const searchParams = {
            query: queryParsed.criteria.jobTitle || "Software Engineer",
            location: queryParsed.criteria.location,
            remote: queryParsed.criteria.remote,
            experienceLevel: queryParsed.criteria.experience,
            salaryMin: queryParsed.criteria.salaryRange?.min,
            salaryMax: queryParsed.criteria.salaryRange?.max,
            limit: 5
          };

          const searchResponse = await serpAPIJobService.searchJobs(searchParams);
          
          if (searchResponse.success && searchResponse.jobs.length > 0) {
            realJobs = searchResponse.jobs.map(job => ({
              id: job.id,
              title: job.title,
              company: job.company,
              location: job.location,
              salary: job.salary || "Salary not specified",
              remote: job.workType || (queryParsed.criteria.remote ? "Remote" : "On-site"),
              description: job.description.substring(0, 100) + "...",
              experience: job.experienceLevel || queryParsed.criteria.experience || "Not specified",
              url: job.url,
              source: job.source
            }));
            
            // Debug: Log the URLs being extracted
            console.log('Real jobs with URLs:');
            realJobs.forEach((job, index) => {
              console.log(`Job ${index + 1}: ${job.title} at ${job.company} - URL: ${job.url}`);
            });
          }
        } catch (error) {
          console.error("SerpAPI search error:", error);
        }

        // Fallback to mock jobs if no real jobs found
        const mockJobs = realJobs.length > 0 ? realJobs : [
          {
            id: "1",
            title: queryParsed.criteria.jobTitle || "Software Engineer",
            company: "TechCorp",
            location: queryParsed.criteria.location || "San Francisco, CA",
            salary: queryParsed.criteria.salaryRange ? `$${queryParsed.criteria.salaryRange.min || 80}k - $${queryParsed.criteria.salaryRange.max || 120}k` : "$80k - $120k",
            remote: queryParsed.criteria.remote ? "Remote" : "On-site",
            description: "Great opportunity for a software engineer...",
            experience: queryParsed.criteria.experience || "Entry-level",
            url: "https://techcorp.com/careers/software-engineer",
            source: "Mock"
          },
          {
            id: "2", 
            title: queryParsed.criteria.jobTitle || "Software Engineer",
            company: "StartupXYZ",
            location: queryParsed.criteria.location || "San Francisco, CA",
            salary: queryParsed.criteria.salaryRange ? `$${queryParsed.criteria.salaryRange.min || 80}k - $${queryParsed.criteria.salaryRange.max || 120}k` : "$90k - $130k",
            remote: queryParsed.criteria.remote ? "Remote" : "Hybrid",
            description: "Join our growing team...",
            experience: queryParsed.criteria.experience || "Entry-level",
            url: "https://startupxyz.com/jobs/software-engineer",
            source: "Mock"
          }
        ];
        
        searchResults = {
          criteria: queryParsed.criteria,
          intent: queryParsed.intent,
          confidence: queryParsed.confidence,
          jobs: mockJobs
        };
      } catch (error) {
        console.error("Error parsing job criteria:", error);
      }
    }
    
    return NextResponse.json({
      success: true,
      response: response.response,
      actions: response.suggestedActions,
      searchResults: searchResults
    });
    
  } catch (error) {
    console.error("Chat agent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

 
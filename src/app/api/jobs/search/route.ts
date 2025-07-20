import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { serpAPIJobService } from "@/lib/services/serpapi";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const location = searchParams.get("location") || "";
    const remote = searchParams.get("remote") === "true";
    
    // TODO: Implement job search integration
    const jobs = await searchJobs({ query, location, remote });
    
    return NextResponse.json({
      success: true,
      jobs,
      total: jobs.length
    });
    
  } catch (error) {
    console.error("Job search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Skip auth for extension (for now)
    const { query, location, limit = 10 } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const jobs = await searchJobs({ 
      query, 
      location: location || "", 
      remote: false 
    });
    
    return NextResponse.json({
      success: true,
      jobs: jobs.slice(0, limit),
      total: jobs.length
    });
    
  } catch (error) {
    console.error("Job search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function searchJobs({
  query,
  location,
  remote
}: {
  query: string;
  location: string;
  remote: boolean;
}) {
  try {
    // Use SerpAPI for job search
    const searchParams = {
      query: query,
      location: location,
      remote: remote,
      limit: 20
    };

    const response = await serpAPIJobService.searchJobs(searchParams);
    
    if (!response.success) {
      console.error('SerpAPI search failed:', response.error);
      // Return fallback mock data if SerpAPI fails
      return [
        {
          id: "job-1",
          title: "Senior Software Engineer",
          company: "TechCorp",
          location: remote ? "Remote" : location,
          salary: "$120,000 - $150,000",
          description: "We're looking for a senior software engineer...",
          postedAt: new Date().toISOString(),
          url: "https://example.com/job/1"
        },
        {
          id: "job-2",
          title: "Frontend Developer",
          company: "StartupXYZ",
          location: remote ? "Remote" : location,
          salary: "$90,000 - $120,000",
          description: "Join our frontend team...",
          postedAt: new Date().toISOString(),
          url: "https://example.com/job/2"
        }
      ];
    }

    // Transform SerpAPI results to match expected format
    return response.jobs.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary || 'Salary not specified',
      description: job.description,
      postedAt: job.postedDate || new Date().toISOString(),
      url: job.url,
      source: job.source,
      workType: job.workType,
      experienceLevel: job.experienceLevel,
      benefits: job.benefits,
      requirements: job.requirements
    }));
    
  } catch (error) {
    console.error('Job search error:', error);
    // Return fallback mock data on error
    return [
      {
        id: "job-1",
        title: "Senior Software Engineer",
        company: "TechCorp",
        location: remote ? "Remote" : location,
        salary: "$120,000 - $150,000",
        description: "We're looking for a senior software engineer...",
        postedAt: new Date().toISOString(),
        url: "https://example.com/job/1"
      }
    ];
  }
} 
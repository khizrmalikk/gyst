import { serpAPIJobService } from "@/lib/services/serpapi";

export interface JobSearchRequest {
  query: string;
  preferences: {
    location?: string;
    remote?: boolean;
    salary?: {
      min?: number;
      max?: number;
    };
    experience?: 'entry' | 'mid' | 'senior';
    company_size?: 'startup' | 'mid' | 'large';
    industry?: string[];
  };
  userId: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'pending' | 'applied' | 'interview' | 'rejected' | 'accepted';
  appliedAt: string;
  customizedResume?: string;
  coverLetter?: string;
  notes?: string;
}

export interface AgentTask {
  id: string;
  type: 'search' | 'apply' | 'follow_up' | 'analyze';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  data: any;
  createdAt: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

export class JobApplicationAgent {
  private tasks: AgentTask[] = [];
  
  constructor(private userId: string) {}
  
  async executeWorkflow(request: JobSearchRequest): Promise<{
    searchResults: any[];
    applications: JobApplication[];
    creditsUsed: number;
  }> {
    // Step 1: Search for jobs
    const searchTask = this.createTask('search', request);
    const searchResults = await this.executeSearch(searchTask);
    
    // Step 2: Filter and rank jobs
    const rankedJobs = await this.rankJobs(searchResults, request.preferences);
    
    // Step 3: Apply to top jobs (if user opted in)
    const applications: JobApplication[] = [];
    let creditsUsed = 5; // Base search cost
    
    for (const job of rankedJobs.slice(0, 5)) { // Apply to top 5
      const applicationTask = this.createTask('apply', { job, userId: this.userId });
      const application = await this.executeApplication(applicationTask);
      applications.push(application);
      creditsUsed += 1; // Each application costs 1 credit
    }
    
    return {
      searchResults: rankedJobs,
      applications,
      creditsUsed
    };
  }
  
  private createTask(type: AgentTask['type'], data: any): AgentTask {
    const task: AgentTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      status: 'pending',
      data,
      createdAt: new Date().toISOString()
    };
    
    this.tasks.push(task);
    return task;
  }
  
  private async executeSearch(task: AgentTask): Promise<any[]> {
    task.status = 'in_progress';
    
    try {
      const request = task.data as JobSearchRequest;
      
      // Use SerpAPI for job search
      const searchParams = {
        query: request.query,
        location: request.preferences.location,
        remote: request.preferences.remote,
        experienceLevel: request.preferences.experience,
        salaryMin: request.preferences.salary?.min,
        salaryMax: request.preferences.salary?.max,
        companySize: request.preferences.company_size,
        industry: request.preferences.industry,
        limit: 10
      };

      const searchResponse = await serpAPIJobService.searchJobs(searchParams);
      
      let results: any[] = [];
      
      if (searchResponse.success && searchResponse.jobs.length > 0) {
        results = searchResponse.jobs.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary || 'Salary not specified',
          description: job.description,
          url: job.url,
          source: job.source,
          workType: job.workType,
          experienceLevel: job.experienceLevel,
          benefits: job.benefits,
          requirements: job.requirements,
          postedDate: job.postedDate
        }));
      } else {
        // Fallback to mock data if SerpAPI fails
        console.warn('SerpAPI search failed, using fallback data:', searchResponse.error);
        results = [
          {
            id: 'job-1',
            title: 'Software Engineer',
            company: 'TechCorp',
            location: request.preferences.location || 'San Francisco, CA',
            salary: '$120,000 - $150,000',
            description: 'Looking for a software engineer...',
            url: 'https://example.com/job/1',
            source: 'fallback'
          }
        ];
      }
      
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = results;
      
      return results;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Job search execution error:', error);
      
      // Return minimal fallback data
      return [
        {
          id: 'job-error-1',
          title: 'Search Error',
          company: 'System',
          location: 'N/A',
          salary: 'N/A',
          description: 'Error occurred during job search',
          url: '',
          source: 'error'
        }
      ];
    }
  }
  
  private async rankJobs(jobs: any[], preferences: JobSearchRequest['preferences']): Promise<any[]> {
    // TODO: Implement ML-based job ranking
    // Factors to consider:
    // - Salary match
    // - Location preference
    // - Company rating
    // - Job description alignment
    // - Growth potential
    
    return jobs.map(job => ({
      ...job,
      matchScore: Math.random() * 100, // Placeholder
      reasons: ['Good salary match', 'Location preference met']
    })).sort((a, b) => b.matchScore - a.matchScore);
  }
  
  private async executeApplication(task: AgentTask): Promise<JobApplication> {
    task.status = 'in_progress';
    
    try {
      const { job } = task.data;
      
      // TODO: Implement actual application logic
      // This will:
      // 1. Scrape job details
      // 2. Generate tailored resume
      // 3. Write personalized cover letter
      // 4. Fill out application forms
      // 5. Submit application
      
      const application: JobApplication = {
        id: `app-${Date.now()}`,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'applied',
        appliedAt: new Date().toISOString(),
        customizedResume: 'path/to/resume.pdf',
        coverLetter: 'Generated cover letter content...',
        notes: 'Applied automatically via agent'
      };
      
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = application;
      
      return application;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }
  
  getTasks(): AgentTask[] {
    return this.tasks;
  }
  
  getTaskById(id: string): AgentTask | undefined {
    return this.tasks.find(task => task.id === id);
  }
} 
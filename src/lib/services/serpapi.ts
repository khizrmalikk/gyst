const { getJson } = require('serpapi');

export interface SerpJobSearchParams {
  query: string;
  location?: string;
  remote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: 'entry' | 'mid' | 'senior';
  companySize?: 'startup' | 'mid' | 'large';
  industry?: string[];
  limit?: number;
}

export interface SerpJobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  source: string;
  postedDate?: string;
  workType?: string;
  experienceLevel?: string;
  companySize?: string;
  industry?: string;
  benefits?: string[];
  requirements?: string[];
}

export interface SerpJobSearchResponse {
  jobs: SerpJobResult[];
  total: number;
  searchParams: SerpJobSearchParams;
  success: boolean;
  error?: string;
}

export class SerpAPIJobService {
  private apiKey: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = process.env.SERPAPI_API_KEY || '';
    this.isConfigured = !!this.apiKey;
  }

  /**
   * Check if SerpAPI is configured and available
   */
  public isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Search for jobs using SerpAPI Google Jobs integration
   */
  public async searchJobs(params: SerpJobSearchParams): Promise<SerpJobSearchResponse> {
    if (!this.isConfigured) {
      return {
        jobs: [],
        total: 0,
        searchParams: params,
        success: false,
        error: 'SerpAPI is not configured. Please add SERPAPI_API_KEY to your environment variables.'
      };
    }

    try {
      // Build the search query
      const searchQuery = this.buildSearchQuery(params);
      
      // Configure SerpAPI parameters (removed deprecated 'start' parameter)
      const serpParams = {
        engine: 'google_jobs',
        q: searchQuery,
        location: params.location || 'United States',
        api_key: this.apiKey,
        num: params.limit || 10,
        hl: 'en',
        gl: 'us'
      };

      console.log('SerpAPI Search Parameters:', serpParams);

      // Make the API call using the correct serpapi package
      const response = await getJson(serpParams);
      
      console.log('SerpAPI Raw Response:', JSON.stringify(response, null, 2));

      // Process the results
      const jobs = this.processJobResults(response.jobs_results || [], params);
      
      return {
        jobs,
        total: response.jobs_results?.length || 0,
        searchParams: params,
        success: true
      };

    } catch (error) {
      console.error('SerpAPI Error:', error);
      return {
        jobs: [],
        total: 0,
        searchParams: params,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Build a search query string from search parameters
   */
  private buildSearchQuery(params: SerpJobSearchParams): string {
    let query = params.query;

    // Add location if not already in query
    if (params.location && !query.toLowerCase().includes(params.location.toLowerCase())) {
      query += ` ${params.location}`;
    }

    // Add remote preference
    if (params.remote) {
      query += ' remote';
    }

    // Add experience level
    if (params.experienceLevel) {
      const levelMap = {
        entry: 'entry level junior',
        mid: 'mid level experienced',
        senior: 'senior'
      };
      query += ` ${levelMap[params.experienceLevel]}`;
    }

    // Add salary range
    if (params.salaryMin || params.salaryMax) {
      const salaryQuery = [];
      if (params.salaryMin) salaryQuery.push(`$${params.salaryMin}k+`);
      if (params.salaryMax) salaryQuery.push(`under $${params.salaryMax}k`);
      query += ` salary ${salaryQuery.join(' ')}`;
    }

    // Add company size
    if (params.companySize) {
      const sizeMap = {
        startup: 'startup',
        mid: 'mid size company',
        large: 'large company enterprise'
      };
      query += ` ${sizeMap[params.companySize]}`;
    }

    // Add industry
    if (params.industry && params.industry.length > 0) {
      query += ` ${params.industry.join(' ')}`;
    }

    return query.trim();
  }

  /**
   * Process and normalize job results from SerpAPI
   */
  private processJobResults(results: any[], params: SerpJobSearchParams): SerpJobResult[] {
    return results.map((job, index) => ({
      id: job.job_id || `job-${index}`,
      title: job.title || 'Untitled Position',
      company: job.company_name || 'Unknown Company',
      location: job.location || params.location || 'Location not specified',
      salary: this.extractSalary(job),
      description: job.description || job.snippet || 'No description available',
      url: this.extractJobUrl(job),
      source: job.via || 'Google Jobs',
      postedDate: job.detected_extensions?.posted_at || job.posted_at,
      workType: this.extractWorkType(job),
      experienceLevel: this.extractExperienceLevel(job),
      companySize: this.extractCompanySize(job),
      industry: this.extractIndustry(job),
      benefits: this.extractBenefits(job),
      requirements: this.extractRequirements(job)
    }));
  }

  /**
   * Extract job URL from various possible sources
   */
  private extractJobUrl(job: any): string {
    // First priority: apply_options array (contains actual application URLs)
    if (job.apply_options && Array.isArray(job.apply_options) && job.apply_options.length > 0) {
      const firstApplyOption = job.apply_options[0];
      if (firstApplyOption && firstApplyOption.link && firstApplyOption.link.startsWith('http')) {
        console.log(`Using apply_options URL: ${firstApplyOption.link}`);
        return firstApplyOption.link;
      }
    }

    // Second priority: try other URL sources
    const urlSources = [
      // Try related_links
      job.related_links?.find((link: any) => link.link)?.link,
      // Try apply_link
      job.apply_link,
      // Try extensions
      job.detected_extensions?.apply_link,
      // Try share_link
      job.share_link,
      // Try job_link
      job.job_link,
      // Try extensions again with different field names
      job.detected_extensions?.job_link,
      job.detected_extensions?.link,
      // Try via_link
      job.via_link
    ];

    // Find the first valid URL that's not a Google Jobs URL
    for (const url of urlSources) {
      if (url && typeof url === 'string' && url.trim() && url.startsWith('http') && !url.includes('google.com/search')) {
        console.log(`Using alternative URL: ${url}`);
        return url.trim();
      }
    }

    // If no valid URL found, return a fallback
    console.log(`No direct URL found, using fallback for ${job.title} at ${job.company_name}`);
    return this.generateFallbackUrl(job);
  }

  /**
   * Generate a fallback URL for jobs without direct apply links
   */
  private generateFallbackUrl(job: any): string {
    const company = job.company_name || 'company';
    const title = job.title || 'job';
    
    // Create a search URL as fallback
    const searchQuery = encodeURIComponent(`${title} ${company} careers`);
    return `https://www.google.com/search?q=${searchQuery}`;
  }

  /**
   * Extract salary information from job data
   */
  private extractSalary(job: any): string | undefined {
    if (job.salary) {
      return job.salary;
    }
    
    if (job.detected_extensions?.salary) {
      return job.detected_extensions.salary;
    }

    // Try to extract from description
    const description = job.description || job.snippet || '';
    const salaryMatch = description.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per|\/)\s*(?:year|annually|hour|hourly))?/i);
    return salaryMatch ? salaryMatch[0] : undefined;
  }

  /**
   * Extract work type (remote, hybrid, onsite)
   */
  private extractWorkType(job: any): string | undefined {
    const text = `${job.title} ${job.description || job.snippet || ''}`.toLowerCase();
    
    if (text.includes('remote')) return 'Remote';
    if (text.includes('hybrid')) return 'Hybrid';
    if (text.includes('on-site') || text.includes('onsite') || text.includes('office')) return 'On-site';
    
    return undefined;
  }

  /**
   * Extract experience level from job data
   */
  private extractExperienceLevel(job: any): string | undefined {
    const text = `${job.title} ${job.description || job.snippet || ''}`.toLowerCase();
    
    if (text.includes('senior') || text.includes('lead') || text.includes('principal')) return 'Senior';
    if (text.includes('junior') || text.includes('entry') || text.includes('graduate')) return 'Entry';
    if (text.includes('mid') || text.includes('intermediate')) return 'Mid';
    
    return undefined;
  }

  /**
   * Extract company size indicators
   */
  private extractCompanySize(job: any): string | undefined {
    const text = `${job.company_name} ${job.description || job.snippet || ''}`.toLowerCase();
    
    if (text.includes('startup') || text.includes('small')) return 'Startup';
    if (text.includes('enterprise') || text.includes('fortune') || text.includes('large')) return 'Large';
    
    return undefined;
  }

  /**
   * Extract industry from job data
   */
  private extractIndustry(job: any): string | undefined {
    const text = `${job.company_name} ${job.description || job.snippet || ''}`.toLowerCase();
    
    const industries = [
      'technology', 'tech', 'software', 'fintech', 'healthcare', 'finance',
      'education', 'retail', 'manufacturing', 'consulting', 'media', 'nonprofit'
    ];
    
    for (const industry of industries) {
      if (text.includes(industry)) {
        return industry.charAt(0).toUpperCase() + industry.slice(1);
      }
    }
    
    return undefined;
  }

  /**
   * Extract benefits from job description
   */
  private extractBenefits(job: any): string[] {
    const text = `${job.description || job.snippet || ''}`.toLowerCase();
    const benefits: string[] = [];
    
    const benefitKeywords = [
      'health insurance', 'dental', 'vision', '401k', 'retirement',
      'paid time off', 'pto', 'vacation', 'flexible schedule',
      'remote work', 'work from home', 'stock options', 'equity'
    ];
    
    benefitKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        benefits.push(keyword);
      }
    });
    
    return benefits;
  }

  /**
   * Extract requirements from job description
   */
  private extractRequirements(job: any): string[] {
    const text = `${job.description || job.snippet || ''}`.toLowerCase();
    const requirements: string[] = [];
    
    const techSkills = [
      'javascript', 'python', 'java', 'react', 'node.js', 'typescript',
      'aws', 'docker', 'kubernetes', 'sql', 'mongodb', 'git'
    ];
    
    techSkills.forEach(skill => {
      if (text.includes(skill)) {
        requirements.push(skill);
      }
    });
    
    return requirements;
  }
}

// Create and export a singleton instance
export const serpAPIJobService = new SerpAPIJobService(); 
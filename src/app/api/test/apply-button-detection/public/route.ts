import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { WebsiteCheckerAgent } from '@/lib/agents/website-checker';
import { AgentContext } from '@/lib/agents/types';

export async function GET() {
  let browser;
  let page;
  
  try {
    // Launch a browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    page = await browser.newPage();
    
    // Test job sites that commonly have apply buttons
    const testSites = [
      'https://dailyremote.com/remote-job/fullstack-software-engineer-junior-level-3649140',
      'https://www.indeed.com/viewjob?jk=test123', // This will 404 but we can test the detection
      'https://jobs.github.com/positions' // GitHub jobs page
    ];
    
    let testResults = [];
    
    for (const site of testSites) {
      try {
        console.log(`Testing apply button detection on: ${site}`);
        
        // Create a mock agent context
        const mockContext: AgentContext = {
          workflowId: 'test-workflow',
          userId: 'test-user',
          userProfile: {
            fullName: 'Test User',
            email: 'test@example.com',
            phone: '555-0123',
            location: 'Remote'
          },
          tools: {
            browser: null as any,
            llm: null as any,
            database: null as any
          }
        };
        
        const websiteChecker = new WebsiteCheckerAgent(mockContext);
        
        // Navigate to the site
        await page.goto(site, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        
        // Test the website checking with enhanced apply button detection
        const result = await (websiteChecker as any).checkWebsite(page, site);
        
        testResults.push({
          site,
          accessible: result.accessible,
          hasJobApplication: result.hasJobApplication,
          applicationFormUrl: result.applicationFormUrl,
          success: result.accessible && result.hasJobApplication,
          error: result.errorMessage || null
        });
        
      } catch (error) {
        testResults.push({
          site,
          accessible: false,
          hasJobApplication: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }
    
    await browser.close();
    
    return NextResponse.json({
      success: true,
      message: 'Apply button detection test completed',
      results: testResults,
      summary: {
        totalSites: testSites.length,
        successfulSites: testResults.filter(r => r.success).length,
        sitesWithApplyButtons: testResults.filter(r => r.hasJobApplication).length,
        accessibleSites: testResults.filter(r => r.accessible).length
      }
    });
    
  } catch (error) {
    if (browser) await browser.close();
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Apply button detection test failed'
    }, { status: 500 });
  }
} 
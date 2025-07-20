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
    
    // Test the specific site that's failing
    const testSite = 'https://dailyremote.com/remote-job/junior-f-e-software-engineer-hybrid-23684-with-security-clearance-3822603';
    
    console.log(`Testing enhanced apply button detection on: ${testSite}`);
    
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
    await page.goto(testSite, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Manually check what elements are on the page
    const debugInfo = {
      allButtons: await page.locator('button').count(),
      allLinks: await page.locator('a').count(),
      elementsWithApplyText: await page.locator('*:has-text("apply", { ignoreCase: true })').count(),
      applyNowElements: await page.locator('*:has-text("apply now", { ignoreCase: true })').count(),
      buttonWithApplyText: await page.locator('button:has-text("apply", { ignoreCase: true })').count(),
      linkWithApplyText: await page.locator('a:has-text("apply", { ignoreCase: true })').count(),
      divWithApplyText: await page.locator('div:has-text("apply", { ignoreCase: true })').count(),
      spanWithApplyText: await page.locator('span:has-text("apply", { ignoreCase: true })').count()
    };
    
    // Get text content of first few apply elements
    const applyElements = await page.locator('*:has-text("apply", { ignoreCase: true })').all();
    const elementDetails = [];
    
    for (let i = 0; i < Math.min(applyElements.length, 10); i++) {
      const element = applyElements[i];
      const text = await element.textContent().catch(() => '') || '';
      const tagName = await element.evaluate(el => el.tagName).catch(() => '');
      const id = await element.getAttribute('id').catch(() => null);
      const className = await element.getAttribute('class').catch(() => null);
      const isVisible = await element.isVisible().catch(() => false);
      const isEnabled = await element.isEnabled().catch(() => false);
      
      if (text.length <= 50) { // Only include shorter text elements
        elementDetails.push({
          index: i,
          tagName,
          text: text.trim(),
          id,
          className,
          isVisible,
          isEnabled,
          textLength: text.length
        });
      }
    }
    
    // Test the website checking with enhanced apply button detection
    const result = await (websiteChecker as any).checkWebsite(page, testSite);
    
    await browser.close();
    
    return NextResponse.json({
      success: true,
      message: 'Apply button debug test completed',
      testSite,
      debugInfo,
      elementDetails,
      result: {
        accessible: result.accessible,
        hasJobApplication: result.hasJobApplication,
        applicationFormUrl: result.applicationFormUrl,
        error: result.errorMessage || null
      }
    });
    
  } catch (error) {
    if (browser) await browser.close();
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Apply button debug test failed'
    }, { status: 500 });
  }
} 
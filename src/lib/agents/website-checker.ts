import { BaseAgent } from './base-agent';
import { AgentResult, AgentTask, AgentContext, AgentType, WebsiteCheckResult, FormElement } from './types';
import { Page } from 'playwright';
import { AIVisionService } from '@/lib/llm/vision';
import { DialogHandler } from './dialog-handler';

export class WebsiteCheckerAgent extends BaseAgent {
  private aiVision: AIVisionService;
  private dialogHandler: DialogHandler;

  constructor(context: AgentContext) {
    super(AgentType.WEBSITE_CHECKER, context);
    this.aiVision = new AIVisionService();
    this.dialogHandler = new DialogHandler();
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    await this.log(`Starting website check for: ${task.jobUrl}`);
    
    let page: Page | null = null;
    
    try {
      page = await this.context.tools.browser.newPage();
      
      if (!page) {
        return this.createErrorResult('Failed to create browser page', 'Browser page is null', true);
      }
      
      // Set viewport size (user agent is set at browser context level)
      await page.setViewportSize({ width: 1280, height: 720 });
      
      const result = await this.checkWebsite(page, task.jobUrl);
      
      await this.log(`Website check completed for: ${task.jobUrl}`);
      
      return this.createSuccessResult('Website check completed', result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.log(`Website check failed for ${task.jobUrl}: ${errorMessage}`, 'error');
      return this.createErrorResult('Website check failed', errorMessage, true);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private async checkWebsite(page: Page, url: string): Promise<WebsiteCheckResult> {
    const result: WebsiteCheckResult = {
      accessible: false,
      hasJobApplication: false,
      screenshots: []
    };

    try {
      // Navigate to the URL with a more lenient wait condition and longer timeout
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', // Changed from 'networkidle' to be less strict
        timeout: 60000 // Increased timeout
      });

      result.accessible = true;
      await this.log(`Successfully accessed: ${url}`);

      // Take initial screenshot
      const screenshotPath = await this.takeScreenshot(page, 'initial-load');
      if (screenshotPath) {
        result.screenshots!.push(screenshotPath);
      }

      // Wait a bit for dynamic content to load
      await page.waitForTimeout(3000);

      // Check for job application elements on current page first
      await this.log('🔍 Checking current page for job application forms...');
      let applicationCheck = await this.findJobApplicationForm(page);
      
      if (!applicationCheck.found) {
        await this.log('❌ No form found on current page, trying AI navigation...');
        
        // If no form found, try to find and click "Apply" buttons to navigate to application form
        const navigationResult = await this.navigateToApplicationForm(page);
        if (navigationResult.success) {
          await this.log(`✅ Successfully navigated to application form: ${navigationResult.url}`);
          
          // Take screenshot after navigation
          const navScreenshot = await this.takeScreenshot(page, 'after-navigation');
          if (navScreenshot) {
            result.screenshots!.push(navScreenshot);
          }
          
          // Check for form on the new page
          applicationCheck = await this.findJobApplicationForm(page);
        } else {
          await this.log('❌ AI navigation failed, no apply button found');
        }
      } else {
        await this.log('✅ Found job application form on current page, skipping navigation');
      }

      result.hasJobApplication = applicationCheck.found;
      result.applicationFormUrl = applicationCheck.formUrl || page.url();
      result.formElements = applicationCheck.elements;

      if (result.hasJobApplication) {
        await this.log(`Found job application form at: ${result.applicationFormUrl}`);
        
        // Take screenshot of application form
        const formScreenshot = await this.takeScreenshot(page, 'application-form');
        if (formScreenshot) {
          result.screenshots!.push(formScreenshot);
        }
      } else {
        await this.log(`No job application form found on: ${url}`);
      }

    } catch (error) {
      result.accessible = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errorMessage = errorMessage;
      await this.log(`Error accessing ${url}: ${errorMessage}`, 'error');
      
      // Try to take a screenshot even if there's an error
      try {
        const errorScreenshot = await this.takeScreenshot(page, 'error');
        if (errorScreenshot) {
          result.screenshots!.push(errorScreenshot);
        }
      } catch (screenshotError) {
        // Ignore screenshot errors
      }
    }

    return result;
  }

  private async navigateToApplicationForm(page: Page): Promise<{
    success: boolean;
    url?: string;
  }> {
    try {
      await this.log('🤖 Starting AI-powered navigation with dialog handling...');
      
      // First, use dialog handler to automatically close common dialogs
      await this.log('🛡️ Automatically handling common dialogs...');
      const dialogResult = await this.dialogHandler.handleCommonDialogs(page);
      if (dialogResult.dialogsHandled > 0) {
        await this.log(`✅ Closed ${dialogResult.dialogsHandled} dialogs: ${dialogResult.dialogsFound.join(', ')}`);
        await page.waitForTimeout(2000); // Wait for page to settle
      }
      
      // Take screenshot for AI analysis
      await this.log('📸 Taking screenshot for AI analysis...');
      const screenshotBuffer = await page.screenshot({ fullPage: false });
      const screenshotBase64 = this.aiVision.screenshotToBase64(screenshotBuffer);
      
      // Get page HTML for additional context
      await this.log('📄 Getting page HTML for context...');
      const pageHTML = await page.content();
      
      // Ask AI to analyze the page and find dialogs or apply buttons
      await this.log('🔍 Sending to AI for dialog and apply button analysis...');
      const suggestion = await this.aiVision.analyzeForApplyButton(
        screenshotBase64,
        page.url(),
        pageHTML
      );
      
      // Handle dialogs first if AI detected any
      if (suggestion.hasDialog && suggestion.dialogAction.shouldClick && suggestion.dialogAction.selector) {
        await this.log(`🚪 AI detected dialog: ${suggestion.dialogAction.reason}`);
        
        try {
          const dialogElement = page.locator(suggestion.dialogAction.selector).first();
          if (await dialogElement.isVisible()) {
            await dialogElement.click({ timeout: 5000 });
            await this.log(`✅ Closed dialog: ${suggestion.dialogAction.reason}`);
            
            // Wait for dialog to close and page to settle
            await page.waitForTimeout(3000);
            
            // Take a new screenshot after closing the dialog
            const newScreenshotBuffer = await page.screenshot({ fullPage: false });
            const newScreenshotBase64 = this.aiVision.screenshotToBase64(newScreenshotBuffer);
            const newPageHTML = await page.content();
            
            // Re-analyze for apply buttons
            const newSuggestion = await this.aiVision.analyzeForApplyButton(
              newScreenshotBase64,
              page.url(),
              newPageHTML
            );
            
            // Use the new suggestion for apply button detection
            return this.handleApplyButtonClick(page, newSuggestion.applyAction);
          }
        } catch (error) {
          await this.log(`❌ Failed to close dialog: ${error}`, 'error');
        }
      }
      
      // Handle apply button (either initially or after closing dialog)
      return this.handleApplyButtonClick(page, suggestion.applyAction);
      
    } catch (error) {
      await this.log(`AI-powered navigation failed: ${error}`, 'error');
      return { success: false };
    }
  }

  private async handleApplyButtonClick(page: Page, applyAction: any): Promise<{
    success: boolean;
    url?: string;
  }> {
    if (!applyAction.shouldClick || !applyAction.selector) {
      await this.log('❌ AI did not find a suitable apply button to click');
      return await this.tryFallbackApplyButtons(page);
    }
    
    if (applyAction.confidence < 70) {
      await this.log(`⚠️ AI confidence too low (${applyAction.confidence}%), trying fallback methods`);
      return await this.tryFallbackApplyButtons(page);
    }
    
    await this.log(`🎯 AI Analysis: ${applyAction.reason} (confidence: ${applyAction.confidence}%)`);
    
    // Try to click the AI-suggested element
    const beforeUrl = page.url();
    
    try {
      await this.log(`🖱️ Attempting to click AI-suggested element: ${applyAction.selector}`);
      
      // First, let's debug what elements are actually on the page
      await this.debugPageElements(page);
      
      const element = page.locator(applyAction.selector).first();
      
      // Verify element exists and is visible with proper timeout
      const isVisible = await element.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (!isVisible) {
        await this.log(`❌ AI-suggested element is not visible: ${applyAction.selector}`);
        // Try case variations
        const caseVariations = [
          applyAction.selector.replace(/has-text\("([^"]+)"\)/g, 'has-text("$1")'), // exact same
          applyAction.selector.replace(/has-text\("([^"]+)"\)/g, (match: string, text: string) => `has-text("${text.toUpperCase()}")`), // uppercase
          applyAction.selector.replace(/has-text\("([^"]+)"\)/g, (match: string, text: string) => `has-text("${text.toLowerCase()}")`), // lowercase
        ];
        
        for (const caseVariation of caseVariations) {
          await this.log(`🔄 Trying case variation: ${caseVariation}`);
          
          const caseElement = page.locator(caseVariation).first();
          const caseVisible = await caseElement.isVisible({ timeout: 2000 }).catch(() => false);
          
          if (caseVisible) {
            await this.log(`✅ Case variation found the element!`);
            await caseElement.click({ timeout: 10000 });
            
            // Wait for navigation or content change
            await Promise.race([
              page.waitForURL(url => url.href !== beforeUrl, { timeout: 15000 }),
              page.waitForTimeout(5000)
            ]);
            
            const afterUrl = page.url();
            if (afterUrl !== beforeUrl) {
              await this.log(`✅ Case variation worked with navigation`);
              return { success: true, url: afterUrl };
            } else {
              await this.log(`✅ Case variation clicked (SPA navigation)`);
              return { success: true, url: afterUrl };
            }
          }
        }
        
        throw new Error('AI-suggested element is not visible');
      }
      
      // Check if element is clickable
      const isEnabled = await element.isEnabled().catch(() => false);
      if (!isEnabled) {
        await this.log(`❌ AI-suggested element is not enabled: ${applyAction.selector}`);
        throw new Error('AI-suggested element is not enabled');
      }
      
      // Click the element
      await element.click({ timeout: 10000 });
      
      // Wait for navigation or content change
      await Promise.race([
        page.waitForURL(url => url.href !== beforeUrl, { timeout: 15000 }),
        page.waitForTimeout(5000)
      ]);
      
      const afterUrl = page.url();
      
      if (afterUrl !== beforeUrl) {
        await this.log(`✅ Successfully navigated from ${beforeUrl} to ${afterUrl}`);
        return { success: true, url: afterUrl };
      } else {
        await this.log('✅ Page content may have changed (SPA navigation)');
        return { success: true, url: afterUrl };
      }
      
    } catch (primaryError) {
      await this.log(`❌ Primary selector failed: ${primaryError}`, 'error');
      
      // Try alternative selectors if provided
      if (applyAction.alternativeSelectors && applyAction.alternativeSelectors.length > 0) {
        for (const altSelector of applyAction.alternativeSelectors) {
          try {
            await this.log(`🔄 Trying alternative selector: ${altSelector}`);
            
            const altElement = page.locator(altSelector).first();
            const isVisible = await altElement.isVisible({ timeout: 2000 }).catch(() => false);
            const isEnabled = await altElement.isEnabled().catch(() => false);
            
            if (isVisible && isEnabled) {
              await altElement.click({ timeout: 5000 });
              
              await Promise.race([
                page.waitForURL(url => url.href !== beforeUrl, { timeout: 10000 }),
                page.waitForTimeout(3000)
              ]);
              
              const finalUrl = page.url();
              await this.log(`✅ Alternative selector worked: ${altSelector}`);
              return { success: true, url: finalUrl };
            } else {
              await this.log(`❌ Alternative selector not clickable: ${altSelector}`);
            }
          } catch (altError) {
            await this.log(`❌ Alternative selector ${altSelector} failed: ${altError}`, 'error');
            continue;
          }
        }
      }
      
      // If all AI suggestions failed, try fallback methods
      await this.log('🔄 All AI suggestions failed, trying fallback methods...');
      return await this.tryFallbackApplyButtons(page);
    }
  }

  private async tryFallbackApplyButtons(page: Page): Promise<{
    success: boolean;
    url?: string;
  }> {
    await this.log('🔄 Trying fallback apply button detection...');
    
    // Common apply button patterns to try
    const fallbackSelectors = [
      // Exact text matching (most reliable)
      'button:has-text("Apply Now")',
      'a:has-text("Apply Now")',
      'button:has-text("Apply")',
      'a:has-text("Apply")',
      'button:has-text("Apply for this Job")',
      'a:has-text("Apply for this Job")',
      'button:has-text("Quick Apply")',
      'a:has-text("Quick Apply")',
      'button:has-text("Start Application")',
      'a:has-text("Start Application")',
      
      // Case variations
      'button:has-text("APPLY NOW")',
      'a:has-text("APPLY NOW")',
      'button:has-text("apply now")',
      'a:has-text("apply now")',
      'button:has-text("APPLY")',
      'a:has-text("APPLY")',
      'button:has-text("apply")',
      'a:has-text("apply")',
      
      // Different element types
      'div:has-text("Apply Now")',
      'span:has-text("Apply Now")',
      'div:has-text("Apply")',
      'span:has-text("Apply")',
      
      // ID-based selectors
      '#apply-button',
      '#apply-now',
      '#job-apply',
      '#apply-btn',
      '#apply_button',
      '#apply_now',
      
      // Data attribute selectors
      '[data-testid*="apply"]',
      '[data-action="apply"]',
      '[data-apply="true"]',
      '[data-cy*="apply"]',
      
      // Href patterns
      'a[href*="apply"]',
      'a[href*="application"]',
      'a[href*="job-apply"]',
      
      // Class-based selectors (less reliable)
      '.apply-btn',
      '.apply-button',
      '.job-apply-button',
      '.btn-apply',
      '.apply-now',
      '.apply-link'
    ];
    
    const beforeUrl = page.url();
    
    for (const selector of fallbackSelectors) {
      try {
        await this.log(`🔍 Trying fallback selector: ${selector}`);
        
        const element = page.locator(selector).first();
        const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
        const isEnabled = await element.isEnabled().catch(() => false);
        
        if (isVisible && isEnabled) {
          await this.log(`✅ Found clickable element: ${selector}`);
          await element.click({ timeout: 5000 });
          
          // Wait for navigation or content change
          await Promise.race([
            page.waitForURL(url => url.href !== beforeUrl, { timeout: 10000 }),
            page.waitForTimeout(3000)
          ]);
          
          const afterUrl = page.url();
          
          if (afterUrl !== beforeUrl) {
            await this.log(`✅ Fallback selector worked: ${selector}`);
            return { success: true, url: afterUrl };
          } else {
            await this.log(`✅ Page content may have changed with fallback: ${selector}`);
            return { success: true, url: afterUrl };
          }
        }
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }
    
    // Last resort: try to click any element containing "apply" text
    await this.log('🔄 Last resort: searching for any clickable element with "apply" text...');
    
    try {
      // Try different text variations for apply elements
      const applyTextVariations = [
        'Apply Now',
        'Apply',
        'APPLY NOW',
        'APPLY',
        'apply now',
        'apply',
        'Apply for this Job',
        'Quick Apply',
        'Start Application'
      ];
      
      for (const applyText of applyTextVariations) {
        try {
          const elements = await page.locator(`*:has-text("${applyText}")`).all();
          await this.log(`Found ${elements.length} elements with "${applyText}" text`);
          
          for (let i = 0; i < Math.min(elements.length, 5); i++) {
            const element = elements[i];
            try {
              const text = await element.textContent().catch(() => '') || '';
              const tagName = await element.evaluate(el => el.tagName).catch(() => '');
              
              // Skip if text is too long (likely contains other content)
              if (text.length > 50) continue;
              
              // Check if it's a reasonable apply button
              if (text.trim().toLowerCase().includes('apply')) {
                const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
                const isEnabled = await element.isEnabled().catch(() => false);
                
                if (isVisible && isEnabled) {
                  await this.log(`🎯 Found potential apply element: <${tagName}> "${text}"`);
                  await element.click({ timeout: 5000 });
                  
                  // Wait for navigation or content change
                  await Promise.race([
                    page.waitForURL(url => url.href !== beforeUrl, { timeout: 10000 }),
                    page.waitForTimeout(3000)
                  ]);
                  
                  const afterUrl = page.url();
                  if (afterUrl !== beforeUrl) {
                    await this.log(`✅ Last resort method worked: <${tagName}> "${text}"`);
                    return { success: true, url: afterUrl };
                  } else {
                    await this.log(`✅ Last resort clicked (SPA): <${tagName}> "${text}"`);
                    return { success: true, url: afterUrl };
                  }
                }
              }
            } catch (error) {
              continue;
            }
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      await this.log(`Last resort method failed: ${error}`, 'error');
    }
    
    await this.log('❌ No clickable apply buttons found with fallback methods');
    return { success: false };
  }

  private async findJobApplicationForm(page: Page): Promise<{
    found: boolean;
    formUrl?: string;
    elements?: FormElement[];
  }> {
    try {
      await this.log('🔍 Looking for actual application forms (not just links)...');
      
      // Look for forms first (much more reliable than links)
      const forms = await page.$$('form');
      
      for (const form of forms) {
        const formHtml = await form.innerHTML();
        const formText = await form.textContent();
        
        // Check if form contains actual application form fields (not just keywords)
        const hasApplicationFields = 
          formHtml.toLowerCase().includes('name') && 
          formHtml.toLowerCase().includes('email') && 
          (formHtml.toLowerCase().includes('resume') || 
           formHtml.toLowerCase().includes('experience') || 
           formHtml.toLowerCase().includes('cover') ||
           formHtml.toLowerCase().includes('phone'));

        if (hasApplicationFields) {
          await this.log('✅ Found actual application form with required fields');
          const elements = await this.extractFormElements(form);
          return {
            found: true,
            formUrl: page.url(),
            elements
          };
        }
      }

      await this.log('❌ No actual application forms found on current page');
      return { found: false };
      
    } catch (error) {
      await this.log(`Error finding job application form: ${error}`, 'error');
      return { found: false };
    }
  }

  private async extractFormElements(form: any): Promise<FormElement[]> {
    const elements: FormElement[] = [];
    
    try {
      // Extract input elements
      const inputs = await form.$$('input, textarea, select');
      
      for (const input of inputs) {
        const type = await input.getAttribute('type') || 'text';
        const name = await input.getAttribute('name') || '';
        const id = await input.getAttribute('id') || '';
        const placeholder = await input.getAttribute('placeholder') || '';
        const required = await input.getAttribute('required') !== null;
        
        // Try to find label
        let label = '';
        if (id) {
          const labelElement = await form.$(`label[for="${id}"]`);
          if (labelElement) {
            label = await labelElement.textContent() || '';
          }
        }
        
        // If no label found, check for nearby text
        if (!label) {
          const parent = await input.evaluateHandle((el: any) => el.parentElement);
          if (parent) {
            const parentText = await parent.textContent();
            if (parentText) {
              label = parentText.trim().substring(0, 100); // Limit label length
            }
          }
        }

        // Get options for select elements
        let options: string[] = [];
        if (type === 'select') {
          const optionElements = await input.$$('option');
          for (const option of optionElements) {
            const value = await option.getAttribute('value') || '';
            const text = await option.textContent() || '';
            if (value || text) {
              options.push(text || value);
            }
          }
        }

        elements.push({
          type,
          name,
          id,
          label: label.trim(),
          placeholder,
          required,
          options: options.length > 0 ? options : undefined
        });
      }
    } catch (error) {
      await this.log(`Error extracting form elements: ${error}`, 'error');
    }
    
    return elements;
  }

  private async debugPageElements(page: Page): Promise<void> {
    try {
      await this.log('🔍 Debugging page elements...');
      
      // Check for buttons specifically
      const buttons = await page.locator('button').all();
      await this.log(`Found ${buttons.length} button elements`);
      
      // Check for links
      const links = await page.locator('a').all();
      await this.log(`Found ${links.length} link elements`);
      
      // Check for elements with "Apply Now" specifically
      const applyNowButtons = await page.locator('button:has-text("Apply Now")').all();
      await this.log(`Found ${applyNowButtons.length} buttons with "Apply Now" text`);
      
      const applyNowLinks = await page.locator('a:has-text("Apply Now")').all();
      await this.log(`Found ${applyNowLinks.length} links with "Apply Now" text`);
      
      // Check for elements with "Apply" text (case sensitive)
      const applyButtons = await page.locator('button:has-text("Apply")').all();
      await this.log(`Found ${applyButtons.length} buttons with "Apply" text`);
      
      const applyLinks = await page.locator('a:has-text("Apply")').all();
      await this.log(`Found ${applyLinks.length} links with "Apply" text`);
      
      // Log the actual text content of all buttons
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const button = buttons[i];
        const text = await button.textContent().catch(() => 'Unable to get text');
        const id = await button.getAttribute('id').catch(() => null);
        const className = await button.getAttribute('class').catch(() => null);
        const isVisible = await button.isVisible().catch(() => false);
        const isEnabled = await button.isEnabled().catch(() => false);
        
        await this.log(`Button ${i + 1}: text="${text}" id="${id}" class="${className}" visible=${isVisible} enabled=${isEnabled}`);
      }
      
    } catch (error) {
      await this.log(`Debug failed: ${error}`, 'error');
    }
  }
} 
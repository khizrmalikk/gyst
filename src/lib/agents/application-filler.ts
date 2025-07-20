import { BaseAgent } from './base-agent';
import { AgentResult, AgentTask, AgentContext, AgentType } from './types';
import { Page } from 'playwright';
import { AIVisionService, FormFieldMapping } from '@/lib/llm/vision';

export class ApplicationFillerAgent extends BaseAgent {
  private aiVision: AIVisionService;
  
  constructor(context: AgentContext) {
    super(AgentType.APPLICATION_FILLER, context);
    this.aiVision = new AIVisionService();
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    await this.log(`Starting application filling for: ${task.jobUrl}`);
    
    let page: Page | null = null;
    
    try {
      page = await this.context.tools.browser.newPage();
      
      if (!page) {
        return this.createErrorResult('Failed to create browser page', 'Browser page is null', true);
      }
      
      const formData = task.payload.formData;
      const applicationFormUrl = task.payload.applicationFormUrl || task.jobUrl;
      
      const result = await this.fillAndSubmitApplication(page, applicationFormUrl, formData);
      
      await this.log(`Application filling completed for: ${task.jobUrl}`);
      
      return this.createSuccessResult('Application filling completed', result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.log(`Application filling failed for ${task.jobUrl}: ${errorMessage}`, 'error');
      return this.createErrorResult('Application filling failed', errorMessage, true);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private async fillAndSubmitApplication(page: Page, formUrl: string, formData: any): Promise<any> {
    const result = {
      submitted: false,
      filled: false,
      error: null as string | null,
      screenshots: [] as string[],
      steps: [] as any[]
    };

    try {
      // Navigate to the form URL
      await page.goto(formUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Take initial screenshot
      const screenshotPath = await this.takeScreenshot(page, 'before-filling');
      if (screenshotPath) {
        result.screenshots.push(screenshotPath);
      }

      // Execute auto-fill strategy
      if (formData.autoFillStrategy) {
        const fillResult = await this.executeAutoFillStrategy(page, formData.autoFillStrategy);
        result.filled = fillResult.success;
        result.steps = fillResult.steps;
        
        if (!fillResult.success) {
          result.error = fillResult.error || 'Fill strategy failed';
          return result;
        }
      } else {
        // Fallback: Try to fill form using LLM guidance
        const llmResult = await this.fillFormWithLLM(page);
        result.filled = llmResult.success;
        result.steps = llmResult.steps;
        
        if (!llmResult.success) {
          result.error = llmResult.error || 'LLM form filling failed';
          return result;
        }
      }

      // Take screenshot after filling
      const afterFillScreenshot = await this.takeScreenshot(page, 'after-filling');
      if (afterFillScreenshot) {
        result.screenshots.push(afterFillScreenshot);
      }

      // Submit the form
      const submitResult = await this.submitForm(page, formData.autoFillStrategy?.submitSelector);
      result.submitted = submitResult.success;
      
      if (!submitResult.success) {
        result.error = submitResult.error || 'Form submission failed';
        return result;
      }

      // Wait for submission confirmation
      await this.delay(3000);
      
      // Take final screenshot
      const finalScreenshot = await this.takeScreenshot(page, 'after-submission');
      if (finalScreenshot) {
        result.screenshots.push(finalScreenshot);
      }

      // Check for success indicators
      const successConfirmed = await this.checkSubmissionSuccess(page);
      if (!successConfirmed) {
        result.error = 'Could not confirm successful submission';
      }

      await this.log(`Application filled and submitted successfully for: ${formUrl}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = errorMessage;
      await this.log(`Error filling application: ${errorMessage}`, 'error');
    }

    return result;
  }

  private async executeAutoFillStrategy(page: Page, strategy: any): Promise<{
    success: boolean;
    error?: string;
    steps: any[];
  }> {
    const result = {
      success: true,
      steps: [] as any[]
    };

    try {
      // Check if this is an AI-guided strategy
      if (strategy.aiGuidedFilling) {
        return await this.executeAIGuidedFilling(page, strategy);
      }
      
      // Legacy approach for backward compatibility
      for (const step of strategy.steps) {
        const stepResult = await this.executeStep(page, step);
        result.steps.push(stepResult);
        
        if (!stepResult.success && step.required) {
          return {
            success: false,
            error: `Failed to fill required field: ${step.fieldType}`,
            steps: result.steps
          };
        }
        
        // Small delay between steps
        await this.delay(500);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        steps: result.steps
      };
    }

    return result;
  }

  private async executeAIGuidedFilling(page: Page, strategy: any): Promise<{
    success: boolean;
    error?: string;
    steps: any[];
  }> {
    const result = {
      success: true,
      steps: [] as any[]
    };

    try {
      await this.log('Starting AI-guided form filling...');
      
      // Process each field identified by AI
      for (const field of strategy.fields) {
        const stepResult = await this.fillAIField(page, field);
        result.steps.push(stepResult);
        
        if (!stepResult.success && field.required) {
          return {
            success: false,
            error: `Failed to fill required field: ${field.label}`,
            steps: result.steps
          };
        }
        
        // Small delay between steps
        await this.delay(800);
      }
      
      await this.log(`AI-guided filling completed: ${result.steps.length} fields processed`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        steps: result.steps
      };
    }

    return result;
  }

  private async fillAIField(page: Page, field: FormFieldMapping): Promise<any> {
    const stepResult = {
      action: 'fill',
      selector: field.selector,
      fieldType: field.fieldType,
      label: field.label,
      success: false,
      error: null as string | null,
      value: field.value
    };

    try {
      await this.log(`Filling field: ${field.label} (${field.fieldType}) with value: ${field.value}`);
      
      // Wait for element to be visible
      await page.waitForSelector(field.selector, { timeout: 10000 });
      
      const element = page.locator(field.selector);
      
      // Check if element is visible
      if (!(await element.isVisible())) {
        stepResult.error = `Element not visible: ${field.selector}`;
        return stepResult;
      }

      // Execute the action based on field type
      switch (field.fieldType) {
        case 'text':
        case 'email':
        case 'tel':
          if (field.value) {
            await element.fill(field.value);
            stepResult.success = true;
          }
          break;
          
        case 'textarea':
          if (field.value) {
            await element.fill(field.value);
            stepResult.success = true;
          }
          break;
          
        case 'select':
          if (field.value) {
            // Try to select by value, text, or label
            try {
              await element.selectOption({ value: field.value });
            } catch {
              try {
                await element.selectOption({ label: field.value });
              } catch {
                await element.selectOption(field.value);
              }
            }
            stepResult.success = true;
          }
          break;
          
        case 'checkbox':
          if (field.value === 'true' || field.value === '1' || field.value === 'yes') {
            await element.check();
            stepResult.success = true;
          } else if (field.value === 'false' || field.value === '0' || field.value === 'no') {
            await element.uncheck();
            stepResult.success = true;
          }
          break;
          
        case 'radio':
          if (field.value) {
            await element.check();
            stepResult.success = true;
          }
          break;
          
        case 'file':
          // Handle file uploads (CV/resume)
          if (field.userDataField === 'cv_file_path' && this.context.userProfile?.cv_file_path) {
            await element.setInputFiles(this.context.userProfile.cv_file_path);
            stepResult.success = true;
          }
          break;
          
        default:
          if (field.value) {
            await element.fill(field.value);
            stepResult.success = true;
          }
      }
      
      if (stepResult.success) {
        await this.log(`✓ Successfully filled: ${field.label}`);
      } else {
        await this.log(`✗ Failed to fill: ${field.label} (no value or unsupported type)`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stepResult.error = errorMessage;
      await this.log(`✗ Error filling field ${field.label}: ${errorMessage}`, 'error');
    }

    return stepResult;
  }

  private async executeStep(page: Page, step: any): Promise<any> {
    const stepResult = {
      action: step.action,
      selector: step.selector,
      fieldType: step.fieldType,
      success: false,
      error: null as string | null,
      value: step.value
    };

    try {
      // Wait for element to be visible
      await page.waitForSelector(step.selector, { timeout: 10000 });
      
      const element = await page.$(step.selector);
      if (!element) {
        stepResult.error = `Element not found: ${step.selector}`;
        return stepResult;
      }

      // Execute the action based on element type
      switch (step.elementType) {
        case 'text':
        case 'email':
        case 'password':
        case 'tel':
        case 'textarea':
          if (step.value) {
            await element.fill(step.value);
            stepResult.success = true;
          }
          break;
          
        case 'select':
          if (step.value) {
            await element.selectOption(step.value);
            stepResult.success = true;
          }
          break;
          
        case 'checkbox':
          if (step.value === 'true' || step.value === true) {
            await element.check();
            stepResult.success = true;
          }
          break;
          
        case 'radio':
          if (step.value) {
            await element.check();
            stepResult.success = true;
          }
          break;
          
        case 'file':
          // Handle file uploads (CV/resume)
          if (step.fieldType === 'resume' && this.context.userProfile?.cv_file_path) {
            await element.setInputFiles(this.context.userProfile.cv_file_path);
            stepResult.success = true;
          }
          break;
          
        default:
          if (step.value) {
            await element.fill(step.value);
            stepResult.success = true;
          }
      }
      
      await this.log(`Step executed: ${step.fieldType} = ${step.value}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stepResult.error = errorMessage;
      await this.log(`Step failed: ${step.fieldType} - ${errorMessage}`, 'error');
    }

    return stepResult;
  }

  private async fillFormWithLLM(page: Page): Promise<{
    success: boolean;
    error?: string;
    steps: any[];
  }> {
    // This is a fallback method that uses LLM to understand and fill the form
    // when no predefined strategy is available
    
    const result = {
      success: false,
      error: 'LLM form filling not implemented yet',
      steps: [] as any[]
    };

    try {
      // Get form structure
      const formElements = await page.$$eval('form input, form textarea, form select', 
        (elements: any[]) => elements.map(el => ({
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required,
          tagName: el.tagName.toLowerCase()
        }))
      );

      // Use LLM to understand the form and generate fill strategy
      const llmPrompt = `
        I need to fill out a job application form. Here are the form elements:
        ${JSON.stringify(formElements, null, 2)}
        
        User profile data:
        ${JSON.stringify(this.context.userProfile, null, 2)}
        
        Please provide a strategy to fill this form with the user's data.
        Return a JSON object with steps array containing {selector, value, fieldType} objects.
      `;

      const llmResponse = await this.context.tools.llm.generate({
        prompt: llmPrompt,
        model: 'gpt-4o-mini',
        temperature: 0.1
      });

      // Parse LLM response and execute
      const strategy = JSON.parse(llmResponse);
      
      for (const step of strategy.steps) {
        const stepResult = await this.executeStep(page, step);
        result.steps.push(stepResult);
        
        if (!stepResult.success && step.required) {
          result.error = `Failed to fill required field: ${step.fieldType}`;
          return result;
        }
      }
      
      result.success = true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = errorMessage;
      await this.log(`LLM form filling failed: ${errorMessage}`, 'error');
    }

    return result;
  }

  private async submitForm(page: Page, submitSelector?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Try the provided submit selector first
      if (submitSelector) {
        const submitButton = await page.$(submitSelector);
        if (submitButton) {
          await submitButton.click();
          return { success: true };
        }
      }
      
      // Fallback: Look for common submit button patterns
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Submit")',
        'button:has-text("Apply")',
        'button:has-text("Send")',
        '.submit-button',
        '#submit',
        '[data-testid="submit"]'
      ];
      
      for (const selector of submitSelectors) {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          await this.log(`Form submitted using selector: ${selector}`);
          return { success: true };
        }
      }
      
      return {
        success: false,
        error: 'No submit button found'
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async checkSubmissionSuccess(page: Page): Promise<boolean> {
    try {
      // Wait for any navigation or dynamic content
      await page.waitForTimeout(3000);
      
      // Check for common success indicators
      const successIndicators = [
        'thank you',
        'success',
        'submitted',
        'received',
        'confirmation',
        'application sent',
        'thank you for applying',
        'we have received your application'
      ];
      
      const pageContent = await page.textContent('body');
      if (pageContent) {
        const lowerContent = pageContent.toLowerCase();
        return successIndicators.some(indicator => lowerContent.includes(indicator));
      }
      
      // Check for success URLs
      const currentUrl = page.url();
      const successUrlPatterns = [
        'success',
        'thank-you',
        'confirmation',
        'submitted',
        'complete'
      ];
      
      return successUrlPatterns.some(pattern => currentUrl.includes(pattern));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.log(`Error checking submission success: ${errorMessage}`, 'error');
      return false;
    }
  }
} 
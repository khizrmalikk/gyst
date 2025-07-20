import { BaseAgent } from './base-agent';
import { AgentResult, AgentTask, AgentContext, AgentType, FormElement, ApplicationFormData } from './types';
import { Page } from 'playwright';
import { AIVisionService } from '@/lib/llm/vision';
import { DialogHandler } from './dialog-handler';

export class FormAnalyzerAgent extends BaseAgent {
  private aiVision: AIVisionService;
  private dialogHandler: DialogHandler;
  
  constructor(context: AgentContext) {
    super(AgentType.FORM_ANALYZER, context);
    this.aiVision = new AIVisionService();
    this.dialogHandler = new DialogHandler();
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    await this.log(`Starting form analysis for: ${task.jobUrl}`);
    
    let page: Page | null = null;
    
    try {
      page = await this.context.tools.browser.newPage();
      
      if (!page) {
        return this.createErrorResult('Failed to create browser page', 'Browser page is null', true);
      }
      
      const websiteResult = task.payload.websiteResult;
      const applicationFormUrl = task.payload.applicationFormUrl || task.jobUrl;
      
      const result = await this.analyzeForm(page, applicationFormUrl, websiteResult.formElements);
      
      await this.log(`Form analysis completed for: ${task.jobUrl}`);
      
      return this.createSuccessResult('Form analysis completed', result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.log(`Form analysis failed for ${task.jobUrl}: ${errorMessage}`, 'error');
      return this.createErrorResult('Form analysis failed', errorMessage, true);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private async analyzeForm(page: Page, formUrl: string, formElements?: FormElement[]): Promise<any> {
    const result = {
      canAutoFill: false,
      confidence: 0,
      applicationFormUrl: formUrl,
      requiredFields: [] as string[],
      supportedFields: [] as string[],
      unsupportedFields: [] as string[],
      formElements: formElements || [] as FormElement[],
      autoFillStrategy: null as any,
      screenshots: [] as string[]
    };

    try {
      // Navigate to the form URL
      await page.goto(formUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      // Wait for any dynamic content to load
      await page.waitForTimeout(3000);

      // First, use dialog handler to automatically close common dialogs
      await this.log('🛡️ Automatically handling common dialogs...');
      const dialogResult = await this.dialogHandler.handleCommonDialogs(page);
      if (dialogResult.dialogsHandled > 0) {
        await this.log(`✅ Closed ${dialogResult.dialogsHandled} dialogs: ${dialogResult.dialogsFound.join(', ')}`);
        await page.waitForTimeout(2000); // Wait for page to settle
      }

      // Take screenshot for AI analysis
      const screenshotBuffer = await page.screenshot({ fullPage: true });
      const screenshotBase64 = this.aiVision.screenshotToBase64(screenshotBuffer);
      
      // Take initial screenshot for logging
      const screenshotPath = await this.takeScreenshot(page, 'form-analysis');
      if (screenshotPath) {
        result.screenshots.push(screenshotPath);
      }

      // Get page HTML for AI analysis
      const pageHTML = await page.content();
      const userProfile = this.context.userProfile;

      await this.log('🔍 Using AI vision to analyze form and detect any remaining dialogs...');

      // Use AI to analyze the form
      const aiAnalysis = await this.aiVision.analyzeFormForFilling(
        screenshotBase64,
        pageHTML,
        userProfile,
        formUrl
      );

      // Handle dialogs detected by AI
      if (aiAnalysis.hasDialog && aiAnalysis.dialogAction.shouldClick && aiAnalysis.dialogAction.selector) {
        await this.log(`🚪 AI detected additional dialog: ${aiAnalysis.dialogAction.reason}`);
        
        try {
          const dialogElement = page.locator(aiAnalysis.dialogAction.selector).first();
          if (await dialogElement.isVisible()) {
            await dialogElement.click({ timeout: 5000 });
            await this.log(`✅ Closed additional dialog: ${aiAnalysis.dialogAction.reason}`);
            
            // Wait for dialog to close and take new screenshot
            await page.waitForTimeout(3000);
            
            // Re-analyze the form after closing dialog
            const newScreenshotBuffer = await page.screenshot({ fullPage: true });
            const newScreenshotBase64 = this.aiVision.screenshotToBase64(newScreenshotBuffer);
            const newPageHTML = await page.content();
            
            const newAiAnalysis = await this.aiVision.analyzeFormForFilling(
              newScreenshotBase64,
              newPageHTML,
              userProfile,
              formUrl
            );
            
            // Use the new analysis result
            return this.processFormAnalysis(newAiAnalysis, result);
          }
        } catch (error) {
          await this.log(`❌ Failed to close additional dialog: ${error}`, 'error');
        }
      }

      await this.log(`🎯 AI Analysis: ${aiAnalysis.reason} (confidence: ${aiAnalysis.confidence}%)`);

      if (!aiAnalysis.isApplicationForm) {
        await this.log('❌ AI determined this is not a job application form');
        result.canAutoFill = false;
        result.confidence = 0;
        return result;
      }

      // Process the AI analysis result
      return this.processFormAnalysis(aiAnalysis, result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.log(`Error analyzing form: ${errorMessage}`, 'error');
      result.canAutoFill = false;
      result.confidence = 0;
    }

    return result;
  }

  private processFormAnalysis(aiAnalysis: any, result: any): any {
    // Convert AI analysis to our format
    result.confidence = aiAnalysis.confidence;
    result.canAutoFill = aiAnalysis.canAutoFill;
    
    // Map AI field analysis to our required/supported/unsupported format
    const requiredFields: string[] = [];
    const supportedFields: string[] = [];
    const unsupportedFields: string[] = [];

    for (const field of aiAnalysis.fields) {
      if (field.confidence >= 70) {
        supportedFields.push(field.userDataField);
        if (field.required) {
          requiredFields.push(field.userDataField);
        }
      } else {
        unsupportedFields.push(field.label || field.selector);
      }
    }

    result.requiredFields = requiredFields;
    result.supportedFields = supportedFields;
    result.unsupportedFields = unsupportedFields;

    // Generate AI-powered auto-fill strategy
    if (result.canAutoFill && aiAnalysis.fields.length > 0) {
      result.autoFillStrategy = {
        aiGuidedFilling: true,
        fields: aiAnalysis.fields,
        submitSelector: aiAnalysis.submitButton || 'button[type="submit"], input[type="submit"]',
        confidence: aiAnalysis.confidence
      };
    }

    this.log(`✅ AI Form analysis: canAutoFill=${result.canAutoFill}, confidence=${result.confidence}%, fields=${aiAnalysis.fields.length}`);

    return result;
  }

  private async analyzeFormElements(formElements: FormElement[]): Promise<{
    requiredFields: string[];
    supportedFields: string[];
    unsupportedFields: string[];
    confidence: number;
    canAutoFill: boolean;
  }> {
    const requiredFields: string[] = [];
    const supportedFields: string[] = [];
    const unsupportedFields: string[] = [];

    // Define field mappings for common form fields
    const fieldMappings = {
      // Personal Information
      'firstName': ['first', 'fname', 'firstname', 'given', 'name'],
      'lastName': ['last', 'lname', 'lastname', 'surname', 'family'],
      'email': ['email', 'mail', 'e-mail'],
      'phone': ['phone', 'telephone', 'mobile', 'cell', 'contact'],
      'address': ['address', 'street', 'location'],
      'city': ['city', 'town', 'locality'],
      'country': ['country', 'nation'],
      'zipCode': ['zip', 'postal', 'postcode'],
      
      // Professional Information
      'position': ['position', 'title', 'job', 'role'],
      'company': ['company', 'employer', 'organization', 'workplace'],
      'experience': ['experience', 'years', 'exp'],
      'skills': ['skills', 'skill', 'competencies', 'abilities'],
      'education': ['education', 'degree', 'school', 'university', 'college'],
      'resume': ['resume', 'cv', 'file', 'upload', 'document'],
      'cover': ['cover', 'letter', 'motivation', 'message'],
      
      // Other
      'website': ['website', 'portfolio', 'url', 'link'],
      'linkedin': ['linkedin', 'profile'],
      'salary': ['salary', 'compensation', 'wage', 'pay'],
      'availability': ['availability', 'start', 'notice'],
      'reference': ['reference', 'referee', 'contact']
    };

    for (const element of formElements) {
      const fieldName = this.identifyFieldType(element, fieldMappings);
      
      if (element.required) {
        requiredFields.push(fieldName);
      }

      if (fieldName !== 'unknown') {
        supportedFields.push(fieldName);
      } else {
        unsupportedFields.push(element.name || element.id || element.label || 'unknown');
      }
    }

    // Calculate confidence based on supported vs unsupported fields
    const totalFields = formElements.length;
    const supportedCount = supportedFields.length;
    const confidence = totalFields > 0 ? (supportedCount / totalFields) * 100 : 0;

    // Determine if we can auto-fill based on confidence and required fields
    const canAutoFill = confidence >= 70 && requiredFields.length > 0;

    return {
      requiredFields,
      supportedFields,
      unsupportedFields,
      confidence: Math.round(confidence),
      canAutoFill
    };
  }

  private identifyFieldType(element: FormElement, fieldMappings: Record<string, string[]>): string {
    const searchText = `${element.name} ${element.id} ${element.label} ${element.placeholder}`.toLowerCase();
    
    for (const [fieldType, keywords] of Object.entries(fieldMappings)) {
      if (keywords.some((keyword: string) => searchText.includes(keyword))) {
        return fieldType;
      }
    }
    
    return 'unknown';
  }

  private async generateAutoFillStrategy(page: Page, formElements: FormElement[]): Promise<any> {
    const strategy = {
      steps: [] as any[],
      formSelector: 'form',
      submitSelector: 'button[type="submit"], input[type="submit"]',
      requiredUserProfile: [] as string[]
    };

    // Get user profile data requirements
    const userProfile = this.context.userProfile;
    
    for (const element of formElements) {
      const fieldType = this.identifyFieldType(element, {
        'firstName': ['first', 'fname', 'firstname', 'given'],
        'lastName': ['last', 'lname', 'lastname', 'surname'],
        'email': ['email', 'mail'],
        'phone': ['phone', 'telephone', 'mobile'],
        'address': ['address', 'street'],
        'city': ['city', 'town'],
        'country': ['country', 'nation'],
        'zipCode': ['zip', 'postal'],
        'position': ['position', 'title', 'job'],
        'company': ['company', 'employer'],
        'experience': ['experience', 'years'],
        'skills': ['skills', 'skill'],
        'education': ['education', 'degree'],
        'resume': ['resume', 'cv', 'file'],
        'cover': ['cover', 'letter']
      });

      if (fieldType !== 'unknown') {
        const selector = this.generateFieldSelector(element);
        
        strategy.steps.push({
          action: 'fill',
          selector,
          fieldType,
          value: this.getFieldValue(fieldType, userProfile),
          required: element.required,
          elementType: element.type
        });

        // Track what profile data is needed
        if (element.required) {
          strategy.requiredUserProfile.push(fieldType);
        }
      }
    }

    return strategy;
  }

  private generateFieldSelector(element: FormElement): string {
    if (element.id) {
      return `#${element.id}`;
    } else if (element.name) {
      return `[name="${element.name}"]`;
    } else {
      return `[placeholder="${element.placeholder}"]`;
    }
  }

  private getFieldValue(fieldType: string, userProfile: any): string | null {
    if (!userProfile) return null;

    const fieldMap: any = {
      'firstName': userProfile.first_name,
      'lastName': userProfile.last_name,
      'email': userProfile.email,
      'phone': userProfile.phone,
      'address': userProfile.address,
      'city': userProfile.city,
      'country': userProfile.country,
      'zipCode': userProfile.zip_code,
      'position': userProfile.desired_position,
      'company': userProfile.current_company,
      'website': userProfile.website,
      'linkedin': userProfile.linkedin_url
    };

    return fieldMap[fieldType] || null;
  }

  private async extractFormElements(form: any): Promise<FormElement[]> {
    const elements: FormElement[] = [];
    
    try {
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
          try {
            const labelElement = await form.$(`label[for="${id}"]`);
            if (labelElement) {
              label = await labelElement.textContent() || '';
            }
          } catch (error) {
            // Ignore label lookup errors
          }
        }
        
        // If no label found, check for nearby text
        if (!label) {
          try {
            const parent = await input.evaluateHandle((el: any) => el.parentElement);
            if (parent) {
              const parentText = await parent.textContent();
              if (parentText) {
                label = parentText.trim().substring(0, 100);
              }
            }
          } catch (error) {
            // Ignore parent lookup errors
          }
        }

        // Get options for select elements
        let options: string[] = [];
        if (type === 'select') {
          try {
            const optionElements = await input.$$('option');
            for (const option of optionElements) {
              const value = await option.getAttribute('value') || '';
              const text = await option.textContent() || '';
              if (value || text) {
                options.push(text || value);
              }
            }
          } catch (error) {
            // Ignore option extraction errors
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.log(`Error extracting form elements: ${errorMessage}`, 'error');
    }
    
    return elements;
  }
}
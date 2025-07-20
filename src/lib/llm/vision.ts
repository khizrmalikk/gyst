import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DialogAction {
  shouldClick: boolean;
  selector?: string;
  reason: string;
}

export interface ApplyAction {
  shouldClick: boolean;
  selector?: string;
  reason: string;
  confidence: number;
  alternativeSelectors?: string[];
}

export interface NavigationSuggestion {
  hasDialog: boolean;
  dialogAction: DialogAction;
  applyAction: ApplyAction;
}

export interface FormFieldMapping {
  selector: string;
  fieldType: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'file' | 'checkbox' | 'radio';
  label: string;
  userDataField: string;
  value: string;
  required: boolean;
  confidence: number;
}

export interface FormAnalysisResult {
  hasDialog: boolean;
  dialogAction: DialogAction;
  isApplicationForm: boolean;
  confidence: number;
  fields: FormFieldMapping[];
  submitButton?: string;
  canAutoFill: boolean;
  reason: string;
}

export class AIVisionService {
  
  /**
   * Analyze a screenshot to find the best apply button to click
   */
  async analyzeForApplyButton(
    screenshotBase64: string,
    currentUrl: string,
    pageHTML?: string
  ): Promise<NavigationSuggestion> {
    try {
      const prompt = `You are an expert web automation assistant. I need to find and click an "Apply" button to reach a job application form.

CURRENT URL: ${currentUrl}

TASK: 
1. FIRST: Check if there are any dialogs, popups, or overlays blocking the view (cookie consent, notifications, modals, etc.)
2. THEN: If the main content is visible, find the best "Apply" button

DIALOG HANDLING:
If you see dialogs/popups blocking the page, look for:
- Cookie consent: "Accept", "Accept All", "I Agree", "OK"
- Notifications: "Allow", "Not Now", "No Thanks"
- Modals: Close buttons (×, ✕), "Close", "Skip"
- Newsletter popups: "No Thanks", "Maybe Later", "Skip", or X buttons (×, ✕) often in top-right corner
- Email subscription overlays: X close buttons, "Close", "Not interested"
- Marketing/promotional popups: X buttons, "Close", "Skip"

COMMON CLOSE BUTTON PATTERNS:
- X symbols: ×, ✕, X (often clickable buttons or spans)
- Close buttons: "Close", "Skip", "No Thanks", "Maybe Later"
- Top-right corner elements (common newsletter popup pattern)

If dialogs are present, prioritize closing them first. Look specifically for X buttons in corners of popups.

APPLY BUTTON DETECTION:
Look for these buttons/links:
- "Apply Now" buttons
- "Apply" links  
- "Start Application" buttons
- "Submit Application" links
- "Apply for this Job" buttons
- "Quick Apply" buttons
- Any other buttons/links that lead to application forms

${pageHTML ? `
PAGE HTML STRUCTURE (for reference):
${pageHTML.substring(0, 3000)}...
` : ''}

Return a JSON response with this exact structure:
{
  "hasDialog": boolean,
  "dialogAction": {
    "shouldClick": boolean,
    "selector": "CSS selector for dialog button to click",
    "reason": "What dialog this closes"
  },
  "applyAction": {
    "shouldClick": boolean,
    "selector": "CSS selector for apply button",
    "reason": "Why this apply button was chosen",
    "confidence": number between 0-100,
    "alternativeSelectors": ["backup selector 1", "backup selector 2"]
  }
}

Priority: Handle dialogs first, then find apply buttons. If both are present, handle the dialog.

IMPORTANT - SELECTOR CREATION RULES:
For Apply Buttons:
1. PREFER TEXT-BASED SELECTORS: Use button:has-text("Apply Now"), a:has-text("Apply"), button:has-text("Apply for this Job")
2. CHECK FOR SPECIFIC IDs: Look for #apply-button, #apply-now, #job-apply, #apply-btn in the HTML
3. USE DATA ATTRIBUTES: [data-testid="apply-button"], [data-action="apply"], [data-apply="true"]
4. HREF PATTERNS: a[href*="apply"], a[href*="application"], a[href*="job-apply"]
5. BUTTON CLASSES: Only use specific classes you can see in the HTML like .apply-btn, .job-apply-button
6. AVOID GENERIC CLASSES: Don't use .apply-button, .btn-apply unless you see them in the provided HTML
7. COMBINE SELECTORS: Use specific combinations like button.btn-primary:has-text("Apply")

For Alternative Selectors:
- Provide 2-3 backup selectors using different approaches
- Mix text-based and attribute-based selectors
- Include both broad and specific options

EXAMPLE GOOD SELECTORS:
- button:has-text("Apply Now") (text-based, most reliable)
- #apply-button (ID-based, very specific)
- a[href*="apply"] (href pattern, logical)
- [data-testid="apply-btn"] (data attribute, specific)

EXAMPLE BAD SELECTORS:
- .apply-button (generic class, might not exist)
- .btn-apply (generic class, might not exist)
- button (too broad)
- a (too broad)`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${screenshotBase64}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          hasDialog: false,
          dialogAction: { shouldClick: false, reason: "No response from AI" },
          applyAction: { shouldClick: false, reason: "No response from AI", confidence: 0 }
        };
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          hasDialog: false,
          dialogAction: { shouldClick: false, reason: "Could not parse AI response" },
          applyAction: { shouldClick: false, reason: "Could not parse AI response", confidence: 0 }
        };
      }

      const result = JSON.parse(jsonMatch[0]) as NavigationSuggestion;
      return result;

    } catch (error) {
      console.error('Error in AI vision analysis:', error);
      return {
        hasDialog: false,
        dialogAction: { shouldClick: false, reason: "AI analysis failed" },
        applyAction: { 
          shouldClick: false, 
          reason: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          confidence: 0 
        }
      };
    }
  }

  /**
   * Analyze a form to determine how to fill it with user data
   */
  async analyzeFormForFilling(
    screenshotBase64: string,
    pageHTML: string,
    userProfile: any,
    currentUrl: string
  ): Promise<FormAnalysisResult> {
    try {
      const prompt = `You are an expert form automation assistant. Analyze this job application form and provide detailed instructions for auto-filling it.

CURRENT URL: ${currentUrl}

USER PROFILE DATA:
${JSON.stringify(userProfile, null, 2)}

FORM HTML:
${pageHTML.substring(0, 5000)}...

TASK: 
1. FIRST: Check if there are any dialogs or popups blocking the form
2. THEN: Identify if this is a job application form
3. FINALLY: Map each form field to the appropriate user profile data

DIALOG HANDLING:
If you see dialogs/popups blocking the form, look for:
- Cookie consent: "Accept", "Accept All", "I Agree", "OK"
- Notifications: "Allow", "Not Now", "No Thanks"
- Terms/Privacy: "Accept", "Agree", "Continue"
- Modals: Close buttons (×, ✕), "Close", "Skip"
- Newsletter popups: X buttons (×, ✕) often in top-right corner, "No Thanks", "Skip"
- Email subscription overlays: X close buttons, "Close", "Not interested"

COMMON CLOSE BUTTON PATTERNS:
- X symbols: ×, ✕, X (often clickable buttons or spans)
- Close buttons: "Close", "Skip", "No Thanks", "Maybe Later"
- Top-right corner elements (common newsletter popup pattern)

If dialogs are present, prioritize closing them first. Look specifically for X buttons in corners of popups.

FORM FIELD MAPPING:
For each form field, determine:
- CSS selector (use id, name, or specific attributes)
- Field type (text, email, tel, textarea, select, file, checkbox, radio)
- What user data should go in this field
- The exact value to enter

Return JSON with this exact structure:
{
  "hasDialog": boolean,
  "dialogAction": {
    "shouldClick": boolean,
    "selector": "CSS selector for dialog button to click",
    "reason": "What dialog this closes"
  },
  "isApplicationForm": boolean,
  "confidence": number (0-100),
  "fields": [
    {
      "selector": "specific CSS selector",
      "fieldType": "text|email|tel|textarea|select|file|checkbox|radio",
      "label": "field label or description",
      "userDataField": "which user profile field to use",
      "value": "exact value to enter",
      "required": boolean,
      "confidence": number (0-100)
    }
  ],
  "submitButton": "CSS selector for submit button",
  "canAutoFill": boolean,
  "reason": "explanation of analysis"
}

IMPORTANT:
- Handle dialogs first, then analyze form fields
- Use precise selectors (prefer id > name > class > other attributes)
- Map common fields: name, email, phone, address, experience, education, skills
- For file uploads, specify which document type is needed
- Only include fields you're confident about (confidence > 70)`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${screenshotBase64}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          hasDialog: false,
          dialogAction: { shouldClick: false, reason: "No response from AI" },
          isApplicationForm: false,
          confidence: 0,
          fields: [],
          canAutoFill: false,
          reason: "No response from AI"
        };
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          hasDialog: false,
          dialogAction: { shouldClick: false, reason: "Could not parse AI response" },
          isApplicationForm: false,
          confidence: 0,
          fields: [],
          canAutoFill: false,
          reason: "Could not parse AI response"
        };
      }

      const result = JSON.parse(jsonMatch[0]) as FormAnalysisResult;
      return result;

    } catch (error) {
      console.error('Error in AI form analysis:', error);
      return {
        hasDialog: false,
        dialogAction: { shouldClick: false, reason: "AI analysis failed" },
        isApplicationForm: false,
        confidence: 0,
        fields: [],
        canAutoFill: false,
        reason: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert screenshot buffer to base64
   */
  screenshotToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }
} 
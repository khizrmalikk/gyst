// Content Script for Job Application Bot Extension
// This script runs on every page and helps with form detection and filling

console.log('🚀 Job Application Bot content script loaded');

// Extension Detection Support
// Add a data attribute to indicate extension presence
document.documentElement.setAttribute('data-gyst-extension', 'installed');

// Listen for extension detection messages from the website
window.addEventListener('message', (event) => {
  // Only respond to messages from the same origin
  if (event.source !== window) return;
  
  if (event.data?.type === 'GYST_EXTENSION_CHECK') {
    // Respond that the extension is installed
    window.postMessage({
      type: 'GYST_EXTENSION_RESPONSE',
      installed: true,
      version: chrome.runtime.getManifest()?.version || '1.0.0'
    }, '*');
  }
  
  // Handle extension authorization success
  if (event.data?.type === 'EXTENSION_AUTH_SUCCESS') {
    console.log('🔑 Content script received extension auth success');
    
    // Forward the auth data to the extension background script
    chrome.runtime.sendMessage({
      action: 'extensionAuthSuccess',
      authData: event.data.data,
      state: event.data.state
    }).catch(error => {
      console.error('Failed to send auth success to background:', error);
    });
  }
});

// Debug Functions
window.debugFormFilling = async function() {
  console.log('🔧 DEBUG: Testing form filling functionality');
  
  // 1. Test profile fetch
  console.log('📋 Fetching profile...');
  try {
    const profileResponse = await fetch('http://localhost:3000/api/extension/profile');
    const profileData = await profileResponse.json();
    console.log('✅ Profile data:', profileData);
    
    if (!profileData.name || profileData.name.includes('Software Engineering')) {
      console.warn('⚠️ Profile name issue detected:', profileData.name);
    }
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
  }
  
  // 2. Test form detection
  console.log('🔍 Detecting forms...');
  const contentScript = new JobApplicationContentScript();
  const forms = contentScript.detectApplicationForms();
  console.log(`✅ Found ${forms.length} forms`);
  
  // 3. Test field detection
  if (forms.length > 0) {
    console.log('📝 Form fields:', forms[0].fields.map(f => ({
      name: f.name,
      label: f.label,
      type: f.type
    })));
  }
  
  return { profileData, forms };
};

// Debug AI Response Generation
window.debugAIResponses = async function() {
  console.log('🤖 DEBUG: Testing AI response generation');
  
  try {
    // Mock some test fields
    const testFields = [
      { name: 'favorite_project', label: 'What has been your favorite project or proudest accomplishment? Why?' },
      { name: 'why_company', label: 'Why do you want to work at Palantir?' }
    ];
    
    // Get current profile
    const profileResponse = await fetch('http://localhost:3000/api/extension/profile');
    const profile = await profileResponse.json();
    
    // Mock job info
    const jobInfo = {
      jobTitle: 'Software Engineer',
      company: 'Palantir',
      description: 'Software engineering role at Palantir working on data analysis platforms.'
    };
    
    // Test AI responses
    const fillResponse = await fetch('http://localhost:3000/api/extension/fill-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobInfo,
        userProfile: profile,
        formFields: testFields
      })
    });
    
    const result = await fillResponse.json();
    console.log('✅ AI Response Test Results:', result);
    
    if (result.formData) {
      result.formData.forEach(field => {
        console.log(`📝 Field "${field.label}": "${field.value}"`);
        if (field.value === 'Software Engineering') {
          console.warn('⚠️ Still getting generic response!');
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ AI response test failed:', error);
    return { error: error.message };
  }
};

// Debug application submission
window.debugSubmitApplication = async function() {
  console.log('🧪 DEBUG: Testing application submission');
  
  try {
    const testApplicationData = {
      jobInfo: {
        title: 'Software Engineer (Debug Test)',
        company: 'Test Company',
        location: 'Remote',
        description: 'Debug test job submission',
        requirements: ['JavaScript', 'React']
      },
      url: window.location.href,
      status: 'submitted',
      appliedAt: new Date().toISOString(),
      applicationMethod: 'chrome_extension',
      cvGenerated: true,
      coverLetterGenerated: true,
      formFieldsCount: 5,
      aiResponsesCount: 2,
      pageTitle: document.title,
      pageType: 'application_form',
      notes: 'Debug test submission from content script'
    };

    console.log('📤 Submitting test application:', testApplicationData);

    const response = await fetch('http://localhost:3000/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Chrome-Extension-JobBot/1.0.0 (Debug)'
      },
      body: JSON.stringify(testApplicationData)
    });

    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Submission failed:', response.status, errorText);
      return { error: `${response.status} - ${errorText}` };
    }

    const result = await response.json();
    console.log('✅ Submission successful:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Debug submission error:', error);
    return { error: error.message };
  }
};

class ContentScriptController {
  constructor() {
    this.isActive = false;
    this.detectedForms = [];
    this.currentJobData = null;
    this.currentUrl = window.location.href;
    
    this.init();
  }

  init() {
    // Listen for messages from popup and background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Auto-detect forms on page load
    this.detectForms();
    
    // Watch for dynamic form additions
    this.watchForNewForms();
    
    // Add visual indicators for detected forms
    this.addFormIndicators();
    
    // Watch for URL changes
    this.watchForUrlChanges();
  }

  watchForUrlChanges() {
    // Listen for browser navigation events
    window.addEventListener('popstate', () => {
      this.handleUrlChange();
    });

    // Override pushState and replaceState to catch programmatic navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      setTimeout(() => this.handleUrlChange(), 100);
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      setTimeout(() => this.handleUrlChange(), 100);
    };

    // Watch for hash changes
    window.addEventListener('hashchange', () => {
      this.handleUrlChange();
    });

    // Poll for URL changes as a fallback (some SPAs don't trigger events)
    setInterval(() => {
      if (window.location.href !== this.currentUrl) {
        this.handleUrlChange();
      }
    }, 1000);
  }

  handleUrlChange() {
    const newUrl = window.location.href;
    if (newUrl !== this.currentUrl) {
      console.log('🔄 Page changed from', this.currentUrl, 'to', newUrl);
      this.currentUrl = newUrl;
      
      // Reset current data
      this.currentJobData = null;
      this.detectedForms = [];
      
      // Wait a bit for the page to load, then re-analyze
      setTimeout(() => {
        this.detectForms();
        this.addFormIndicators();
        
        // Notify side panel about page change
        chrome.runtime.sendMessage({
          action: 'pageChanged',
          url: newUrl,
          jobData: this.extractPageData()
        });
      }, 1500);
    }
  }

  handleMessage(message, sender, sendResponse) {
    console.log('📨 Content script received message:', message.action);
    
    try {
      switch (message.action) {
        case 'getPageData':
          console.log('🔍 Extracting page data...');
          const pageData = this.extractPageData();
          sendResponse(pageData);
          break;
          
        case 'analyzeForms':
          console.log('📝 Analyzing forms...');
          this.detectForms(); // Refresh form detection
          const formsData = { forms: this.detectedForms };
          sendResponse(formsData);
          break;
          
        case 'fillForm':
          console.log('✍️ Filling form with data...');
          const result = this.fillFormWithData(message.data);
          sendResponse(result);
          break;
          
        case 'extractJobData':
          console.log('📊 Extracting detailed job data...');
          const jobData = this.extractJobData();
          sendResponse(jobData);
          break;
          
        case 'getPageText':
          console.log('📝 Getting page text content...');
          const pageText = this.getPageText();
          sendResponse(pageText);
          break;
          
        default:
          console.warn('⚠️ Unknown message action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  detectForms() {
    const forms = document.querySelectorAll('form');
    this.detectedForms = [];

    forms.forEach((form, index) => {
      const formData = this.analyzeForm(form, index);
      if (formData.fields.length > 0) {
        this.detectedForms.push(formData);
      }
    });

    console.log(`📝 Detected ${this.detectedForms.length} forms on page`);
    
    // Notify background script about detected forms
    chrome.runtime.sendMessage({
      action: 'formsDetected',
      forms: this.detectedForms,
      url: window.location.href
    });
  }

  analyzeForm(form, index) {
    const fields = [];
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach((input, fieldIndex) => {
      if (this.isRelevantField(input)) {
        const fieldData = {
          index: fieldIndex,
          name: input.name || input.id || `field_${fieldIndex}`,
          type: input.type || input.tagName.toLowerCase(),
          label: this.getFieldLabel(input),
          required: input.required || input.hasAttribute('required'),
          placeholder: input.placeholder || '',
          value: input.value || '',
          selector: this.generateSelector(input),
          isApplicationField: this.isApplicationField(input)
        };
        fields.push(fieldData);
      }
    });

    return {
      index,
      action: form.action || window.location.href,
      method: form.method || 'POST',
      fields,
      isApplicationForm: this.isApplicationForm(form, fields),
      selector: this.generateSelector(form)
    };
  }

  isRelevantField(input) {
    // Skip problematic field types that can't be filled programmatically
    const skipTypes = [
      'hidden', 'submit', 'button', 'reset', 'image',
      'file'  // ← Add file inputs (can't be set for security reasons)
    ];
    
    const fieldType = input.type?.toLowerCase();
    
    // Skip if field type is in the skip list
    if (skipTypes.includes(fieldType)) {
      console.log(`⏭️ Skipping field type: ${fieldType} (${input.name || input.id || 'unnamed'})`);
      return false;
    }
    
    // Skip disabled or readonly fields
    if (input.disabled || input.readOnly) {
      console.log(`⏭️ Skipping disabled/readonly field: ${input.name || input.id || 'unnamed'}`);
      return false;
    }
    
    // Skip CAPTCHA-related fields
    const fieldName = (input.name || input.id || '').toLowerCase();
    if (fieldName.includes('captcha') || fieldName.includes('recaptcha')) {
      console.log(`⏭️ Skipping CAPTCHA field: ${fieldName}`);
      return false;
    }
    
    // Skip fields that are not visible (but allow fields with display:none as they might be shown dynamically)
    if (input.offsetParent === null && input.style.display !== 'none' && input.type !== 'hidden') {
      console.log(`⏭️ Skipping invisible field: ${input.name || input.id || 'unnamed'}`);
      return false;
    }
    
    return true;
  }

  isApplicationField(input) {
    const fieldText = (input.name + ' ' + input.id + ' ' + this.getFieldLabel(input)).toLowerCase();
    const applicationKeywords = [
      'name', 'email', 'phone', 'resume', 'cv', 'cover', 'letter',
      'experience', 'education', 'skill', 'qualification', 'address',
      'linkedin', 'portfolio', 'why', 'motivat', 'interest'
    ];
    
    return applicationKeywords.some(keyword => fieldText.includes(keyword));
  }

  isApplicationForm(form, fields) {
    // Check if form contains typical application fields
    const applicationFieldCount = fields.filter(f => f.isApplicationField).length;
    const totalFields = fields.length;
    
    // If more than 30% of fields are application-related, consider it an application form
    if (totalFields > 0 && (applicationFieldCount / totalFields) > 0.3) {
      return true;
    }
    
    // Check form content for application keywords
    const formText = form.textContent.toLowerCase();
    const applicationKeywords = [
      'apply', 'application', 'submit application', 'job application',
      'resume', 'cv', 'cover letter', 'why are you interested'
    ];
    
    return applicationKeywords.some(keyword => formText.includes(keyword));
  }

  getFieldLabel(input) {
    // Try multiple methods to find the field label
    
    // Method 1: Associated label element
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) return label.textContent.trim();
    }
    
    // Method 2: Parent label
    const parentLabel = input.closest('label');
    if (parentLabel) {
      return parentLabel.textContent.replace(input.value, '').trim();
    }
    
    // Method 3: For dynamic form fields (like cards[...][field0]), look for question text in container
    if (input.name && input.name.includes('cards[')) {
      // Look for question text in parent container
      let container = input.closest('[class*="card"], [class*="question"], [class*="field"], .form-group, .form-field, .input-group');
      
      if (container) {
        // Look for text elements that might contain the question
        const questionElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, legend, .question, .label, .title');
        
        for (const elem of questionElements) {
          const text = elem.textContent.trim();
          // Skip if it's just the input value or too short
          if (text && text !== input.value && text.length > 5 && !text.includes(input.name)) {
            // Check if this looks like a question (contains question words or ends with ?)
            const isQuestion = text.includes('?') || 
                             /\b(what|why|how|when|where|who|describe|explain|tell|share)\b/i.test(text) ||
                             text.length > 20; // Long text is likely a question
            
            if (isQuestion) {
              console.log(`🔍 Found question text for ${input.name}: "${text}"`);
              return text;
            }
          }
        }
      }
      
      // Also check preceding text nodes or elements
      let prevElement = input.parentElement;
      for (let i = 0; i < 3; i++) { // Check up to 3 levels up
        if (!prevElement) break;
        
        const textContent = prevElement.textContent.trim();
        if (textContent && textContent !== input.value && textContent.length > 10) {
          // Look for question patterns
          if (textContent.includes('?') || 
              /\b(what|why|how|when|where|who|describe|explain|tell|share)\b/i.test(textContent)) {
            console.log(`🔍 Found question in parent for ${input.name}: "${textContent}"`);
            return textContent;
          }
        }
        prevElement = prevElement.parentElement;
      }
    }
    
    // Method 4: Previous sibling label
    let prevElement = input.previousElementSibling;
    while (prevElement) {
      if (prevElement.tagName === 'LABEL') {
        return prevElement.textContent.trim();
      }
      if (prevElement.textContent.trim()) {
        break; // Stop if we find other text content
      }
      prevElement = prevElement.previousElementSibling;
    }
    
    // Method 5: Aria-label or aria-labelledby
    if (input.getAttribute('aria-label')) {
      return input.getAttribute('aria-label');
    }
    
    if (input.getAttribute('aria-labelledby')) {
      const labelElement = document.getElementById(input.getAttribute('aria-labelledby'));
      if (labelElement) return labelElement.textContent.trim();
    }
    
    // Method 6: Look in closest form section for heading text
    const section = input.closest('section, fieldset, .form-section, .question-section');
    if (section) {
      const heading = section.querySelector('h1, h2, h3, h4, h5, h6, legend, .section-title');
      if (heading && heading.textContent.trim().length > 5) {
        return heading.textContent.trim();
      }
    }
    
    // Method 7: Placeholder as fallback
    if (input.placeholder && input.placeholder.trim().length > 3) {
      return input.placeholder;
    }
    
    // Method 8: Name attribute as last resort
    return input.name || 'Unknown Field';
  }

  generateSelector(element) {
    // Generate a unique CSS selector for the element
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.name) {
      return `[name="${element.name}"]`;
    }
    
    // Generate selector based on element position
    const tagName = element.tagName.toLowerCase();
    const parent = element.parentElement;
    
    if (parent) {
      const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
      const index = siblings.indexOf(element);
      return `${tagName}:nth-of-type(${index + 1})`;
    }
    
    return tagName;
  }

  watchForNewForms() {
    // Use MutationObserver to watch for dynamically added forms
    const observer = new MutationObserver((mutations) => {
      let shouldRecheck = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              if (node.tagName === 'FORM' || node.querySelector('form')) {
                shouldRecheck = true;
              }
            }
          });
        }
      });
      
      if (shouldRecheck) {
        setTimeout(() => this.detectForms(), 1000);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  addFormIndicators() {
    // Add visual indicators to detected application forms
    this.detectedForms.forEach((formData) => {
      if (formData.isApplicationForm) {
        const form = document.querySelector(formData.selector);
        if (form && !form.querySelector('.job-bot-indicator')) {
          this.addFormIndicator(form);
        }
      }
    });
  }

  addFormIndicator(form) {
    // Create a small indicator badge
    const indicator = document.createElement('div');
    indicator.className = 'job-bot-indicator';
    indicator.innerHTML = `
      <div style="
        position: absolute;
        top: -10px;
        right: -10px;
        background: #3b82f6;
        color: white;
        border-radius: 12px;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        cursor: pointer;
      ">
        🤖 Job Bot
      </div>
    `;
    
    // Position the form relatively if it isn't already
    if (getComputedStyle(form).position === 'static') {
      form.style.position = 'relative';
    }
    
    form.appendChild(indicator);
    
    // Add click handler to indicator
    indicator.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'openPopup',
        formData: this.detectedForms.find(f => f.selector === this.generateSelector(form))
      });
    });
  }

  extractPageData() {
    const pageData = {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      forms: this.detectedForms,
      jobInfo: this.extractJobInfo(),
      pageType: this.detectPageType()
    };
    
    return pageData;
  }

  extractJobInfo() {
    return {
      title: this.extractJobTitle(),
      company: this.extractCompany(),
      location: this.extractLocation(),
      description: this.extractJobDescription(),
      salary: this.extractSalary(),
      requirements: this.extractRequirements()
    };
  }

  extractJobTitle() {
    const selectors = [
      'h1[class*="job"]', 'h1[class*="title"]', '.job-title', '.job-header h1',
      '[data-testid*="job-title"]', '[class*="JobTitle"]', '.title h1',
      'h1', '.main-title', '.primary-title'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    
    // Fallback to page title
    return document.title.split(' - ')[0] || 'Job Title Not Found';
  }

  extractCompany() {
    const selectors = [
      '.company-name', '[class*="company"]', '.employer', '.org-name',
      '[data-testid*="company"]', '.job-company', '.hiring-company',
      '.company', '.employer-name'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    
    return 'Company Not Found';
  }

  extractLocation() {
    const selectors = [
      '.location', '[class*="location"]', '.job-location', '.workplace',
      '[data-testid*="location"]', '.geo', '.address'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    
    return 'Location Not Found';
  }

  extractJobDescription() {
    const selectors = [
      '.job-description', '[class*="description"]', '.job-details', '.content',
      '[data-testid*="description"]', '.job-content', '.description'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim().substring(0, 1000); // Limit length
      }
    }
    
    return 'Description Not Found';
  }

  extractSalary() {
    const salaryRegex = /\$[\d,]+(?:-\$[\d,]+)?|\d+k?(?:-\d+k?)?\s*(?:per|\/)\s*(?:year|hour|month)/i;
    const pageText = document.body.textContent;
    const match = pageText.match(salaryRegex);
    
    return match ? match[0] : 'Salary Not Listed';
  }

  extractRequirements() {
    const requirementSelectors = [
      '.requirements', '.qualifications', '[class*="requirement"]',
      '[class*="qualification"]', '.skills', '.experience'
    ];
    
    for (const selector of requirementSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent;
        // Extract bullet points or list items
        const items = text.split(/[•\n-]/).filter(item => item.trim().length > 10);
        return items.slice(0, 5).map(item => item.trim()); // Limit to 5 items
      }
    }
    
    return [];
  }

  detectPageType() {
    const url = window.location.href.toLowerCase();
    const content = document.body.textContent.toLowerCase();
    
    if (url.includes('apply') || content.includes('application form') || content.includes('apply now')) {
      return 'application';
    } else if (url.includes('job') || url.includes('career') || content.includes('job description')) {
      return 'job_listing';
    } else if (url.includes('linkedin.com/jobs') || url.includes('indeed.com') || url.includes('glassdoor.com')) {
      return 'job_board';
    }
    
    return 'unknown';
  }

  fillFormWithData(formData) {
    console.log('🖊️ Filling form with data:', formData);
    
    let filledCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    formData.forEach((fieldData) => {
      const field = document.querySelector(fieldData.selector) ||
                   document.querySelector(`[name="${fieldData.name}"]`) ||
                   document.querySelector(`#${fieldData.name}`);
      
      if (field) {
        // Skip file inputs and other problematic field types
        if (this.shouldSkipField(field, fieldData)) {
          console.log(`⏭️ Skipping field "${fieldData.name}" (${field.type}): ${this.getSkipReason(field)}`);
          this.highlightField(fieldData.selector, 'warning');
          skippedCount++;
          return;
        }
        
        try {
          this.fillField(field, fieldData.value);
          this.highlightField(fieldData.selector, 'success');
          filledCount++;
        } catch (fieldError) {
          // Handle file input errors specifically
          if (fieldError.message.includes('file') || fieldError.message.includes('filename')) {
            console.log(`   ⚠️ File input error handled gracefully: ${fieldData.name}`);
            this.highlightField(fieldData.selector, 'warning');
            skippedCount++;
          } else {
            console.error(`❌ Error filling field "${fieldData.name}":`, fieldError);
            this.highlightField(fieldData.selector, 'error');
            errorCount++;
          }
        }
      } else {
        console.warn('⚠️ Field not found:', fieldData.name);
        errorCount++;
      }
    });
    
    const result = {
      success: true,
      filledCount,
      skippedCount, 
      errorCount,
      totalFields: formData.length,
      message: `Filled ${filledCount} fields, skipped ${skippedCount}, errors ${errorCount}`
    };
    
    console.log('✅ Form filling complete:', result);
    return result;
  }

  shouldSkipField(field, fieldData) {
    const fieldType = field.type?.toLowerCase();
    const tagName = field.tagName?.toLowerCase();
    
    // Skip file inputs (can't be programmatically set)
    if (fieldType === 'file') {
      return true;
    }
    
    // Skip hidden fields that might cause issues
    if (fieldType === 'hidden' && field.style.display === 'none') {
      return true;
    }
    
    // Skip disabled or readonly fields
    if (field.disabled || field.readOnly) {
      return true;
    }
    
    // Skip fields that are not visible
    if (field.offsetParent === null && field.style.display !== 'none') {
      return true;
    }
    
    // Skip CAPTCHA-related fields
    const fieldName = (field.name || field.id || '').toLowerCase();
    if (fieldName.includes('captcha') || fieldName.includes('recaptcha')) {
      return true;
    }
    
    // Skip fields with no value to set
    if (!fieldData.value || fieldData.value.trim() === '') {
      return false; // Don't skip, just won't fill anything
    }
    
    return false;
  }

  getSkipReason(field) {
    const fieldType = field.type?.toLowerCase();
    
    if (fieldType === 'file') return 'File upload field (security restriction)';
    if (field.disabled) return 'Field is disabled';
    if (field.readOnly) return 'Field is read-only';
    if (field.offsetParent === null) return 'Field is not visible';
    
    const fieldName = (field.name || field.id || '').toLowerCase();
    if (fieldName.includes('captcha')) return 'CAPTCHA field';
    
    return 'Unknown reason';
  }

  fillField(field, value) {
    console.log(`🖊️ Filling field "${field.name || field.id}" (${field.type}) with value: "${value}"`);
    
    // Handle different field types
    switch (field.type) {
      case 'checkbox':
        const shouldCheck = value === 'true' || value === true || value === 'Yes' || value === '1';
        if (field.checked !== shouldCheck) {
          field.checked = shouldCheck;
          // Trigger click event for better compatibility
          field.click();
          console.log(`   ✅ Checkbox ${shouldCheck ? 'checked' : 'unchecked'}`);
        }
        break;
        
      case 'radio':
        // Improved radio button selection logic
        let shouldSelect = false;
        
        // Direct value matches
        if (field.value === value || field.value.toLowerCase() === value.toLowerCase()) {
          shouldSelect = true;
        }
        // Boolean-style matches
        else if ((value === 'true' || value === true || value === 'Yes' || value === '1') && 
                 (field.value.toLowerCase() === 'yes' || field.value === '1' || field.value.toLowerCase() === 'true')) {
          shouldSelect = true;
        }
        else if ((value === 'false' || value === false || value === 'No' || value === '0') && 
                 (field.value.toLowerCase() === 'no' || field.value === '0' || field.value.toLowerCase() === 'false')) {
          shouldSelect = true;
        }
        
        if (shouldSelect && !field.checked) {
          field.checked = true;
          // Trigger click and change events for better compatibility
          field.click();
          field.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`   🔘 Radio button selected: "${field.value}"`);
        } else if (shouldSelect) {
          console.log(`   🔘 Radio button already selected: "${field.value}"`);
        } else {
          console.log(`   ⚪ Radio button not selected (value mismatch): expected "${value}", field value "${field.value}"`);
        }
        break;
        
      case 'select-one':
      case 'select-multiple':
        this.fillSelectField(field, value);
        break;
        
      case 'file':
        // Never try to fill file inputs - they can't be set programmatically
        console.log(`   ⏭️ Skipping file input field (security restriction)`);
        throw new Error(`File input field cannot be filled programmatically: ${field.name || field.id}`);
        break;
        
      default:
        try {
          const oldValue = field.value;
          
          // Direct protection against file inputs
          if (field.type === 'file') {
            console.log(`   ⚠️ File input detected, cannot fill: ${field.name || field.id}`);
            return; // Exit early, don't try to set value
          }
          
                      // Protect against file input errors
            if (field.type === 'file') {
              console.log('⚠️ Skipping file input field');
              return;
            }
            
            try {
              field.value = value;
            } catch (error) {
              if (error.message.includes('filename')) {
                console.log('⚠️ File input error caught, skipping field');
                return;
              }
              throw error;
            }
          
          // For text fields, also try setting textContent if value doesn't work
          if (field.value !== value && field.tagName.toLowerCase() !== 'input') {
            field.textContent = value;
          }
          
          console.log(`   📝 Text field filled: "${oldValue}" → "${field.value}"`);
        } catch (error) {
          if (error.message.includes('filename') || error.message.includes('file')) {
            console.log(`   ⚠️ File input error caught and handled: ${field.name || field.id}`);
            return; // Don't propagate file input errors
          } else {
            throw error; // Re-throw other errors
          }
        }
    }
    
    // Trigger comprehensive events to notify the page of changes
    try {
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.dispatchEvent(new Event('blur', { bubbles: true }));
      
      // Also trigger focus and click events for better compatibility
      field.dispatchEvent(new Event('focus', { bubbles: true }));
      
      // For React/modern frameworks, trigger custom events
      if (field._valueTracker) {
        field._valueTracker.setValue('');
      }
    } catch (error) {
      console.warn('⚠️ Error triggering events:', error);
    }
  }

  fillSelectField(field, value) {
    console.log(`📋 Filling select field with options:`, Array.from(field.options).map(opt => opt.textContent || opt.value));
    
    if (!value || value.trim() === '') {
      console.log('   ⚠️ No value provided for select field');
      return;
    }
    
    const options = Array.from(field.options);
    let matchingOption = null;
    
    // 1. Try exact value match
    matchingOption = options.find(opt => 
      opt.value.toLowerCase() === value.toLowerCase()
    );
    
    if (matchingOption) {
      console.log(`   ✅ Exact value match found: "${matchingOption.textContent}"`);
      field.value = matchingOption.value;
      return;
    }
    
    // 2. Try exact text match
    matchingOption = options.find(opt => 
      (opt.textContent || '').toLowerCase() === value.toLowerCase()
    );
    
    if (matchingOption) {
      console.log(`   ✅ Exact text match found: "${matchingOption.textContent}"`);
      field.value = matchingOption.value;
      return;
    }
    
    // 3. Try partial text match (for universities, etc.)
    matchingOption = options.find(opt => {
      const optionText = (opt.textContent || '').toLowerCase();
      const searchValue = value.toLowerCase();
      
      // Check if either contains the other
      return optionText.includes(searchValue) || searchValue.includes(optionText);
    });
    
    if (matchingOption) {
      console.log(`   ✅ Partial match found: "${matchingOption.textContent}" for "${value}"`);
      field.value = matchingOption.value;
      return;
    }
    
    // 4. Try fuzzy matching for universities (handle different naming conventions)
    if (value.toLowerCase().includes('university') || value.toLowerCase().includes('college')) {
      matchingOption = this.findUniversityMatch(options, value);
      
      if (matchingOption) {
        console.log(`   ✅ University fuzzy match found: "${matchingOption.textContent}" for "${value}"`);
        field.value = matchingOption.value;
        return;
      }
    }
    
    // 5. Try word-based matching for complex names
    const valueWords = value.toLowerCase().split(/[\s,.-]+/).filter(word => word.length > 2);
    if (valueWords.length > 1) {
      matchingOption = options.find(opt => {
        const optionText = (opt.textContent || '').toLowerCase();
        const optionWords = optionText.split(/[\s,.-]+/).filter(word => word.length > 2);
        
        // Check if most words match
        const matchingWords = valueWords.filter(word => 
          optionWords.some(optWord => optWord.includes(word) || word.includes(optWord))
        );
        
        return matchingWords.length >= Math.min(2, valueWords.length);
      });
      
      if (matchingOption) {
        console.log(`   ✅ Word-based match found: "${matchingOption.textContent}" for "${value}"`);
        field.value = matchingOption.value;
        return;
      }
    }
    
    console.log(`   ❌ No match found for "${value}" in dropdown options`);
  }

  findUniversityMatch(options, universityName) {
    const cleanName = universityName.toLowerCase()
      .replace(/^(the\s+)?university\s+of\s+/, '')
      .replace(/\s+university$/, '')
      .replace(/^(the\s+)/, '')
      .trim();
    
    console.log(`   🎓 Looking for university match for cleaned name: "${cleanName}"`);
    
    return options.find(opt => {
      const optionText = (opt.textContent || '').toLowerCase();
      const cleanOption = optionText
        .replace(/^(the\s+)?university\s+of\s+/, '')
        .replace(/\s+university$/, '')
        .replace(/^(the\s+)/, '')
        .trim();
      
      // Check various combinations
      const patterns = [
        cleanName === cleanOption,
        cleanName.includes(cleanOption),
        cleanOption.includes(cleanName),
        // Handle cases like "Lancaster" vs "Lancaster University"
        cleanName.split(/[\s,.-]+/)[0] === cleanOption.split(/[\s,.-]+/)[0],
        // Handle cases like "University of California, Berkeley" vs "UC Berkeley"
        cleanName.includes(cleanOption.split(/[\s,.-]+/)[0]) && cleanOption.length > 3
      ];
      
      const matches = patterns.some(pattern => pattern);
      if (matches) {
        console.log(`     🎯 University match: "${cleanName}" matches "${cleanOption}"`);
      }
      
      return matches;
    });
  }

  highlightField(selector, type = 'info') {
    const field = document.querySelector(selector);
    if (!field) return;
    
    const colors = {
      info: '#3b82f6',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b'
    };
    
    const originalStyle = {
      backgroundColor: field.style.backgroundColor,
      border: field.style.border,
      boxShadow: field.style.boxShadow
    };
    
    // Apply highlight
    field.style.backgroundColor = `${colors[type]}20`;
    field.style.border = `2px solid ${colors[type]}`;
    field.style.boxShadow = `0 0 0 3px ${colors[type]}30`;
    
    // Remove highlight after 3 seconds
    setTimeout(() => {
      field.style.backgroundColor = originalStyle.backgroundColor;
      field.style.border = originalStyle.border;
      field.style.boxShadow = originalStyle.boxShadow;
    }, 3000);
  }

  activate() {
    this.isActive = true;
    document.body.classList.add('job-bot-active');
    
    // Add activation indicator
    if (!document.querySelector('.job-bot-active-indicator')) {
      const indicator = document.createElement('div');
      indicator.className = 'job-bot-active-indicator';
      indicator.innerHTML = `
        <div style="
          position: fixed;
          top: 10px;
          right: 10px;
          background: #10b981;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: bold;
          z-index: 10000;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
          🤖 Job Bot Active
        </div>
      `;
      document.body.appendChild(indicator);
      
      setTimeout(() => indicator.remove(), 3000);
    }
  }

  deactivate() {
    this.isActive = false;
    document.body.classList.remove('job-bot-active');
  }

  // New method: Extract detailed job data from DOM
  extractJobData() {
    try {
      const url = window.location.href.toLowerCase();
      let jobData = { success: true };

      // Site-specific extraction strategies
      if (url.includes('lever.co')) {
        jobData = this.extractLeverJobData();
      } else if (url.includes('linkedin.com/jobs')) {
        jobData = this.extractLinkedInJobData();
      } else if (url.includes('indeed.com')) {
        jobData = this.extractIndeedJobData();
      } else if (url.includes('glassdoor.com')) {
        jobData = this.extractGlassdoorJobData();
      } else {
        // Generic extraction for other sites
        jobData = this.extractGenericJobData();
      }

      console.log('📋 Extracted job data:', jobData);
      return jobData;
    } catch (error) {
      console.error('❌ Job data extraction failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Extract job data from Lever.co
  extractLeverJobData() {
    const data = { success: true };
    
    // Job title - try multiple selectors
    const titleSelectors = [
      '.posting-headline h2',
      '.posting-headline',
      'h1[data-qa="posting-name"]',
      'h1',
      '.job-title'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.title = element.textContent.trim();
        break;
      }
    }

    // Company - extract from URL or page
    const urlMatch = window.location.href.match(/jobs\.lever\.co\/([^/]+)/);
    if (urlMatch) {
      data.company = urlMatch[1].charAt(0).toUpperCase() + urlMatch[1].slice(1);
    }

    // Job description
    const descSelectors = [
      '.posting-content .section-wrapper',
      '.posting-description',
      '.posting-content',
      '[data-qa="posting-description"]'
    ];

    for (const selector of descSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.description = element.textContent.trim();
        break;
      }
    }

    // Location
    const locationSelectors = [
      '.posting-categories .location',
      '.sort-by-location',
      '[data-qa="posting-location"]'
    ];

    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.location = element.textContent.trim();
        break;
      }
    }

    // Requirements - look for lists or bullet points
    const requirements = [];
    const reqSelectors = [
      '.posting-content ul li',
      '.posting-content ol li',
      '.requirements li',
      '.posting-requirements li'
    ];

    for (const selector of reqSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent.trim();
        if (text.length > 10 && text.length < 200) {
          requirements.push(text);
        }
      });
      if (requirements.length > 0) break;
    }

    if (requirements.length > 0) {
      data.requirements = requirements.slice(0, 10); // Limit to 10 requirements
    }

    return data;
  }

  // Generic job data extraction for other sites
  extractGenericJobData() {
    const data = { success: true };
    
    // Job title - try common selectors
    const titleSelectors = [
      'h1',
      '.job-title',
      '.title',
      '[data-testid="job-title"]',
      '.posting-headline'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.title = element.textContent.trim();
        break;
      }
    }

    // Company - try common selectors
    const companySelectors = [
      '.company-name',
      '.employer',
      '.company',
      '[data-testid="company-name"]'
    ];
    
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.company = element.textContent.trim();
        break;
      }
    }

    // Description - get main content
    const descSelectors = [
      '.job-description',
      '.description',
      '.content',
      '.job-details',
      'main'
    ];

    for (const selector of descSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim().length > 200) {
        data.description = element.textContent.trim();
        break;
      }
    }

    return data;
  }

  // New method: Get page text content
  getPageText() {
    try {
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style, nav, header, footer');
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = document.body.innerHTML;
      
      tempDiv.querySelectorAll('script, style, nav, header, footer').forEach(el => el.remove());
      
      const text = tempDiv.textContent || tempDiv.innerText || '';
      
      return {
        success: true,
        text: text.replace(/\s+/g, ' ').trim(),
        length: text.length
      };
    } catch (error) {
      console.error('❌ Failed to get page text:', error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize content script
const contentScript = new ContentScriptController(); 
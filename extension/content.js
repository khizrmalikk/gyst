// Content Script for Job Application Bot Extension
// This script runs on every page and helps with form detection and filling

console.log('🚀 Job Application Bot content script loaded');

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
    console.log('📨 Content script received message:', message);

    switch (message.action) {
      case 'ping':
        sendResponse({ status: 'active' });
        break;
        
      case 'getPageData':
        sendResponse(this.extractPageData());
        break;
        
      case 'analyzeForms':
        this.detectForms(); // Refresh form detection
        sendResponse({ forms: this.detectedForms });
        break;
        
      case 'fillForm':
        this.fillFormWithData(message.data);
        sendResponse({ success: true });
        break;
        
      case 'highlightField':
        this.highlightField(message.selector);
        sendResponse({ success: true });
        break;
        
      case 'activate':
        this.activate();
        sendResponse({ success: true });
        break;
        
      case 'deactivate':
        this.deactivate();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown action' });
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
    // Skip hidden, submit, and button fields
    const skipTypes = ['hidden', 'submit', 'button', 'reset', 'image'];
    return !skipTypes.includes(input.type);
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
    
    // Method 3: Previous sibling label
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
    
    // Method 4: Aria-label or aria-labelledby
    if (input.getAttribute('aria-label')) {
      return input.getAttribute('aria-label');
    }
    
    if (input.getAttribute('aria-labelledby')) {
      const labelElement = document.getElementById(input.getAttribute('aria-labelledby'));
      if (labelElement) return labelElement.textContent.trim();
    }
    
    // Method 5: Placeholder as fallback
    if (input.placeholder) {
      return input.placeholder;
    }
    
    // Method 6: Name attribute as last resort
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
    
    formData.forEach((fieldData) => {
      const field = document.querySelector(fieldData.selector) ||
                   document.querySelector(`[name="${fieldData.name}"]`) ||
                   document.querySelector(`#${fieldData.name}`);
      
      if (field) {
        this.fillField(field, fieldData.value);
        this.highlightField(fieldData.selector, 'success');
      } else {
        console.warn('⚠️ Field not found:', fieldData.name);
      }
    });
  }

  fillField(field, value) {
    // Handle different field types
    switch (field.type) {
      case 'checkbox':
      case 'radio':
        field.checked = value === 'true' || value === true;
        break;
        
      case 'select-one':
      case 'select-multiple':
        // Try to find matching option
        const options = Array.from(field.options);
        const matchingOption = options.find(opt => 
          opt.value.toLowerCase() === value.toLowerCase() ||
          opt.textContent.toLowerCase() === value.toLowerCase()
        );
        if (matchingOption) {
          field.value = matchingOption.value;
        }
        break;
        
      default:
        field.value = value;
    }
    
    // Trigger events to notify the page of changes
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));
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
}

// Initialize content script
const contentScript = new ContentScriptController(); 
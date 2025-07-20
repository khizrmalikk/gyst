// Side Panel Script for Job Application Bot Extension
class SidePanelController {
  constructor() {
    this.currentTab = null;
    this.apiBaseUrl = 'http://localhost:3000';
    this.currentJobData = null;
    this.detectedForms = [];
    this.isProcessing = false;
    
    // Track session data for comprehensive application tracking
    this.sessionData = {
      cvGenerated: false,
      coverLetterGenerated: false,
      formFilled: false,
      formFieldsCount: 0,
      aiResponsesCount: 0,
      cvContent: null,
      coverLetterContent: null,
      formData: null,
      actions: [] // Track user actions during session
    };
    
    this.init();
  }

  async init() {
    console.log('🚀 Job Application Bot side panel initialized');
    
    // Check authentication first
    const authResult = await this.checkAuthentication();
    if (!authResult.authenticated) {
      console.log('🔒 User not authenticated, redirecting to login...');
      this.showAuthenticationRequired();
      return;
    }
    
    console.log('✅ User authenticated:', authResult.user?.name || 'User');
    
    // Get current tab
    await this.getCurrentTab();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load saved settings
    await this.loadSettings();
    
    // Listen for page change messages from content script
    this.setupPageChangeListener();
    
    // Analyze current page
    await this.analyzePage();
  }

  async checkAuthentication() {
    try {
      console.log('🔐 Checking authentication status...');
      
      // Try to fetch user profile to check auth
      const response = await fetch(`${this.apiBaseUrl}/api/extension/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Include cookies for authentication
      });
      
      if (response.status === 401) {
        console.log('❌ User not authenticated (401)');
        return { authenticated: false, error: 'Not authenticated' };
      }
      
      if (!response.ok) {
        console.log('❌ Auth check failed:', response.status);
        return { authenticated: false, error: `Server error: ${response.status}` };
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.log('❌ Profile fetch failed:', data.error);
        return { authenticated: false, error: data.error };
      }
      
      console.log('✅ Authentication successful');
      return { 
        authenticated: true, 
        user: data.profile 
      };
      
    } catch (error) {
      console.error('❌ Authentication check failed:', error);
      return { authenticated: false, error: error.message };
    }
  }

  showAuthenticationRequired() {
    // Update UI to show authentication required
    const container = document.querySelector('.container');
    if (!container) return;
    
    container.innerHTML = `
      <div class="auth-required">
        <div class="header">
          <div class="logo">
            <img src="assets/icon32.svg" alt="Job Application Bot" class="logo-icon">
            <h1>Job Application Bot</h1>
          </div>
        </div>
        
        <div class="content" style="text-align: center; padding: 40px 20px;">
          <div class="auth-message">
            <h2>🔒 Authentication Required</h2>
            <p>You need to be logged in to use the Job Application Bot extension.</p>
            <p>Please log in to your account to access all features including:</p>
            
            <ul style="text-align: left; margin: 20px 0; padding-left: 40px;">
              <li>📄 CV Generation</li>
              <li>📝 Cover Letter Creation</li>
              <li>✍️ Form Auto-filling</li>
              <li>📊 Application Tracking</li>
            </ul>
            
            <div class="auth-actions" style="margin-top: 30px;">
              <button id="loginBtn" class="btn btn-primary" style="margin: 10px;">
                🔑 Login to Dashboard
              </button>
              <button id="signupBtn" class="btn btn-secondary" style="margin: 10px;">
                ✨ Create Account  
              </button>
            </div>
            
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              After logging in, reload this extension to continue.
            </p>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners for auth buttons
    document.getElementById('loginBtn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: `${this.apiBaseUrl}/auth/login` });
    });
    
    document.getElementById('signupBtn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: `${this.apiBaseUrl}/auth/signup` });
    });
  }

  setupPageChangeListener() {
    // Since Chrome extensions don't allow direct background-to-sidepanel messaging,
    // we'll poll for URL changes periodically
    setInterval(async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        
        if (currentTab && this.currentTab && currentTab.url !== this.currentTab.url) {
          console.log('🔄 URL changed detected:', this.currentTab.url, '→', currentTab.url);
          
          // Update current tab info
          const oldUrl = this.currentTab.url;
          this.currentTab = currentTab;
          
          // Update URL display
          const pageUrlElement = document.getElementById('pageUrl');
          if (pageUrlElement) {
            pageUrlElement.textContent = currentTab.url;
          }
          
          // Reset job data
          this.currentJobData = null;
          
          // Re-analyze the new page
          console.log('🔍 Auto-analyzing new page...');
          await this.analyzePage();
          
          // Show notification of page change
          this.showMessage(`Page changed - analyzing new content...`, 'info');
        }
      } catch (error) {
        console.error('❌ Error in URL change detection:', error);
      }
    }, 2000); // Check every 2 seconds
    
    // Also listen for direct messages (backup method)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Side panel received message:', message);
      
      if (message.action === 'pageChanged') {
        console.log('🔄 Page changed, re-analyzing...', message.url);
        
        // Update current tab info
        this.currentTab.url = message.url;
        
        // Update URL display
        const pageUrlElement = document.getElementById('pageUrl');
        if (pageUrlElement) {
          pageUrlElement.textContent = message.url;
        }
        
        // Update job data and re-analyze
        if (message.jobData) {
          this.currentJobData = message.jobData;
          this.updatePageInfo(message.jobData);
        }
        
        // Reset form detection
        this.detectedForms = [];
        document.getElementById('formSection')?.classList.add('hidden');
        
        // Auto-analyze if enabled
        setTimeout(() => {
          this.analyzePage();
        }, 1000);
      }
    });
  }

  async getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];
      
      // Update URL display
      const pageUrlElement = document.getElementById('pageUrl');
      if (pageUrlElement) {
        pageUrlElement.textContent = this.currentTab.url;
      }
      
      console.log('📍 Current tab:', this.currentTab.url);
    } catch (error) {
      console.error('❌ Error getting current tab:', error);
    }
  }

  setupEventListeners() {
    // Close button functionality
    document.getElementById('closeBtn')?.addEventListener('click', () => {
      console.log('🚪 Closing side panel');
      window.close();
    });

    // Manual analyze page button
    document.getElementById('analyzePageBtn')?.addEventListener('click', () => {
      console.log('🔄 Manual page analysis triggered');
      this.analyzePage();
    });

    // Job Search
    document.getElementById('searchJobsBtn')?.addEventListener('click', () => this.searchJobs());
    
    // Page Analysis
    document.getElementById('analyzeFormBtn')?.addEventListener('click', () => this.analyzeForms());
    
    // Actions
    document.getElementById('fillFormBtn')?.addEventListener('click', () => this.fillForm());
    document.getElementById('generateCVBtn')?.addEventListener('click', () => {
      console.log('📄 CV generation button clicked');
      this.generateCV();
    });
    document.getElementById('generateCoverLetterBtn')?.addEventListener('click', () => {
      console.log('📝 Cover letter generation button clicked');
      this.generateCoverLetter();
    });
    document.getElementById('markSubmittedBtn')?.addEventListener('click', () => this.markAsSubmitted());
    
    // Settings
    document.getElementById('openDashboard')?.addEventListener('click', () => {
      chrome.tabs.create({ url: `${this.apiBaseUrl}/pages` });
    });
    
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to sign out?')) {
        console.log('🚪 User signing out...');
        
        try {
          // Call the logout endpoint
          const response = await fetch(`${this.apiBaseUrl}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
          });
          
          if (response.ok) {
            this.showMessage('Successfully signed out', 'success');
            
            // Open login page
            setTimeout(() => {
              chrome.tabs.create({ url: `${this.apiBaseUrl}/auth/login` });
            }, 1000);
            
            // Show authentication required screen
            setTimeout(() => {
              this.showAuthenticationRequired();
            }, 1500);
          } else {
            // Even if API call fails, show auth screen as user requested logout
            this.showMessage('Signed out', 'info');
            setTimeout(() => {
              chrome.tabs.create({ url: `${this.apiBaseUrl}/auth/login` });
              this.showAuthenticationRequired();
            }, 1000);
          }
        } catch (error) {
          console.error('❌ Logout error:', error);
          // Fallback: still show auth screen and open login
          this.showMessage('Signed out', 'info');
          setTimeout(() => {
            chrome.tabs.create({ url: `${this.apiBaseUrl}/auth/login` });
            this.showAuthenticationRequired();
          }, 1000);
        }
      }
    });
    
    document.getElementById('autoDetectForms')?.addEventListener('change', (e) => {
      this.saveSetting('autoDetectForms', e.target.checked);
    });
    
    document.getElementById('showTooltips')?.addEventListener('change', (e) => {
      this.saveSetting('showTooltips', e.target.checked);
    });
    
    // Help and feedback links
    document.getElementById('helpLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: `${this.apiBaseUrl}/help` });
    });
    
    document.getElementById('feedbackLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: `${this.apiBaseUrl}/feedback` });
    });
    
    document.getElementById('settingsLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: `${this.apiBaseUrl}/pages/profile` });
    });
    
    console.log('✅ Event listeners set up');
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get(['autoDetectForms', 'showTooltips']);
      
      document.getElementById('autoDetectForms').checked = settings.autoDetectForms !== false;
      document.getElementById('showTooltips').checked = settings.showTooltips !== false;
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  }

  async analyzePage() {
    if (!this.currentTab) {
      console.warn('⚠️ No current tab for analysis');
      this.updateStatus('Ready', 'ready');
      return;
    }
    
    try {
      this.updateStatus('Analyzing page...', 'processing');
      console.log('🔍 Starting page analysis for:', this.currentTab.url);
      
      // Send message to content script to analyze page
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'getPageData'
      });
      
      console.log('📊 Page analysis response:', response);
      
      if (response && response.success !== false) {
        this.currentJobData = response;
        this.updatePageInfo(response);
        
        // Auto-detect forms if enabled
        const autoDetect = document.getElementById('autoDetectForms').checked;
        if (autoDetect) {
          await this.analyzeForms();
        }
        
        this.showMessage('Page analysis complete', 'success');
        this.updateStatus('Ready', 'ready');
      } else {
        console.warn('⚠️ No valid response from content script, using fallback');
        this.fallbackPageAnalysis();
        this.updateStatus('Ready', 'ready');
      }
      
    } catch (error) {
      console.error('❌ Page analysis failed (using fallback):', error);
      
      // Don't show "Analysis failed" - use fallback instead
      console.log('🔄 Content script not available, using URL-based analysis');
      this.fallbackPageAnalysis();
      this.updateStatus('Ready', 'ready');
      
      // Show a less alarming message
      this.showMessage('Using basic page detection (content script unavailable)', 'info');
    }
  }

  fallbackPageAnalysis() {
    if (!this.currentTab) {
      console.warn('⚠️ No current tab for fallback analysis');
      return;
    }
    
    const url = this.currentTab.url.toLowerCase();
    const title = this.currentTab.title || '';
    
    console.log('🔄 Using fallback analysis for:', url, 'Title:', title);
    
    let pageType = 'general';
    let jobData = {
      url: this.currentTab.url,
      title: title,
      pageType: 'general'
    };
    
    // Enhanced URL pattern matching
    if (url.includes('apply') || url.includes('application') || url.includes('jobs/apply') || url.includes('career/apply')) {
      pageType = 'application_form';
      jobData.pageType = 'application_form';
      jobData.hasApplicationForm = true;
      console.log('🎯 Detected application form page');
    } else if (url.includes('job') || url.includes('career') || url.includes('position') || 
               url.includes('linkedin.com/jobs') || url.includes('indeed.com') || 
               url.includes('glassdoor.com') || url.includes('lever.co')) {
      pageType = 'job_listing';
      jobData.pageType = 'job_listing';
      console.log('💼 Detected job listing page');
      
      // Enhanced job info extraction from title and URL
      if (title) {
        const titleParts = title.split(' - ');
        const jobTitle = titleParts[0];
        jobData.jobTitle = jobTitle;
        jobData.title = jobTitle;
        
        // Try to extract company from title
        if (titleParts.length > 1) {
          const companyPart = titleParts[1];
          // Clean up common suffixes
          const company = companyPart.replace(/\s+(careers|jobs|hiring).*$/i, '').trim();
          if (company) {
            jobData.company = company;
          }
        }
        
        // Extract company from URL if not found in title
        if (!jobData.company) {
          const urlParts = url.split('/');
          for (const part of urlParts) {
            if (part && part.length > 3 && !part.includes('job') && !part.includes('www') && !part.includes('com')) {
              jobData.company = part.charAt(0).toUpperCase() + part.slice(1);
              break;
            }
          }
        }
        
        console.log('📋 Extracted job info:', { title: jobData.jobTitle, company: jobData.company });
      }
    } else {
      console.log('🌐 General page detected');
    }
    
    this.currentJobData = jobData;
    this.updatePageInfo(jobData);
  }

  updatePageInfo(data) {
    if (!data) {
      console.warn('⚠️ No data provided for updatePageInfo');
      return;
    }
    
    console.log('📱 Updating page info:', data);
    
    // Update page type
    const pageTypeMap = {
      'job_listing': '💼 Job Listing',
      'application_form': '📝 Application Form',
      'job_board': '🔍 Job Board',
      'career_page': '🏢 Career Page',
      'general': '🌐 General Page'
    };
    
    const pageType = data.pageType || 'general';
    document.getElementById('pageType').textContent = pageTypeMap[pageType] || '🌐 General Page';
    
    // Update job details if available
    if (data.jobTitle || data.title) {
      document.getElementById('jobTitle').textContent = data.jobTitle || data.title;
      document.getElementById('jobSection')?.classList.remove('hidden');
    }
    
    if (data.company) {
      document.getElementById('jobCompany').textContent = data.company;
    }
    
    if (data.location) {
      document.getElementById('jobLocation').textContent = data.location;
    }
    
    // Show workflow guidance based on page type
    this.updateWorkflowGuidance(pageType, data);
    
    // Show appropriate sections and enable buttons based on page type
    if (pageType === 'application_form' || data.hasApplicationForm) {
      document.getElementById('formSection')?.classList.remove('hidden');
      document.getElementById('analyzeFormBtn').disabled = false;
      this.showWorkflowStep('form-filling');
    } else if (pageType === 'job_listing' && (data.jobTitle || data.title)) {
      this.showWorkflowStep('job-analysis');
    } else {
      this.showWorkflowStep('general');
    }
  }

  updateWorkflowGuidance(pageType, data) {
    const guidanceElement = document.getElementById('workflowGuidance');
    if (!guidanceElement) return;

    let guidance = '';
    
    if (pageType === 'job_listing' && (data.jobTitle || data.title)) {
      guidance = `
        <div class="workflow-step active">
          <h4>📄 Step 1: Generate Documents</h4>
          <p>You're on a job listing page! Generate your CV and Cover Letter tailored for this position.</p>
          <div class="workflow-actions">
            <button class="btn btn-secondary btn-sm" id="workflowGenerateCVBtn">Generate CV</button>
            <button class="btn btn-secondary btn-sm" id="workflowGenerateCoverLetterBtn">Generate Cover Letter</button>
          </div>
        </div>
        <div class="workflow-step">
          <h4>📝 Step 2: Apply</h4>
          <p>Navigate to the application form page to fill out your application.</p>
        </div>
      `;
    } else if (pageType === 'application_form' || data.hasApplicationForm) {
      guidance = `
        <div class="workflow-step completed">
          <h4>📄 Step 1: Generate Documents ✓</h4>
          <p>Documents generated (if applicable).</p>
        </div>
        <div class="workflow-step active">
          <h4>📝 Step 2: Fill Application Form</h4>
          <p>You're on an application page! Click "Fill Application Form" to automatically complete the form with your profile data and AI-generated responses.</p>
          <div class="workflow-actions">
            <button class="btn btn-primary btn-sm" id="workflowFillFormBtn">Fill Application Form</button>
          </div>
        </div>
        <div class="workflow-step">
          <h4>✅ Step 3: Submit & Track</h4>
          <p>After filling the form, submit it manually and mark it as submitted for tracking.</p>
        </div>
      `;
    } else {
      guidance = `
        <div class="workflow-step">
          <h4>🔍 Find a Job</h4>
          <p>Navigate to a job listing page to start the application process, or use the job search feature above.</p>
        </div>
      `;
    }
    
    guidanceElement.innerHTML = guidance;
    
    // Add event listeners after DOM insertion (CSP-compliant)
    this.setupWorkflowEventListeners();
  }

  setupWorkflowEventListeners() {
    // Remove any existing listeners first
    const workflowGenerateCVBtn = document.getElementById('workflowGenerateCVBtn');
    const workflowGenerateCoverLetterBtn = document.getElementById('workflowGenerateCoverLetterBtn');
    const workflowFillFormBtn = document.getElementById('workflowFillFormBtn');
    
    if (workflowGenerateCVBtn) {
      workflowGenerateCVBtn.addEventListener('click', () => {
        console.log('📄 Workflow CV button clicked, triggering main CV button');
        document.getElementById('generateCVBtn')?.click();
      });
    }
    
    if (workflowGenerateCoverLetterBtn) {
      workflowGenerateCoverLetterBtn.addEventListener('click', () => {
        console.log('📝 Workflow Cover Letter button clicked, triggering main Cover Letter button');
        document.getElementById('generateCoverLetterBtn')?.click();
      });
    }
    
    if (workflowFillFormBtn) {
      workflowFillFormBtn.addEventListener('click', () => {
        console.log('✍️ Workflow Fill Form button clicked, triggering main Fill Form button');
        document.getElementById('fillFormBtn')?.click();
      });
    }
  }

  showWorkflowStep(step) {
    console.log('🎯 Showing workflow step:', step);
    
    // Reset all sections
    document.getElementById('jobSection')?.classList.add('hidden');
    document.getElementById('formSection')?.classList.add('hidden');
    
    // Show appropriate sections based on step
    switch (step) {
      case 'job-analysis':
        document.getElementById('jobSection')?.classList.remove('hidden');
        // Enable CV and Cover Letter generation
        document.getElementById('generateCVBtn').disabled = false;
        document.getElementById('generateCoverLetterBtn').disabled = false;
        document.getElementById('fillFormBtn').disabled = true;
        document.getElementById('markSubmittedBtn').disabled = true;
        console.log('✅ Enabled CV/Cover Letter buttons for job listing');
        break;
        
      case 'form-filling':
        document.getElementById('formSection')?.classList.remove('hidden');
        document.getElementById('jobSection')?.classList.remove('hidden');
        // Enable form analysis and filling
        document.getElementById('analyzeFormBtn').disabled = false;
        document.getElementById('fillFormBtn').disabled = false; // Will be disabled until forms are detected
        document.getElementById('markSubmittedBtn').disabled = true;
        console.log('✅ Enabled form analysis buttons for application page');
        break;
        
      case 'general':
      default:
        // General browsing state
        document.getElementById('generateCVBtn').disabled = true;
        document.getElementById('generateCoverLetterBtn').disabled = true;
        document.getElementById('fillFormBtn').disabled = true;
        document.getElementById('markSubmittedBtn').disabled = true;
        console.log('⚪ Disabled action buttons for general page');
        break;
    }
  }

  async searchJobs() {
    const query = document.getElementById('jobQuery').value.trim();
    const location = document.getElementById('jobLocation').value.trim();
    
    if (!query) {
      this.showMessage('Please enter a job title or keywords', 'error');
      return;
    }
    
    this.setProcessing(true, 'Searching for jobs...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/jobs/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          location,
          limit: 10
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.displayJobResults(data.jobs);
        this.showMessage(`Found ${data.jobs.length} jobs`, 'success');
      } else {
        this.showMessage(data.error || 'Failed to search jobs', 'error');
      }
    } catch (error) {
      console.error('❌ Job search failed:', error);
      this.showMessage('Job search failed. Please try again.', 'error');
    } finally {
      this.setProcessing(false);
    }
  }

  displayJobResults(jobs) {
    const resultsContainer = document.getElementById('jobResults');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    
    if (jobs.length === 0) {
      resultsContainer.innerHTML = '<p>No jobs found. Try different keywords.</p>';
      return;
    }
    
    jobs.forEach((job, index) => {
      const jobElement = document.createElement('div');
      jobElement.className = 'job-result';
      jobElement.innerHTML = `
        <h4>${job.title}</h4>
        <p><strong>${job.company}</strong> - ${job.location}</p>
        <p>${job.description?.substring(0, 100)}...</p>
        <button class="btn btn-link" data-job-url="${job.url}" data-job-index="${index}">View Job</button>
      `;
      resultsContainer.appendChild(jobElement);
      
      // Add event listener for the View Job button (CSP-compliant)
      const viewJobBtn = jobElement.querySelector('.btn');
      if (viewJobBtn) {
        viewJobBtn.addEventListener('click', (e) => {
          const jobUrl = e.target.getAttribute('data-job-url');
          if (jobUrl) {
            console.log('🔗 Opening job URL:', jobUrl);
            chrome.tabs.create({ url: jobUrl });
          }
        });
      }
    });
    
    resultsContainer.classList.remove('hidden');
  }

  async analyzeForms() {
    if (!this.currentTab) return;
    
    this.setProcessing(true, 'Analyzing forms...');
    
    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'analyzeForms'
      });
      
      if (response && response.forms) {
        this.detectedForms = response.forms;
        this.updateFormInfo(response.forms);
        
        // Enable form actions if forms are found
        const hasApplicationForm = response.forms.some(form => form.isApplicationForm);
        document.getElementById('fillFormBtn').disabled = !hasApplicationForm;
        
        this.showMessage(`Found ${response.forms.length} form(s)`, 'success');
      } else {
        this.showMessage('No forms detected on this page', 'warning');
      }
    } catch (error) {
      console.error('❌ Form analysis failed:', error);
      this.showMessage('Form analysis failed. Please try again.', 'error');
    } finally {
      this.setProcessing(false);
    }
  }

  updateFormInfo(forms) {
    const formStatus = document.getElementById('formStatus');
    const formFields = document.getElementById('formFields');
    
    if (forms.length === 0) {
      formStatus.textContent = 'No forms detected';
      formFields.innerHTML = '';
      return;
    }
    
    const applicationForms = forms.filter(form => form.isApplicationForm);
    
    if (applicationForms.length > 0) {
      formStatus.textContent = `${applicationForms.length} application form(s) detected`;
      formStatus.className = 'form-status success';
      
      // Show form fields
      let fieldsHtml = '';
      applicationForms.forEach(form => {
        fieldsHtml += `<div class="form-summary">
          <strong>${form.title || 'Application Form'}</strong>
          <span>${form.fields.length} fields</span>
        </div>`;
      });
      formFields.innerHTML = fieldsHtml;
    } else {
      formStatus.textContent = `${forms.length} form(s) detected (not application forms)`;
      formStatus.className = 'form-status warning';
    }
  }

  async fillForm() {
    if (!this.currentTab || this.detectedForms.length === 0) {
      this.showMessage('No forms to fill', 'warning');
      return;
    }
    
    this.setProcessing(true, 'Analyzing form fields...');
    
    try {
      // Get user profile data
      const profileResponse = await fetch(`${this.apiBaseUrl}/api/extension/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        throw new Error('Failed to get user profile');
      }

      // Get current form fields from content script
      this.setProcessing(true, 'Detecting form fields...');
      
      const formAnalysisResponse = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'analyzeForms'
      });
      
      if (!formAnalysisResponse || !formAnalysisResponse.forms || formAnalysisResponse.forms.length === 0) {
        this.showMessage('No forms detected on current page', 'warning');
        return;
      }

      // Extract all form fields for AI processing
      const allFormFields = [];
      formAnalysisResponse.forms.forEach(form => {
        if (form.isApplicationForm && form.fields) {
          allFormFields.push(...form.fields);
        }
      });

      if (allFormFields.length === 0) {
        this.showMessage('No fillable fields found in application forms', 'warning');
        return;
      }

      // Generate intelligent form data using AI
      this.setProcessing(true, 'Generating intelligent responses...');
      
      const fillResponse = await fetch(`${this.apiBaseUrl}/api/extension/fill-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobInfo: this.currentJobData,
          userProfile: profileData.profile,
          formFields: allFormFields
        })
      });
      
      const fillData = await fillResponse.json();
      
      if (!fillData.success) {
        throw new Error(fillData.error || 'Failed to generate form data');
      }

      // Send the intelligent form data to content script for filling
      this.setProcessing(true, 'Filling form fields...');
      
      const fillFormResponse = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'fillForm',
        data: fillData.formData
      });
      
      if (fillFormResponse && fillFormResponse.success) {
        // Track form filling
        const aiResponsesCount = fillData.formData.filter(field => 
          field.value && field.value.length > 50 // Assume longer responses are AI-generated
        ).length;
        
        this.sessionData.formFilled = true;
        this.sessionData.formFieldsCount = fillData.formData.length;
        this.sessionData.aiResponsesCount = aiResponsesCount;
        this.sessionData.formData = fillData.formData;
        this.sessionData.actions.push({
          action: 'form_filled',
          timestamp: new Date().toISOString(),
          fieldsCount: fillData.formData.length,
          aiResponsesCount: aiResponsesCount
        });
        
        this.showMessage(`Form filled successfully! ${fillData.formData.length} fields completed (${aiResponsesCount} AI-generated responses).`, 'success');
        
        // Enable mark as submitted button
        document.getElementById('markSubmittedBtn').disabled = false;
        
        // Update workflow guidance to show submission step
        this.updateWorkflowToSubmissionStep(fillData.formData.length, aiResponsesCount);
      } else {
        this.showMessage(fillFormResponse?.error || 'Form filling failed', 'error');
      }
    } catch (error) {
      console.error('❌ Form filling failed:', error);
      this.showMessage('Form filling failed. Please try again.', 'error');
    } finally {
      this.setProcessing(false);
    }
  }

  async generateCV() {
    console.log('🚀 Starting CV generation...');
    
    if (!this.currentJobData) {
      console.warn('⚠️ No job data available');
      this.showMessage('Please analyze the job page first', 'warning');
      return;
    }
    
    console.log('📊 Current job data for customization:', this.currentJobData);
    this.setProcessing(true, 'Generating job-tailored CV...');
    
    try {
      // Test API connectivity first
      console.log('🔗 Testing API connectivity...');
      const healthCheck = await fetch(`${this.apiBaseUrl}/api/health/public`, {
        method: 'GET'
      });
      
      if (!healthCheck.ok) {
        throw new Error(`API server not responding. Status: ${healthCheck.status}`);
      }
      
      console.log('✅ API server is responding');

      // Get user profile data first
      console.log('👤 Fetching complete user profile from database...');
      const profileResponse = await fetch(`${this.apiBaseUrl}/api/extension/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-extension-request': 'true'
        },
        credentials: 'include'
      });
      
      if (profileResponse.status === 401) {
        console.log('🔒 Authentication failed - redirecting to login');
        this.showMessage('Please log in to your account first', 'warning');
        setTimeout(() => {
          chrome.tabs.create({ url: `${this.apiBaseUrl}/auth/login` });
        }, 2000);
        return;
      }
      
      if (!profileResponse.ok) {
        throw new Error(`Profile API failed. Status: ${profileResponse.status}`);
      }
      
      const profileData = await profileResponse.json();
      console.log('📋 Complete profile data received:', profileData);
      
      if (!profileData.success) {
        throw new Error('Failed to get user profile: ' + (profileData.error || 'Unknown error'));
      }

      // Generate CV using the unified endpoint with job-specific customization
      console.log('🎯 Generating job-tailored CV...');
      console.log('📊 Job-specific data being sent:', {
        title: this.currentJobData.title,
        company: this.currentJobData.company,
        requirements: this.currentJobData.requirements?.length || 0,
        description: this.currentJobData.description?.substring(0, 100) + '...'
      });
      console.log('👤 Complete profile being sent:', {
        name: profileData.profile.name,
        skillsCount: profileData.profile.skills?.length || 0,
        workHistoryCount: profileData.profile.workHistory?.length || 0,
        hasEducation: !!profileData.profile.education
      });
      
      const response = await fetch(`${this.apiBaseUrl}/api/documents/generate-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-extension-request': 'true'
        },
        credentials: 'include',
        body: JSON.stringify({
          jobInfo: {
            title: this.currentJobData.title,
            company: this.currentJobData.company,
            location: this.currentJobData.location,
            description: this.currentJobData.description,
            requirements: this.currentJobData.requirements || [],
            salary: this.currentJobData.salary,
            url: this.currentTab.url
          },
          userProfile: profileData.profile
        })
      });
      
      console.log('📤 CV API response status:', response.status);
      
      if (response.status === 401) {
        console.log('🔒 Authentication failed during CV generation');
        this.showMessage('Authentication expired. Please log in again.', 'warning');
        setTimeout(() => {
          chrome.tabs.create({ url: `${this.apiBaseUrl}/auth/login` });
        }, 2000);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`CV generation failed. Status: ${response.status}, Error: ${errorData}`);
      }
      
      // Handle PDF download
      const blob = await response.blob();
      const filename = `${profileData.profile.name.replace(/[^a-zA-Z0-9]/g, '')}-${this.currentJobData.company?.replace(/[^a-zA-Z0-9]/g, '') || 'CV'}.pdf`;
      
      console.log('📄 Downloading job-tailored CV:', filename);
      this.downloadFile(blob, filename);
      
      // Track the CV generation in session data
      this.sessionData.cvGenerated = true;
      this.sessionData.actions.push({
        type: 'cv_generated',
        timestamp: new Date().toISOString(),
        jobTitle: this.currentJobData.title,
        company: this.currentJobData.company,
        filename: filename
      });
      
      console.log('✅ Job-tailored CV generated successfully');
      this.setProcessing(false);
      this.showMessage(`Job-tailored CV generated for ${this.currentJobData.company}!`, 'success');
      
      // Save the generated CV content to application data for database storage
      await this.saveGeneratedDocument('cv', {
        filename: filename,
        generatedAt: new Date().toISOString(),
        jobTitle: this.currentJobData.title,
        company: this.currentJobData.company,
        tailoredFor: `${this.currentJobData.title} at ${this.currentJobData.company}`
      });
      
    } catch (error) {
      console.error('❌ Job-tailored CV generation failed:', error);
      this.setProcessing(false);
      this.showMessage('CV generation failed. Please try again.', 'error');
      this.logError('CV Generation', error);
    }
  }

  async generateCoverLetter() {
    console.log('🚀 Starting cover letter generation...');
    
    if (!this.currentJobData) {
      console.warn('⚠️ No job data available');
      this.showMessage('Please analyze the job page first', 'warning');
      return;
    }
    
    console.log('📊 Current job data:', this.currentJobData);
    this.setProcessing(true, 'Generating cover letter...');
    
    try {
      // Test API connectivity first
      console.log('🔗 Testing API connectivity...');
      const healthCheck = await fetch(`${this.apiBaseUrl}/api/health/public`, {
        method: 'GET'
      });
      
      if (!healthCheck.ok) {
        throw new Error(`API server not responding. Status: ${healthCheck.status}`);
      }
      
      console.log('✅ API server is responding');

      // Get user profile data first
      console.log('👤 Fetching user profile...');
      const profileResponse = await fetch(`${this.apiBaseUrl}/api/extension/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-extension-request': 'true'
        },
        credentials: 'include'
      });
      
      if (profileResponse.status === 401) {
        console.log('🔒 Authentication failed - redirecting to login');
        this.showMessage('Please log in to your account first', 'warning');
        setTimeout(() => {
          chrome.tabs.create({ url: `${this.apiBaseUrl}/auth/login` });
        }, 2000);
        return;
      }
      
      if (!profileResponse.ok) {
        throw new Error(`Profile API failed. Status: ${profileResponse.status}`);
      }
      
      const profileData = await profileResponse.json();
      console.log('📋 Profile data received:', profileData);
      
      if (!profileData.success) {
        throw new Error('Failed to get user profile: ' + (profileData.error || 'Unknown error'));
      }

      // Generate cover letter using the unified endpoint
      console.log('🏗️ Calling cover letter generation API...');
      console.log('📊 Job Info being sent:', this.currentJobData);
      console.log('👤 Profile Info being sent:', profileData.profile);
      
      const response = await fetch(`${this.apiBaseUrl}/api/documents/generate-cover-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-extension-request': 'true'
        },
        credentials: 'include',
        body: JSON.stringify({
          jobInfo: this.currentJobData,
          userProfile: profileData.profile
        })
      });
      
      console.log('📤 Cover letter API response status:', response.status);
      
      if (response.status === 401) {
        console.log('🔒 Authentication failed during cover letter generation');
        this.showMessage('Authentication expired. Please log in again.', 'warning');
        setTimeout(() => {
          chrome.tabs.create({ url: `${this.apiBaseUrl}/auth/login` });
        }, 2000);
        return;
      }
      
      if (response.ok) {
        console.log('✅ Cover letter generated successfully, downloading...');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Use the filename format: profileName-companyName-CoverLetter.pdf
        const profileName = (profileData.profile.name || 'Profile').replace(/[^a-zA-Z0-9]/g, '');
        const companyName = (this.currentJobData.company || 'Company').replace(/[^a-zA-Z0-9]/g, '');
        const filename = `${profileName}-${companyName}-CoverLetter.pdf`;
        
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        // Track cover letter generation
        this.sessionData.coverLetterGenerated = true;
        this.sessionData.actions.push({
          action: 'cover_letter_generated',
          timestamp: new Date().toISOString(),
          filename: filename
        });
        
        console.log('💾 Cover letter downloaded:', filename);
        this.showMessage(`Cover letter generated and downloaded as ${filename}!`, 'success');
      } else {
        const errorText = await response.text();
        console.error('❌ Cover letter generation failed:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        this.showMessage(errorData.error || `Cover letter generation failed (${response.status})`, 'error');
      }
    } catch (error) {
      console.error('❌ Cover letter generation failed:', error);
      this.showMessage(`Cover letter generation failed: ${error.message}`, 'error');
    } finally {
      this.setProcessing(false);
    }
  }

  async markAsSubmitted() {
    if (!this.currentJobData) {
      this.showMessage('Please analyze the job page first', 'warning');
      return;
    }
    
    this.setProcessing(true, 'Saving application data...');
    
    try {
      // Prepare comprehensive application data
      const applicationData = {
        jobInfo: {
          title: this.currentJobData.title || this.currentJobData.jobTitle,
          company: this.currentJobData.company,
          location: this.currentJobData.location,
          description: this.currentJobData.description,
          requirements: this.currentJobData.requirements,
          salary: this.currentJobData.salary
        },
        url: this.currentTab.url,
        status: 'submitted',
        appliedAt: new Date().toISOString(),
        applicationMethod: 'chrome_extension',
        cvGenerated: this.sessionData.cvGenerated,
        coverLetterGenerated: this.sessionData.coverLetterGenerated,
        formFieldsCount: this.sessionData.formFieldsCount,
        aiResponsesCount: this.sessionData.aiResponsesCount,
        formData: this.sessionData.formData,
        pageTitle: this.currentTab.title,
        pageType: this.currentJobData.pageType || 'application_form',
        notes: `Extension session: ${this.sessionData.actions.length} actions taken. CV: ${this.sessionData.cvGenerated ? 'Yes' : 'No'}, Cover Letter: ${this.sessionData.coverLetterGenerated ? 'Yes' : 'No'}, Form Filled: ${this.sessionData.formFilled ? 'Yes' : 'No'}`
      };

      const response = await fetch(`${this.apiBaseUrl}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Track submission
        this.sessionData.actions.push({
          action: 'marked_as_submitted',
          timestamp: new Date().toISOString(),
          applicationId: data.application?.id
        });
        
        this.showMessage('Application successfully tracked with all details!', 'success');
        document.getElementById('markSubmittedBtn').disabled = true;
        
        // Show summary of what was tracked
        setTimeout(() => {
          this.showMessage(`Tracked: ${this.sessionData.cvGenerated ? 'CV' : ''} ${this.sessionData.coverLetterGenerated ? 'Cover Letter' : ''} ${this.sessionData.formFilled ? `${this.sessionData.formFieldsCount} form fields` : ''}`.trim(), 'info');
        }, 2000);
        
      } else {
        this.showMessage(data.error || 'Failed to save application', 'error');
      }
    } catch (error) {
      console.error('❌ Application tracking failed:', error);
      this.showMessage('Failed to save application. Please try again.', 'error');
    } finally {
      this.setProcessing(false);
    }
  }

  setProcessing(isProcessing, message = '') {
    this.isProcessing = isProcessing;
    
    const progressSection = document.getElementById('progressSection');
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    
    if (isProcessing) {
      progressSection?.classList.remove('hidden');
      if (progressText) progressText.textContent = message;
      if (progressFill) progressFill.style.width = '50%';
      
      // Disable action buttons
      document.getElementById('fillFormBtn').disabled = true;
      document.getElementById('generateCVBtn').disabled = true;
      document.getElementById('generateCoverLetterBtn').disabled = true;
      document.getElementById('searchJobsBtn').disabled = true;
      document.getElementById('analyzeFormBtn').disabled = true;
    } else {
      progressSection?.classList.add('hidden');
      if (progressFill) progressFill.style.width = '0%';
      
      // Re-enable action buttons
      document.getElementById('generateCVBtn').disabled = false;
      document.getElementById('generateCoverLetterBtn').disabled = false;
      document.getElementById('searchJobsBtn').disabled = false;
      document.getElementById('analyzeFormBtn').disabled = false;
      
      // Form fill button enabled only if forms are detected
      const hasApplicationForm = this.detectedForms.some(form => form.isApplicationForm);
      document.getElementById('fillFormBtn').disabled = !hasApplicationForm;
    }
  }

  updateStatus(message, type = 'ready') {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    
    if (statusText) statusText.textContent = message;
    
    if (statusDot) {
      statusDot.className = `status-dot ${type}`;
    }
  }

  showMessage(message, type = 'info') {
    const resultsSection = document.getElementById('resultsSection');
    const results = document.getElementById('results');
    
    if (results) {
      results.innerHTML = `<div class="message ${type}">${message}</div>`;
      resultsSection?.classList.remove('hidden');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        resultsSection?.classList.add('hidden');
      }, 5000);
    }
    
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  async saveSetting(key, value) {
    try {
      await chrome.storage.sync.set({ [key]: value });
      console.log(`Setting saved: ${key} = ${value}`);
    } catch (error) {
      console.error('❌ Error saving setting:', error);
    }
  }

  updateWorkflowToSubmissionStep(fieldsCount, aiResponsesCount) {
    const guidanceElement = document.getElementById('workflowGuidance');
    if (!guidanceElement) return;

    let guidance = '';
    
    guidance = `
      <div class="workflow-step completed">
        <h4>📄 Step 1: Generate Documents ✓</h4>
        <p>Documents generated (if applicable).</p>
      </div>
      <div class="workflow-step completed">
        <h4>📝 Step 2: Fill Application Form ✓</h4>
        <p>Application form filled with ${fieldsCount} fields (${aiResponsesCount} AI-generated responses).</p>
      </div>
      <div class="workflow-step active">
        <h4>✅ Step 3: Submit & Track</h4>
        <p>After filling the form, submit it manually and mark it as submitted for tracking.</p>
      </div>
    `;
    
    guidanceElement.innerHTML = guidance;
  }

  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async saveGeneratedDocument(type, documentData) {
    try {
      // Store generated document data in session for later database storage
      if (!this.sessionData.generatedDocuments) {
        this.sessionData.generatedDocuments = {};
      }
      
      this.sessionData.generatedDocuments[type] = {
        ...documentData,
        savedAt: new Date().toISOString()
      };
      
      console.log(`💾 ${type.toUpperCase()} document data saved for application tracking:`, documentData);
      
    } catch (error) {
      console.error(`Failed to save ${type} document data:`, error);
    }
  }
}

// Initialize side panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SidePanelController();
}); 
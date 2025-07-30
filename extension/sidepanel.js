// Side Panel Script for Job Application Bot Extension
class SidePanelController {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3000';
    this.currentTab = {};
    this.currentJobData = null;
    this.currentPageType = 'unknown';
    this.selectedProfileId = null;
    this.sessionData = {
      actions: [],
      cvGenerated: false,
      coverLetterGenerated: false,
      formFilled: false,
      formFieldsCount: 0,
      aiResponsesCount: 0,
      formData: null
    };
    this.isProcessing = false;
    this.authChecked = false;
    this.isAuthenticated = false;
    this.currentUser = null;
  }

  async init() {
    console.log('🚀 Initializing side panel controller...');
    
    // Set up message listeners first
    this.setupMessageListeners();
    
    // Check authentication first
    await this.checkAuthentication();
    
    if (!this.isAuthenticated) {
      this.showAuthRequired();
      return;
    }
    
    // Get current tab information
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0];
    
    console.log('📋 Current tab:', this.currentTab.url);
    
    // Initialize the UI
    this.initializeUI();
    this.updateCurrentPage();
  }

  // Set up message listeners for communication with background/content scripts
  setupMessageListeners() {
    console.log('📻 Setting up message listeners...');
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Sidepanel received message:', message);
      
      switch (message.action) {
        case 'formsDetected':
          this.handleFormsDetected(message.forms, message.url);
          break;
        case 'pageChanged':
          this.handlePageChanged(message.url, message.jobData);
          break;
        default:
          console.log('🤷 Unknown message action in sidepanel:', message.action);
      }
      
      return true; // Keep message channel open
    });
  }

  // Handle form detection from content script
  handleFormsDetected(forms, url) {
    console.log('📝 Sidepanel handling forms detected:', forms.length, 'forms on', url);
    
    // Update current page data
    this.detectedForms = forms;
    
    // Check if this is likely an application form page
    if (forms.length > 0 && this.isApplicationFormUrl(url)) {
      this.currentPageType = 'application_form';
    }
    
    // Update UI to reflect form detection
    this.updateWorkflowUI();
    this.updateStatusBar('Ready', this.getPageTypeDisplay(this.currentPageType));
  }

  // Handle page changes from content script
  handlePageChanged(url, jobData) {
    console.log('🔄 Sidepanel handling page change to:', url);
    
    // Update current data
    this.currentTab.url = url;
    this.currentJobData = jobData;
    this.detectedForms = [];
    
    // Re-analyze the page
    this.updateCurrentPage();
  }

  async checkAuthentication() {
    try {
      console.log('🔐 Checking extension authentication...');
      
      // Check if user is logged in to the web app
      const response = await fetch(`${this.apiBaseUrl}/api/extension/check-auth`, {
        method: 'GET',
        credentials: 'include'
      });

      console.log('🔐 Auth verification response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.authenticated && result.profile) {
          this.isAuthenticated = true;
          this.currentUser = result.profile;
          console.log('✅ Extension authentication verified for user:', result.profile.name);
        } else {
          console.log('❌ Invalid response structure from server');
          this.isAuthenticated = false;
        }
      } else {
        console.log('❌ Server rejected extension authentication');
        this.isAuthenticated = false;
      }
    } catch (error) {
      console.error('❌ Extension authentication check failed:', error);
      this.isAuthenticated = false;
    }
    
    this.authChecked = true;
    
    if (!this.isAuthenticated) {
      console.log('🚫 EXTENSION AUTHENTICATION REQUIRED - User must explicitly authorize extension');
    }
  }

  // Get stored extension authentication
  async getStoredExtensionAuth() {
    try {
      const result = await chrome.storage.local.get(['extensionAuth']);
      const auth = result.extensionAuth;
      
      if (!auth || !auth.token || !auth.userId || !auth.timestamp) {
        return null;
      }
      
      // Check if auth is expired (24 hours)
      const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - auth.timestamp > expiryTime) {
        console.log('⏰ Stored extension auth expired');
        await this.clearStoredExtensionAuth();
        return null;
      }
      
      return auth;
    } catch (error) {
      console.error('❌ Error reading stored extension auth:', error);
      return null;
    }
  }

  // Store extension authentication
  async storeExtensionAuth(userId, token) {
    try {
      const authData = {
        userId: userId,
        token: token,
        timestamp: Date.now()
      };
      
      await chrome.storage.local.set({ extensionAuth: authData });
      console.log('✅ Extension authentication stored');
    } catch (error) {
      console.error('❌ Error storing extension auth:', error);
    }
  }

  // Clear stored extension authentication
  async clearStoredExtensionAuth() {
    try {
      await chrome.storage.local.remove(['extensionAuth']);
      this.isAuthenticated = false;
      this.currentUser = null;
      console.log('🗑️ Extension authentication cleared');
    } catch (error) {
      console.error('❌ Error clearing extension auth:', error);
    }
  }

  showAuthRequired() {
    // Try to find the main container - check multiple possible containers
    let container = document.querySelector('.content');
    if (!container) {
      container = document.querySelector('.container');
    }
    if (!container) {
      container = document.body;
    }
    
    if (!container) {
      console.error('❌ Could not find container element for auth screen');
      return;
    }
    
    console.log('🔐 Showing login required screen');

    container.innerHTML = `
      <div class="auth-required">
        <div class="auth-icon">🔐</div>
        <h2>Please Log In</h2>
        <p>You need to be logged in to your account to use the Job Application Bot extension.</p>
        <div class="auth-features">
          <div class="feature-item">✅ Same account as web app</div>
          <div class="feature-item">✅ No separate authorization needed</div>
          <div class="feature-item">✅ Secure and simple</div>
        </div>
        <div class="auth-actions">
          <button id="loginBtn" class="primary-button">
            🌐 Go to Login Page
          </button>
          <button id="refreshAuthBtn" class="secondary-button">
            🔄 Check Again
          </button>
        </div>
        <div class="auth-help">
          <p><small>💡 Log in to your account at localhost:3000, then click "Check Again"</small></p>
        </div>
      </div>
    `;

    // Add styles for auth UI (keeping existing styles)
    if (!document.getElementById('auth-styles')) {
      const style = document.createElement('style');
      style.id = 'auth-styles';
      style.textContent = `
        .auth-required {
          text-align: center;
          padding: 40px 20px;
          color: #333;
        }
        .auth-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .auth-required h2 {
          color: #1a1a1a;
          margin-bottom: 10px;
          font-size: 24px;
        }
        .auth-required p {
          color: #666;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .auth-features {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #007bff;
        }
        .feature-item {
          color: #28a745;
          margin: 8px 0;
          font-weight: 500;
        }
        .auth-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 30px 0 20px 0;
        }
        .primary-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: background 0.2s;
        }
        .primary-button:hover {
          background: #0056b3;
        }
        .secondary-button {
          background: #f8f9fa;
          color: #333;
          border: 2px solid #dee2e6;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .secondary-button:hover {
          background: #e9ecef;
          border-color: #adb5bd;
        }
        .auth-help {
          margin-top: 20px;
          padding: 15px;
          background: #fff3cd;
          border-radius: 6px;
          border-left: 4px solid #ffc107;
        }
        .auth-help small {
          color: #856404;
        }
      `;
      document.head.appendChild(style);
    }

    // Add event listeners
    document.getElementById('loginBtn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: `${this.apiBaseUrl}/auth/login` });
    });

    document.getElementById('refreshAuthBtn')?.addEventListener('click', async () => {
      console.log('🔄 Re-checking authentication...');
      await this.checkAuthentication();
      if (this.isAuthenticated) {
        console.log('✅ Now authenticated, reloading extension...');
        location.reload(); // Reload the extension panel
      } else {
        this.showMessage('Still not logged in. Please log in to your account first.', 'warning');
      }
    });
  }

  // Initialize the extension UI
  initializeUI() {
    console.log('🎨 Initializing extension UI...');
    
    // Set up tab switching functionality
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Set up workflow buttons
    document.getElementById('generateProfileBtn')?.addEventListener('click', () => {
      this.generateTailoredProfile();
    });

    document.getElementById('generateCVBtn')?.addEventListener('click', () => {
      this.generateCV();
    });

    document.getElementById('generateCoverLetterBtn')?.addEventListener('click', () => {
      this.generateCoverLetter();
    });

    document.getElementById('fillApplicationBtn')?.addEventListener('click', () => {
      this.fillApplication();
    });

    document.getElementById('submitApplicationBtn')?.addEventListener('click', () => {
      this.submitApplication();
    });

    // Set up profile selector
    document.getElementById('profileSelect')?.addEventListener('change', (e) => {
      this.selectedProfileId = e.target.value || null;
      console.log('📋 Profile selected:', this.selectedProfileId || 'Base Profile');
    });

    // Set up advanced settings toggle
    document.getElementById('advancedToggle')?.addEventListener('click', () => {
      this.toggleAdvancedSettings();
    });

    // Set up logout functionality
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      this.logoutFromExtension();
    });

    // Set up search functionality
    document.getElementById('searchJobsBtn')?.addEventListener('click', () => {
      this.searchJobs();
    });

    // Set up refresh button
    document.getElementById('refreshPageBtn')?.addEventListener('click', () => {
      this.updateCurrentPage();
    });

    console.log('✅ UI initialized successfully');
  }

  // Update current page information and analysis
  async updateCurrentPage() {
    console.log('🔄 Updating current page information...');
    
    try {
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];
      
      console.log('📄 Current page:', this.currentTab.url);
      
      // Update status bar
      this.updateStatusBar('Analyzing', 'Analyzing current page...');
      
      // Basic page analysis
      await this.analyzePage();
      
      // Load tailored profiles
      await this.loadTailoredProfiles();
      
      // Update UI components
      this.updateProfileSelector();
      this.updateWorkflowUI();
      
      console.log('✅ Page update completed');
      
    } catch (error) {
      console.error('❌ Error updating current page:', error);
      this.updateStatusBar('Error', 'Failed to analyze page');
    }
  }

  // Analyze current page content
  async analyzePage() {
    console.log('🔍 Analyzing page content...');
    
    try {
      // Get page data from content script
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      // Try to get forms data from content script
      let formsData = null;
      try {
        formsData = await chrome.tabs.sendMessage(tab.id, { action: 'analyzeForms' });
        if (formsData && formsData.forms) {
          this.detectedForms = formsData.forms;
        }
      } catch (error) {
        console.log('📝 No content script response for forms, using URL analysis only');
      }
      
      // Enhanced page type detection
      const url = this.currentTab.url.toLowerCase();
      
      // Check if this is an application form page
      if (this.isApplicationFormUrl(url) && this.detectedForms && this.detectedForms.length > 0) {
        this.currentPageType = 'application_form';
        
        // Extract job information for application form
        this.currentJobData = {
          title: this.currentTab.title.split(' - ')[0] || 'Job Application',
          company: this.extractCompanyFromURL(url) || 'Company Not Found',
          url: this.currentTab.url,
          pageType: 'application_form',
          formsDetected: this.detectedForms.length
        };
        
        console.log('📝 Application form detected:', this.currentJobData);
        this.updateStatusBar('Ready', `${this.getPageTypeDisplay(this.currentPageType)} (${this.detectedForms.length} forms)`);
        
      } else if (url.includes('linkedin.com/jobs/view') || 
                 url.includes('jobs.lever.co') || 
                 url.includes('greenhouse.io') ||
                 url.includes('workday.com') ||
                 url.includes('careers') ||
                 url.includes('jobs')) {
        
        this.currentPageType = 'job_listing';
        
        // Extract basic job information
        this.currentJobData = {
          title: this.currentTab.title.split(' - ')[0] || 'Job Title Not Found',
          company: this.extractCompanyFromURL(url) || 'Company Not Found',
          url: this.currentTab.url,
          pageType: 'job_listing'
        };
        
        console.log('📋 Job listing detected:', this.currentJobData);
        this.updateStatusBar('Ready', this.getPageTypeDisplay(this.currentPageType));
        
      } else {
        this.currentPageType = 'unknown';
        this.currentJobData = null;
        this.updateStatusBar('Ready', 'General website');
      }
      
    } catch (error) {
      console.error('❌ Error analyzing page:', error);
      this.currentPageType = 'unknown';
      this.currentJobData = null;
      this.updateStatusBar('Ready', 'Analysis failed');
    }
  }

  // Check if URL indicates an application form page
  isApplicationFormUrl(url) {
    const applicationKeywords = [
      '/apply',
      '/application',
      'apply.php',
      'application.php',
      'submit',
      'form',
      'career-form',
      '/jobs/application/',
      '/careers/apply'
    ];
    
    return applicationKeywords.some(keyword => url.toLowerCase().includes(keyword));
  }

  // Extract company name from URL patterns
  extractCompanyFromURL(url) {
    // LinkedIn pattern
    if (url.includes('linkedin.com')) {
      const match = url.match(/linkedin\.com\/company\/([^\/]+)/);
      if (match) return match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Lever pattern
    if (url.includes('lever.co')) {
      const match = url.match(/jobs\.lever\.co\/([^\/]+)/);
      if (match) return match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Greenhouse pattern
    if (url.includes('greenhouse.io')) {
      const match = url.match(/boards\.greenhouse\.io\/([^\/]+)/);
      if (match) return match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return null;
  }

  // Search jobs functionality
  async searchJobs() {
    console.log('🔍 Starting job search...');
    
    const query = document.getElementById('jobQuery')?.value;
    const location = document.getElementById('jobLocation')?.value;
    
    if (!query) {
      this.showMessage('Please enter a job title to search', 'warning');
      return;
    }
    
    this.updateStatusBar('Processing', 'Searching for jobs...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/jobs/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          query: query,
          location: location || ''
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        this.displayJobResults(data.jobs || []);
        this.updateStatusBar('Ready', `Found ${data.jobs?.length || 0} jobs`);
      } else {
        throw new Error(`Search failed: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Job search failed:', error);
      this.updateStatusBar('Ready', 'Search failed');
      this.showMessage('Failed to search jobs. Please try again.', 'error');
    }
  }

  // Display job search results
  displayJobResults(jobs) {
    const resultsContainer = document.getElementById('jobResults');
    if (!resultsContainer) return;
    
    if (jobs.length === 0) {
      resultsContainer.innerHTML = '<p>No jobs found. Try different search terms.</p>';
      return;
    }
    
    resultsContainer.innerHTML = jobs.map(job => `
      <div class="job-result">
        <h4>${job.title}</h4>
        <p>${job.company} - ${job.location || 'Location not specified'}</p>
        <a href="${job.url}" target="_blank">View Job</a>
      </div>
    `).join('');
  }

  // Show messages to user
  showMessage(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    
    // Add to page
    document.body.appendChild(messageEl);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 3000);
  }

  // Helper method to verify user is authenticated before operations
  verifyAuthentication() {
    if (!this.authChecked) {
      console.log('⚠️ Authentication not yet checked');
      this.showMessage('Please wait while we verify your authentication...', 'warning');
      return false;
    }
    
    if (!this.isAuthenticated) {
      console.log('🚫 Operation blocked - user not authenticated');
      this.showMessage('You must be logged in to use this feature. Please log in first.', 'error');
      this.showAuthRequired();
      return false;
    }
    
    if (!this.currentUser) {
      console.log('🚫 Operation blocked - no user profile available');
      this.showMessage('User profile not available. Please log in again.', 'error');
      this.showAuthRequired();
      return false;
    }
    
    return true;
  }

  // Generate CV for current job
  async generateCV() {
    if (!this.isAuthenticated) {
      this.showMessage('Please authenticate first', 'error');
      this.showAuthRequired();
      return;
    }

    if (this.currentPageType !== 'job_listing' && this.currentPageType !== 'application_form') {
      this.showMessage('Please navigate to a job listing or application form first', 'warning');
      return;
    }

    try {
      this.updateStatusBar('Processing', 'Generating CV...');
      
      console.log('📄 Generating CV for current job...');
      
      // Get user profile data
      const profileData = await this.getCurrentProfileData();
      if (!profileData) {
        throw new Error('Could not load user profile data');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/documents/generate-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-extension-request': 'true'
        },
        credentials: 'include',
        body: JSON.stringify({
          jobInfo: this.currentJobData,
          userProfile: profileData
        })
      });

      if (!response.ok) {
        throw new Error(`CV generation failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profileData.name.replace(/\s+/g, '')}-${this.currentJobData.company.replace(/\s+/g, '')}-CV.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.sessionData.cvGenerated = true;
      this.updateStatusBar('Ready', 'CV generated successfully');
      this.showMessage('CV downloaded successfully!', 'success');
      
    } catch (error) {
      console.error('❌ CV generation failed:', error);
      this.updateStatusBar('Ready', 'CV generation failed');
      this.showMessage('Failed to generate CV: ' + error.message, 'error');
    }
  }

  // Generate cover letter for current job
  async generateCoverLetter() {
    if (!this.isAuthenticated) {
      this.showMessage('Please authenticate first', 'error');
      this.showAuthRequired();
      return;
    }

    if (this.currentPageType !== 'job_listing' && this.currentPageType !== 'application_form') {
      this.showMessage('Please navigate to a job listing or application form first', 'warning');
      return;
    }

    try {
      this.updateStatusBar('Processing', 'Generating cover letter...');
      
      console.log('📝 Generating cover letter for current job...');
      
      // Get user profile data
      const profileData = await this.getCurrentProfileData();
      if (!profileData) {
        throw new Error('Could not load user profile data');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/documents/generate-cover-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-extension-request': 'true'
        },
        credentials: 'include',
        body: JSON.stringify({
          jobInfo: this.currentJobData,
          userProfile: profileData
        })
      });

      if (!response.ok) {
        throw new Error(`Cover letter generation failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profileData.name.replace(/\s+/g, '')}-${this.currentJobData.company.replace(/\s+/g, '')}-CoverLetter.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.sessionData.coverLetterGenerated = true;
      this.updateStatusBar('Ready', 'Cover letter generated successfully');
      this.showMessage('Cover letter downloaded successfully!', 'success');
      
    } catch (error) {
      console.error('❌ Cover letter generation failed:', error);
      this.updateStatusBar('Ready', 'Cover letter generation failed');
      this.showMessage('Failed to generate cover letter: ' + error.message, 'error');
    }
  }

  // Fill application form on current page
  async fillApplication() {
    if (!this.isAuthenticated) {
      this.showMessage('Please authenticate first', 'error');
      this.showAuthRequired();
      return;
    }

    try {
      this.updateStatusBar('Processing', 'Analyzing and filling form...');
      
      console.log('✍️ Filling application form...');
      
      // Get current tab and analyze forms
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      // Send message to content script to analyze forms
      const formsResponse = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'analyzeForms'
      });
      
      if (!formsResponse || !formsResponse.forms || formsResponse.forms.length === 0) {
        throw new Error('No application forms found on this page');
      }
      
      console.log('📋 Found forms:', formsResponse.forms);
      
      // Get user profile data
      const profileData = await this.getCurrentProfileData();
      if (!profileData) {
        throw new Error('Could not load user profile data');
      }
      
      // Get form filling data from API
      const response = await fetch(`${this.apiBaseUrl}/api/extension/fill-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-extension-request': 'true'
        },
        credentials: 'include',
        body: JSON.stringify({
          jobInfo: this.currentJobData,
          userProfile: profileData,
          formFields: formsResponse.forms[0].fields // Use first form
        })
      });
      
      if (!response.ok) {
        throw new Error(`Form filling failed: ${response.status}`);
      }
      
      const fillData = await response.json();
      
      if (!fillData.success) {
        throw new Error(fillData.error || 'Form filling failed');
      }
      
      // Send fill data to content script
      const fillResponse = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'fillForm',
        data: fillData.formData
      });
      
      this.sessionData.formFilled = true;
      this.sessionData.formFieldsCount = fillData.formData?.length || 0;
      this.sessionData.aiResponsesCount = fillData.aiResponsesCount || 0;
      
      this.updateStatusBar('Ready', `Filled ${fillResponse.filled || 0} fields`);
      this.showMessage(`Form filled successfully! ${fillResponse.filled || 0} fields completed.`, 'success');
      
    } catch (error) {
      console.error('❌ Form filling failed:', error);
      this.updateStatusBar('Ready', 'Form filling failed');
      this.showMessage('Failed to fill form: ' + error.message, 'error');
    }
  }

  // Toggle advanced settings
  toggleAdvancedSettings() {
    const advancedContent = document.getElementById('advancedContent');
    const advancedToggle = document.getElementById('advancedToggle');
    
    if (!advancedContent || !advancedToggle) return;
    
    const arrow = advancedToggle.querySelector('svg');
    
    if (advancedContent.classList.contains('show')) {
      advancedContent.classList.remove('show');
      if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
      advancedContent.classList.add('show');
      if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
  }

  async loadTailoredProfiles() {
    try {
      console.log('📋 Loading tailored profiles...');
      
      const response = await fetch(`${this.apiBaseUrl}/api/tailored-profiles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      console.log('📡 Tailored profiles API response:', response.status);

      if (response.ok) {
        const data = await response.json();
        this.tailoredProfiles = data.profiles || [];
        console.log(`✅ Loaded ${this.tailoredProfiles.length} tailored profiles:`, 
          this.tailoredProfiles.map(p => p.label));
        
        // Auto-select most recently used profile if available
        if (this.tailoredProfiles.length > 0) {
          const mostRecent = this.tailoredProfiles[0]; // Already ordered by last_used_at
          this.selectedProfileId = mostRecent.id;
          console.log('🎯 Auto-selected most recent profile:', mostRecent.label);
        }
      } else {
        console.warn('⚠️ Failed to load tailored profiles:', response.status);
        this.tailoredProfiles = [];
      }
    } catch (error) {
      console.error('❌ Error loading tailored profiles:', error);
      this.tailoredProfiles = [];
    }
    
    console.log('📊 Final tailored profiles state:', {
      count: this.tailoredProfiles.length,
      selectedId: this.selectedProfileId
    });
  }

  // Update the profile selector UI
  updateProfileSelector() {
    console.log('🎯 Updating profile selector...');
    
    const profileSelect = document.getElementById('profileSelect');
    const generateProfileBtn = document.getElementById('generateProfileBtn');
    
    if (!profileSelect) return;

    // Clear existing options except base profile
    profileSelect.innerHTML = '<option value="">Use Base Profile</option>';
    
    // Add tailored profiles
    this.tailoredProfiles.forEach(profile => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = `📋 ${profile.label}`;
      option.selected = profile.id === this.selectedProfileId;
      profileSelect.appendChild(option);
    });

    // Update generate button availability
    if (generateProfileBtn) {
      const isJobListing = this.currentPageType === 'job_listing';
      generateProfileBtn.disabled = !isJobListing;
      generateProfileBtn.title = isJobListing 
        ? 'Generate a tailored profile for this job' 
        : 'Only available on job listing pages';
    }
  }

  // Update workflow UI based on current state
  updateWorkflowUI() {
    console.log('🔄 Updating workflow UI...');
    
    const generateCVBtn = document.getElementById('generateCVBtn');
    const generateCoverLetterBtn = document.getElementById('generateCoverLetterBtn');
    const fillApplicationBtn = document.getElementById('fillApplicationBtn');
    const submitApplicationBtn = document.getElementById('submitApplicationBtn');
    
    // Enable/disable buttons based on page type and form detection
    const isJobListing = this.currentPageType === 'job_listing';
    
    if (generateCVBtn) {
      generateCVBtn.disabled = !isJobListing;
      generateCVBtn.textContent = isJobListing 
        ? '📄 Generate CV'
        : '📄 Navigate to job listing first';
    }
    
    if (generateCoverLetterBtn) {
      generateCoverLetterBtn.disabled = !isJobListing;
      generateCoverLetterBtn.textContent = isJobListing
        ? '📝 Generate Cover Letter'
        : '📝 Navigate to job listing first';
    }
    
    if (fillApplicationBtn) {
      const hasForm = this.detectedForms && this.detectedForms.length > 0;
      fillApplicationBtn.disabled = !hasForm;
      fillApplicationBtn.textContent = hasForm
        ? '✍️ Fill Application Form'
        : '✍️ No application form detected';
    }
    
    if (submitApplicationBtn) {
      submitApplicationBtn.disabled = false; // Always allow marking as submitted
    }
  }

  // Toggle advanced settings
  toggleAdvancedSettings() {
    const advancedContent = document.getElementById('advancedContent');
    const advancedToggle = document.getElementById('advancedToggle');
    
    if (!advancedContent || !advancedToggle) return;
    
    const arrow = advancedToggle.querySelector('svg');
    
    if (advancedContent.classList.contains('show')) {
      advancedContent.classList.remove('show');
      if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
      advancedContent.classList.add('show');
      if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
  }

  // Generate tailored profile for current job
  async generateTailoredProfile() {
    if (this.currentPageType !== 'job_listing' && this.currentPageType !== 'application_form') {
      this.showMessage('Please navigate to a job listing or application form first', 'warning');
      return;
    }

    try {
      this.updateStatusBar('Processing', 'Creating tailored profile...');
      
      console.log('✨ Generating tailored profile for current job...');
      console.log('📊 Current job data:', {
        title: this.currentJobData?.title,
        company: this.currentJobData?.company,
        hasDescription: !!this.currentJobData?.description,
        descriptionLength: this.currentJobData?.description?.length || 0,
        requirements: this.currentJobData?.requirements?.length || 0
      });
      
      // Validate job data before proceeding
      if (!this.currentJobData?.title || this.currentJobData.title === 'Job Title Not Found') {
        this.showMessage('Could not extract job title from this page. Try refreshing the page analysis.', 'warning');
        return;
      }
      
      if (!this.currentJobData?.company || this.currentJobData.company === 'Company Not Found') {
        this.showMessage('Could not extract company name from this page. Try refreshing the page analysis.', 'warning');
        return;
      }
      
      // First, get the user's base profile data
      console.log('📋 Fetching base profile...');
      const profileResponse = await fetch(`${this.apiBaseUrl}/api/extension/profile`, {
        method: 'GET',
        headers: {
          'x-extension-request': 'true'
        },
        credentials: 'include'
      });
      
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch base profile');
      }
      
      const profileData = await profileResponse.json();
      if (!profileData.success) {
        throw new Error(profileData.error || 'Failed to fetch base profile');
      }

      // Prepare the request payload with correct field names
      const payload = {
        companyName: this.currentJobData?.company || 'Unknown Company',
        jobTitle: this.currentJobData?.title || 'Unknown Position',
        jobDescription: this.currentJobData?.description || '',
        jobRequirements: this.currentJobData?.requirements || [],
        jobUrl: this.currentTab?.url,
        baseProfileData: profileData.profile
      };
      
      console.log('📤 Sending tailored profile request:', {
        companyName: payload.companyName,
        jobTitle: payload.jobTitle,
        hasJobDescription: !!payload.jobDescription,
        hasBaseProfile: !!payload.baseProfileData
      });
      
      const response = await fetch(`${this.apiBaseUrl}/api/tailored-profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create tailored profile: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Tailored profile created:', data.profile.label);
        
        // Add to local profiles and select it
        this.tailoredProfiles.unshift(data.profile);
        this.selectedProfileId = data.profile.id;
        
        // Update UI
        this.updateProfileSelector();
        this.updateStatusBar('Ready', 'Profile created successfully');
        this.showMessage(`Tailored profile "${data.profile.label}" created successfully`, 'success');
      } else {
        throw new Error(data.error || 'Failed to create tailored profile');
      }
    } catch (error) {
      console.error('❌ Error generating tailored profile:', error);
      this.updateStatusBar('Ready', 'Profile creation failed');
      this.showMessage('Failed to create tailored profile: ' + error.message, 'error');
    }
  }

  // NOTE: generateDocuments method removed - now using separate generateCV() and generateCoverLetter() methods
  // This provides better user control and clearer error handling for each document type

  // Submit application (save to database)
  async submitApplication() {
    // Check authentication before submitting
    if (!this.isAuthenticated) {
      this.showMessage('Please authenticate first to submit applications', 'error');
      this.showAuthRequired();
      return;
    }

    if (this.currentPageType !== 'job_listing' && this.currentPageType !== 'application_form') {
      this.showMessage('Please navigate to a job listing or application form first', 'warning');
      return;
    }

    try {
      this.updateStatusBar('Processing', 'Saving application...');
      
      console.log('✅ Submitting application to database...');
      
      const applicationData = {
        jobInfo: {
          title: this.currentJobData?.title || 'Unknown Position',
          company: this.currentJobData?.company || 'Unknown Company',
          location: this.currentJobData?.location,
          description: this.currentJobData?.description || '',
          requirements: this.currentJobData?.requirements || [],
          salary: this.currentJobData?.salary
        },
        url: this.currentTab?.url,
        status: 'submitted',
        appliedAt: new Date().toISOString(),
        applicationMethod: 'chrome_extension',
        cvGenerated: this.sessionData?.cvGenerated || false,
        coverLetterGenerated: this.sessionData?.coverLetterGenerated || false,
        formFieldsCount: this.sessionData?.formFieldsCount || 0,
        aiResponsesCount: this.sessionData?.aiResponsesCount || 0,
        formData: this.sessionData?.formData,
        pageTitle: this.currentTab?.title,
        pageType: this.currentJobData?.pageType || 'application_form',
        tailored_profile_id: this.selectedProfileId || null,
        notes: `Extension submission. Profile: ${this.selectedProfileId ? 'Tailored' : 'Base'}. CV: ${this.sessionData?.cvGenerated ? 'Yes' : 'No'}. Cover Letter: ${this.sessionData?.coverLetterGenerated ? 'Yes' : 'No'}.`
      };

      const response = await fetch(`${this.apiBaseUrl}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include authentication cookies
        body: JSON.stringify(applicationData)
      });
      
      console.log('📋 API Response status:', response.status);
      
      if (response.status === 401) {
        // Authentication failed
        console.log('❌ Authentication failed during submission');
        this.isAuthenticated = false;
        this.showMessage('Authentication expired. Please log in again.', 'error');
        this.showAuthRequired();
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API request failed:', response.status, errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ API Response data:', data);
      
      if (data.success) {
        console.log('✅ Application saved to database:', data.application.id);
        
        this.updateStatusBar('Ready', 'Application submitted');
        this.showMessage(`Application submitted and saved to your personal dashboard! 🎉`, 'success');
        
        // Update the submit button to show success
        const submitBtn = document.getElementById('submitApplicationBtn');
        if (submitBtn) {
          submitBtn.textContent = '✅ Application Submitted';
          submitBtn.style.background = '#22c55e';
          
          // Reset after 3 seconds
          setTimeout(() => {
            submitBtn.textContent = '✅ Mark as Submitted';
            submitBtn.style.background = '';
          }, 3000);
        }
      } else {
        throw new Error(data.error || 'Failed to save application');
      }
      
    } catch (error) {
      console.error('❌ Error submitting application:', error);
      this.updateStatusBar('Ready', 'Submission failed');
      this.showMessage('Failed to submit application: ' + error.message, 'error');
    }
  }

  async markAsSubmitted() {
    // Check authentication before submitting
    if (!this.isAuthenticated) {
      this.showMessage('Please authenticate first to track applications', 'error');
      this.showAuthRequired();
      return;
    }

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
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include authentication cookies
        body: JSON.stringify(applicationData)
      });
      
      console.log('📋 API Response status:', response.status);
      console.log('📋 API Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.status === 401) {
        // Authentication failed
        console.log('❌ Authentication failed during submission');
        this.isAuthenticated = false;
        this.showMessage('Authentication expired. Please log in again.', 'error');
        this.showAuthRequired();
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API request failed:', response.status, errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ API Response data:', data);
      
      if (data.success) {
        // Track submission
        this.sessionData.actions.push({
          action: 'marked_as_submitted',
          timestamp: new Date().toISOString(),
          applicationId: data.application?.id
        });
        
        this.showMessage('Application successfully tracked in your personal dashboard! 🎉', 'success');
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

  // Tab switching functionality
  switchTab(tabName) {
    console.log('📱 Switching to tab:', tabName);
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Initialize tab-specific functionality
    if (tabName === 'search') {
      this.initializeSearchTab();
    } else if (tabName === 'workflow') {
      this.initializeWorkflowTab();
    }
  }

  // Initialize workflow tab
  initializeWorkflowTab() {
    console.log('🚀 Initializing workflow tab');
    this.updateProfileSelector();
    this.updateWorkflowUI();
  }

  // Initialize search tab
  initializeSearchTab() {
    console.log('🔍 Initializing search tab');
    // Any search-specific initialization
  }

  // Update status bar
  updateStatusBar(status, info = '') {
    console.log('📊 Updating status bar:', status, info);
    
    const statusDot = document.getElementById('statusDot');
    const pageStatus = document.getElementById('pageStatus');
    const pageInfo = document.getElementById('pageInfo');
    
    if (statusDot && pageStatus) {
      pageStatus.textContent = status;
      pageInfo.textContent = info;
      
      // Update status dot color based on status
      if (status.toLowerCase().includes('ready')) {
        statusDot.style.background = '#4ade80'; // green
      } else if (status.toLowerCase().includes('analyzing') || status.toLowerCase().includes('processing')) {
        statusDot.style.background = '#f59e0b'; // yellow
      } else if (status.toLowerCase().includes('error') || status.toLowerCase().includes('failed')) {
        statusDot.style.background = '#ef4444'; // red
      } else {
        statusDot.style.background = '#6b7280'; // gray
      }
    }
  }

  // Get current profile data (base or selected tailored)
  async getCurrentProfileData() {
    if (this.selectedProfileId) {
      // Use selected tailored profile
      const selectedProfile = this.tailoredProfiles.find(p => p.id === this.selectedProfileId);
      if (selectedProfile) {
        console.log('📋 Using tailored profile:', selectedProfile.label);
        
        // Update last_used_at timestamp
        await this.updateProfileUsage(this.selectedProfileId);
        
        return selectedProfile.tailored_data;
      }
    }

    // Fallback to base profile
    if (!this.baseProfile) {
      const profileResponse = await fetch(`${this.apiBaseUrl}/api/extension/profile`, {
        method: 'GET',
        headers: {
          'x-extension-request': 'true',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.success) {
          this.baseProfile = profileData.profile;
        }
      } else if (profileResponse.status === 401) {
        // Auth failed - show auth screen
        console.log('❌ Profile request failed - user not authenticated');
        this.showAuthRequired();
        return null;
      }
    }

    console.log('📋 Using base profile');
    return this.baseProfile;
  }

  // Update profile usage timestamp
  async updateProfileUsage(profileId) {
    try {
      await fetch(`${this.apiBaseUrl}/api/tailored-profiles/${profileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          // This will trigger the timestamp update in the API
        })
      });
    } catch (error) {
      console.warn('⚠️ Failed to update profile usage timestamp:', error);
    }
  }

  // Helper method to extract company name from available data
  extractCompanyFromData() {
    const currentTab = this.currentTab;
    const jobData = this.currentJobData;

    // Try to extract from URL first (most reliable for Lever)
    if (currentTab && currentTab.url) {
      const url = currentTab.url.toLowerCase();
      
      // Lever.co pattern: jobs.lever.co/companyname/job-id
      if (url.includes('lever.co')) {
        const leverMatch = url.match(/jobs\.lever\.co\/([^/]+)/);
        if (leverMatch && leverMatch[1]) {
          // Capitalize first letter
          return leverMatch[1].charAt(0).toUpperCase() + leverMatch[1].slice(1);
        }
      }
      
      // LinkedIn pattern
      if (url.includes('linkedin.com')) {
        const linkedinMatch = url.match(/linkedin\.com\/jobs\/view\/\d+.*company[=\/]([^&\/]+)/);
        if (linkedinMatch && linkedinMatch[1]) {
          return decodeURIComponent(linkedinMatch[1].replace(/[+-]/g, ' '));
        }
      }
    }

    // Try to extract from title (fallback)
    if (jobData && jobData.title) {
      const title = jobData.title;
      
      // Pattern: "Company Name - Job Title - Location" 
      const titleParts = title.split(' - ');
      if (titleParts.length >= 2) {
        const possibleCompany = titleParts[0].trim();
        
        // Check if it looks like a company name (not a job title)
        const jobTitleKeywords = ['engineer', 'developer', 'manager', 'analyst', 'specialist', 'coordinator', 'assistant'];
        const isJobTitle = jobTitleKeywords.some(keyword => 
          possibleCompany.toLowerCase().includes(keyword)
        );
        
        if (!isJobTitle && possibleCompany.length > 2) {
          return possibleCompany;
        }
      }
    }

    console.warn('⚠️ Could not extract company name from available data');
    return null;
  }

  // Helper method to extract job title from available data  
  extractJobTitleFromData() {
    const jobData = this.currentJobData;

    if (jobData && jobData.title) {
      const title = jobData.title;
      
      // Pattern: "Company Name - Job Title - Location"
      const titleParts = title.split(' - ');
      if (titleParts.length >= 2) {
        // Usually the job title is the second part
        const jobTitle = titleParts[1].trim();
        
        // Make sure it's not a location or other metadata
        if (jobTitle.length > 3 && !jobTitle.match(/^[A-Z]{2,3}$/) && !jobTitle.toLowerCase().includes('kingdom')) {
          return jobTitle;
        }
        
        // If second part looks like location, try third part
        if (titleParts.length >= 3) {
          const thirdPart = titleParts[2].trim();
          if (thirdPart.length > 3) {
            return thirdPart;
          }
        }
      }
      
      // If no pattern match, return the full title minus common company suffixes
      return title.replace(/\s*-\s*(careers|jobs|hiring).*$/i, '').trim();
    }

    console.warn('⚠️ Could not extract job title from available data');
    return null;
  }

  // Get user-friendly display text for page type
  getPageTypeDisplay(pageType) {
    const typeMap = {
      'job_listing': '📋 Job Listing Detected',
      'application_form': '📝 Application Form Detected',
      'application': '📝 Application Form Detected', 
      'job_board': '🔍 Job Board Page',
      'unknown': '🌐 General Website'
    };
    
    return typeMap[pageType] || '🌐 General Website';
  }

  // Debug helper - force refresh of page analysis
  async debugRefreshPageAnalysis() {
    console.log('🔧 Debug: Force refreshing page analysis...');
    this.updateStatusBar('Analyzing', 'Refreshing page analysis...');
    
    // Reset current data
    this.currentPageType = null;
    this.currentJobData = null;
    this.detectedForms = [];
    
    // Re-run analysis
    await this.analyzePage();
    
    console.log('🔧 Debug: Page analysis refreshed:', {
      pageType: this.currentPageType,
      jobData: this.currentJobData
    });
  }

  // Logout from extension (redirect to web app logout)
  async logoutFromExtension() {
    try {
      console.log('🚪 Redirecting to web app logout...');
      
      // Open web app logout page
      chrome.tabs.create({ url: `${this.apiBaseUrl}/auth/logout` });
      
      // Reset local authentication state
      this.authChecked = false;
      this.isAuthenticated = false;
      this.currentUser = null;
      
      // Show auth required screen
      this.showAuthRequired();
      
      this.showMessage('Redirected to logout page. Log back in to use the extension again.', 'info');
      
    } catch (error) {
      console.error('❌ Error during logout redirect:', error);
      this.showMessage('Error during logout. Please try again.', 'error');
    }
  }
}

// Initialize side panel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM Content Loaded - Initializing side panel...');
  window.sidePanelController = new SidePanelController();
  
  // Start the initialization process
  window.sidePanelController.init().catch(error => {
    console.error('❌ Failed to initialize side panel:', error);
  });
  
  // Debug helpers - can be called from console
  window.debugProfileSelector = function() {
    console.log('🔧 Debug: Manually updating profile selector...');
    if (window.sidePanelController) {
      window.sidePanelController.updateProfileSelector();
    } else {
      console.error('❌ Side panel controller not initialized');
    }
  };
  
  window.debugPageAnalysis = async function() {
    console.log('🔧 Debug: Manually refreshing page analysis...');
    if (window.sidePanelController) {
      await window.sidePanelController.debugRefreshPageAnalysis();
    } else {
      console.error('❌ Side panel controller not initialized');
    }
  };
  
  window.debugJobData = function() {
    console.log('🔧 Debug: Current job data:', window.sidePanelController?.currentJobData);
    console.log('🔧 Debug: Current page type:', window.sidePanelController?.currentPageType);
    console.log('🔧 Debug: Detected forms:', window.sidePanelController?.detectedForms?.length || 0);
  };
  
  window.debugGenerateCV = async function() {
    console.log('🔧 Debug: Testing CV generation...');
    if (window.sidePanelController) {
      await window.sidePanelController.generateCV();
    } else {
      console.error('❌ Side panel controller not initialized');
    }
  };
  
  window.debugGenerateCoverLetter = async function() {  
    console.log('🔧 Debug: Testing cover letter generation...');
    if (window.sidePanelController) {
      await window.sidePanelController.generateCoverLetter();
    } else {
      console.error('❌ Side panel controller not initialized');
    }
  };
  
  window.debugFillApplication = async function() {
    console.log('🔧 Debug: Testing form filling...');
    if (window.sidePanelController) {
      await window.sidePanelController.fillApplication();
    } else {
      console.error('❌ Side panel controller not initialized');
    }
  };
  
  window.debugAnalyzeForms = async function() {
    console.log('🔧 Debug: Analyzing forms on current page...');
    if (window.sidePanelController && window.sidePanelController.currentTab) {
      try {
        const response = await chrome.tabs.sendMessage(window.sidePanelController.currentTab.id, {
          action: 'analyzeForms'
        });
        console.log('📝 Forms found:', response);
        return response;
      } catch (error) {
        console.error('❌ Error analyzing forms:', error);
      }
    } else {
      console.error('❌ No current tab available');
    }
  };
  
  window.debugTestFillSingleField = async function(fieldName, value) {
    console.log(`🔧 Debug: Testing fill for field "${fieldName}" with value "${value}"`);
    if (window.sidePanelController && window.sidePanelController.currentTab) {
      try {
        const testData = [{
          name: fieldName,
          selector: `[name="${fieldName}"]`,
          value: value,
          type: 'text'
        }];
        
        const response = await chrome.tabs.sendMessage(window.sidePanelController.currentTab.id, {
          action: 'fillForm',
          data: testData
        });
        console.log('📝 Fill result:', response);
        return response;
      } catch (error) {
        console.error('❌ Error testing field fill:', error);
      }
    }
  };

  // Debug functions for authentication
  window.debugCheckAuth = async function() {
    console.log('🔧 Debug: Checking authentication state...');
    if (window.sidePanelController) {
      await window.sidePanelController.checkAuthentication();
      console.log('Auth state:', {
        isAuthenticated: window.sidePanelController.isAuthenticated,
        authChecked: window.sidePanelController.authChecked,
        hasUser: !!window.sidePanelController.currentUser,
        userName: window.sidePanelController.currentUser?.name
      });
    }
  };

  window.debugShowAuthScreen = function() {
    console.log('🔧 Debug: Manually showing auth screen...');
    if (window.sidePanelController) {
      window.sidePanelController.showAuthRequired();
    }
  };

  window.debugCheckContainers = function() {
    console.log('🔧 Debug: Checking container elements...');
    console.log('.content:', document.querySelector('.content'));
    console.log('.container:', document.querySelector('.container'));
    console.log('body:', document.body);
  };
});

// Add message styles if not already present
if (!document.getElementById('message-styles')) {
  const messageStyles = document.createElement('style');
  messageStyles.id = 'message-styles';
  messageStyles.textContent = `
    .message {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease-out;
    }
    
    .message-info {
      background: #007bff;
    }
    
    .message-success {
      background: #28a745;
    }
    
    .message-warning {
      background: #ffc107;
      color: #212529;
    }
    
    .message-error {
      background: #dc3545;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    .job-result {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
      background: white;
    }
    
    .job-result h4 {
      margin: 0 0 8px 0;
      color: #333;
    }
    
    .job-result p {
      margin: 0 0 8px 0;
      color: #666;
      font-size: 14px;
    }
    
    .job-result a {
      color: #007bff;
      text-decoration: none;
      font-size: 14px;
    }
    
    .job-result a:hover {
      text-decoration: underline;
    }
  `;
  document.head.appendChild(messageStyles);
} 
// Popup Script for Job Application Bot Extension
class PopupController {
  constructor() {
    this.currentTab = null;
    this.pageData = null;
    this.formData = null;
    this.apiBaseUrl = 'http://localhost:3000'; // Your Next.js app URL
    
    this.init();
  }

  async init() {
    console.log('🚀 Job Application Bot popup initialized');
    
    // Get current tab
    await this.getCurrentTab();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Analyze current page
    await this.analyzePage();
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
    } catch (error) {
      console.error('❌ Error getting current tab:', error);
    }
  }

  setupEventListeners() {
    // Job search button
    document.getElementById('searchJobsBtn')?.addEventListener('click', () => {
      this.searchJobs();
    });

    // Form analysis button
    document.getElementById('analyzeFormBtn')?.addEventListener('click', () => {
      this.analyzeForm();
    });

    // Fill form button
    document.getElementById('fillFormBtn')?.addEventListener('click', () => {
      this.fillForm();
    });

    // Generate CV button
    document.getElementById('generateCVBtn')?.addEventListener('click', () => {
      this.generateCV();
    });

    // Generate cover letter button
    document.getElementById('generateCoverLetterBtn')?.addEventListener('click', () => {
      this.generateCoverLetter();
    });

    // Mark as submitted button
    document.getElementById('markSubmittedBtn')?.addEventListener('click', () => {
      this.markApplicationSubmitted(this.pageData?.jobInfo || {});
    });

    // Open dashboard button
    document.getElementById('openDashboard')?.addEventListener('click', () => {
      chrome.tabs.create({ url: `${this.apiBaseUrl}/pages` });
    });

    // Settings checkboxes
    document.getElementById('autoDetectForms')?.addEventListener('change', (e) => {
      this.saveSetting('autoDetectForms', e.target.checked);
    });

    document.getElementById('showTooltips')?.addEventListener('change', (e) => {
      this.saveSetting('showTooltips', e.target.checked);
    });
  }

  async analyzePage() {
    this.updateStatus('analyzing', 'Analyzing page...');
    
    try {
      // Use content script to get page data
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'getPageData'
      });

      if (response && response.url) {
        this.pageData = response;
        console.log('📄 Page analysis result:', this.pageData);

        // Update UI based on analysis
        this.updatePageAnalysis(this.pageData);
        
        // Auto-detect forms if enabled
        const autoDetect = await this.getSetting('autoDetectForms', true);
        if (autoDetect && this.pageData.forms && this.pageData.forms.length > 0) {
          await this.analyzeForm();
        }

        this.updateStatus('ready', 'Ready');
      } else {
        throw new Error('No response from content script');
      }
    } catch (error) {
      console.error('❌ Page analysis failed:', error);
      this.updateStatus('error', 'Content script not loaded. Please refresh the page.');
    }
  }



  updatePageAnalysis(pageData) {
    // Update page type
    const pageTypeElement = document.getElementById('pageType');
    if (pageTypeElement) {
      const typeLabels = {
        'application': '📝 Application Form',
        'job_listing': '💼 Job Listing',
        'job_board': '🔍 Job Board',
        'unknown': '🌐 General Page'
      };
      pageTypeElement.textContent = typeLabels[pageData.pageType] || '🌐 Unknown Page';
    }

    // Update job information
    if (pageData.jobInfo && (pageData.jobInfo.title !== 'Job Title Not Found' || pageData.jobInfo.company !== 'Company Not Found')) {
      document.getElementById('jobSection')?.classList.remove('hidden');
      document.getElementById('jobTitle').textContent = pageData.jobInfo.title;
      document.getElementById('jobCompany').textContent = pageData.jobInfo.company;
      document.getElementById('jobLocation').textContent = pageData.jobInfo.location;
    }

    // Update form information
    if (pageData.forms && pageData.forms.length > 0) {
      document.getElementById('formSection')?.classList.remove('hidden');
      const formStatus = document.getElementById('formStatus');
      const formFields = document.getElementById('formFields');
      const analyzeBtn = document.getElementById('analyzeFormBtn');
      
      if (formStatus) {
        formStatus.textContent = `${pageData.forms.length} form(s) detected`;
      }
      
      if (formFields) {
        formFields.innerHTML = '';
        pageData.forms.forEach((form, index) => {
          if (form.isApplicationForm) {
            const formDiv = document.createElement('div');
            formDiv.className = 'form-field';
            formDiv.textContent = `Application Form ${index + 1} (${form.fields.length} fields)`;
            formFields.appendChild(formDiv);
          }
        });
      }
      
      if (analyzeBtn) {
        analyzeBtn.disabled = false;
      }
    }
  }

  async analyzeForm() {
    this.showProgress('Analyzing form fields...');
    
    try {
      // Send form data to your API for analysis
      const response = await fetch(`${this.apiBaseUrl}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: this.pageData.url,
          title: this.pageData.title || '',
          content: this.pageData.content || '',
          action: 'analyze_form'
        })
      });

      const result = await response.json();
      this.formData = result;

      console.log('📝 Form analysis result:', result);

      // Enable fill form button
      document.getElementById('fillFormBtn').disabled = false;
      
      this.hideProgress();
      this.showResult('Form analyzed successfully! Ready to fill.', 'success');
    } catch (error) {
      console.error('❌ Form analysis failed:', error);
      this.hideProgress();
      this.showResult('Form analysis failed. Please try again.', 'error');
    }
  }

  async fillForm() {
    this.showProgress('Filling application form...');
    
    try {
      // Get current page forms from content script
      const formsResponse = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'analyzeForms'
      });

      if (!formsResponse || !formsResponse.forms || formsResponse.forms.length === 0) {
        throw new Error('No forms detected on this page');
      }

      // Get user profile
      const profileResponse = await fetch(`${this.apiBaseUrl}/api/extension/profile`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        throw new Error('Failed to fetch user profile');
      }

      // Get form fields from the first application form
      const applicationForm = formsResponse.forms.find(form => form.isApplicationForm) || formsResponse.forms[0];
      
      // Fill form with user profile data
      const response = await fetch(`${this.apiBaseUrl}/api/extension/fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: this.pageData?.url || window.location.href,
          jobInfo: this.pageData?.jobInfo || {},
          formFields: applicationForm.fields || [],
          userProfile: profileData.profile
        })
      });

      const result = await response.json();

      if (result.success) {
        // Convert form data to array format for filling
        const formDataArray = Object.entries(result.formData || {}).map(([fieldName, fieldValue]) => {
          const field = applicationForm.fields.find(f => f.name === fieldName);
          return {
            name: fieldName,
            value: fieldValue,
            selector: field?.selector || `[name="${fieldName}"]`
          };
        });

        // Inject form filling script
        await chrome.tabs.sendMessage(this.currentTab.id, {
          action: 'fillForm',
          data: formDataArray
        });

        // Mark application as submitted
        await this.markApplicationSubmitted(this.pageData?.jobInfo || {});

        this.hideProgress();
        this.showResult('Form filled successfully! Custom CV and cover letter generated.', 'success');
      } else {
        throw new Error(result.error || 'Form filling failed');
      }
    } catch (error) {
      console.error('❌ Form filling failed:', error);
      this.hideProgress();
      this.showResult(`Form filling failed: ${error.message}`, 'error');
    }
  }

  // This function runs in the context of the web page
  fillFormFields(filledFields) {
    console.log('🖊️ Filling form fields:', filledFields);
    
    filledFields.forEach(field => {
      const element = document.querySelector(field.selector) || 
                     document.querySelector(`[name="${field.name}"]`) ||
                     document.querySelector(`#${field.name}`);
      
      if (element) {
        if (element.type === 'checkbox' || element.type === 'radio') {
          element.checked = field.value === 'true' || field.value === true;
        } else {
          element.value = field.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Highlight filled field
        element.style.backgroundColor = '#e6f3ff';
        element.style.border = '2px solid #3b82f6';
        
        console.log('✅ Filled field:', field.name, '=', field.value);
      } else {
        console.warn('⚠️ Field not found:', field.name);
      }
    });
  }

  async generateCV() {
    this.showProgress('Generating custom CV...');
    
    try {
      // Get user profile first
      const profileResponse = await fetch(`${this.apiBaseUrl}/api/extension/profile`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        throw new Error('Failed to fetch user profile');
      }

      // Generate CV using the fill API
      const response = await fetch(`${this.apiBaseUrl}/api/extension/fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: this.pageData?.url || window.location.href,
          jobInfo: this.pageData?.jobInfo || {},
          formFields: [], // Empty for CV generation only
          userProfile: profileData.profile
        })
      });

      const result = await response.json();

      if (result.success && result.cv) {
        // Download CV
        this.downloadFile(result.cv.content, result.cv.filename, 'text/plain');
        
        this.hideProgress();
        this.showResult('CV generated and downloaded!', 'success');
      } else {
        throw new Error(result.error || 'CV generation failed');
      }
    } catch (error) {
      console.error('❌ CV generation failed:', error);
      this.hideProgress();
      this.showResult('CV generation failed. Please try again.', 'error');
    }
  }

  async generateCoverLetter() {
    this.showProgress('Generating cover letter...');
    
    try {
      // Get user profile first
      const profileResponse = await fetch(`${this.apiBaseUrl}/api/extension/profile`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        throw new Error('Failed to fetch user profile');
      }

      // Generate cover letter using the fill API
      const response = await fetch(`${this.apiBaseUrl}/api/extension/fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: this.pageData?.url || window.location.href,
          jobInfo: this.pageData?.jobInfo || {},
          formFields: [], // Empty for cover letter generation only
          userProfile: profileData.profile
        })
      });

      const result = await response.json();

      if (result.success && result.coverLetter) {
        // Download cover letter
        this.downloadFile(result.coverLetter.content, result.coverLetter.filename, 'text/plain');
        
        this.hideProgress();
        this.showResult('Cover letter generated and downloaded!', 'success');
      } else {
        throw new Error(result.error || 'Cover letter generation failed');
      }
    } catch (error) {
      console.error('❌ Cover letter generation failed:', error);
      this.hideProgress();
      this.showResult('Cover letter generation failed. Please try again.', 'error');
    }
  }

  async searchJobs() {
    const jobQuery = document.getElementById('jobQuery').value.trim();
    const jobLocation = document.getElementById('jobLocation').value.trim();
    
    if (!jobQuery) {
      this.showResult('Please enter a job title or keyword', 'error');
      return;
    }

    this.showProgress('Searching for jobs...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/jobs/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: jobQuery,
          location: jobLocation,
          limit: 10
        })
      });

      const result = await response.json();
      
      if (result.success && result.jobs.length > 0) {
        this.displayJobResults(result.jobs);
        this.hideProgress();
        this.showResult(`Found ${result.jobs.length} jobs!`, 'success');
      } else {
        this.hideProgress();
        this.showResult('No jobs found. Try different keywords.', 'warning');
      }
    } catch (error) {
      console.error('❌ Job search failed:', error);
      this.hideProgress();
      this.showResult('Job search failed. Please try again.', 'error');
    }
  }

  displayJobResults(jobs) {
    const resultsContainer = document.getElementById('jobResults');
    resultsContainer.innerHTML = '';
    resultsContainer.classList.remove('hidden');

    // Add "Open All" button
    const openAllBtn = document.createElement('button');
    openAllBtn.className = 'btn btn-secondary';
    openAllBtn.textContent = `🚀 Open All ${jobs.length} Jobs`;
    openAllBtn.onclick = () => this.openAllJobs(jobs);
    resultsContainer.appendChild(openAllBtn);

    // Add individual job cards
    jobs.forEach((job, index) => {
      const jobCard = document.createElement('div');
      jobCard.className = 'job-card';
      jobCard.innerHTML = `
        <div class="job-title">${job.title}</div>
        <div class="job-company">${job.company}</div>
        <div class="job-location">${job.location || 'Not specified'}</div>
        <div class="job-actions">
          <button class="btn btn-small" onclick="chrome.tabs.create({url: '${job.url}'})">
            📝 Open Job
          </button>
          <label>
            <input type="checkbox" class="job-select" data-index="${index}" checked>
            Select
          </label>
        </div>
      `;
      resultsContainer.appendChild(jobCard);
    });

    // Add "Open Selected" button
    const openSelectedBtn = document.createElement('button');
    openSelectedBtn.className = 'btn btn-primary';
    openSelectedBtn.textContent = '🎯 Open Selected Jobs';
    openSelectedBtn.onclick = () => this.openSelectedJobs(jobs);
    resultsContainer.appendChild(openSelectedBtn);
  }

  openAllJobs(jobs) {
    jobs.forEach(job => {
      chrome.tabs.create({ url: job.url, active: false });
    });
    this.showResult(`Opened all ${jobs.length} jobs in new tabs!`, 'success');
  }

  openSelectedJobs(jobs) {
    const checkboxes = document.querySelectorAll('.job-select:checked');
    const selectedJobs = Array.from(checkboxes).map(cb => jobs[parseInt(cb.dataset.index)]);
    
    if (selectedJobs.length === 0) {
      this.showResult('No jobs selected', 'warning');
      return;
    }

    selectedJobs.forEach(job => {
      chrome.tabs.create({ url: job.url, active: false });
    });
    this.showResult(`Opened ${selectedJobs.length} selected jobs in new tabs!`, 'success');
  }

  async markApplicationSubmitted(jobInfo) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: jobInfo.title,
          company: jobInfo.company,
          location: jobInfo.location,
          url: this.pageData?.url,
          status: 'submitted',
          appliedAt: new Date().toISOString()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.showResult('Application tracked successfully!', 'success');
      } else {
        console.warn('Failed to track application:', result.error);
      }
    } catch (error) {
      console.error('Error tracking application:', error);
    }
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
  }

  updateStatus(status, text) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (statusDot && statusText) {
      statusText.textContent = text;
      
      statusDot.className = 'status-dot';
      if (status === 'error') {
        statusDot.style.background = '#f87171';
      } else if (status === 'analyzing') {
        statusDot.style.background = '#fbbf24';
      } else {
        statusDot.style.background = '#4ade80';
      }
    }
  }

  showProgress(text) {
    document.getElementById('progressSection')?.classList.remove('hidden');
    document.getElementById('progressText').textContent = text;
    
    // Animate progress bar
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = '0%';
    setTimeout(() => progressFill.style.width = '100%', 100);
  }

  hideProgress() {
    document.getElementById('progressSection')?.classList.add('hidden');
  }

  showResult(message, type) {
    const resultsSection = document.getElementById('resultsSection');
    const results = document.getElementById('results');
    
    if (resultsSection && results) {
      resultsSection.classList.remove('hidden');
      
      const resultItem = document.createElement('div');
      resultItem.className = `result-item ${type}`;
      resultItem.textContent = message;
      
      results.appendChild(resultItem);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        resultItem.remove();
        if (results.children.length === 0) {
          resultsSection.classList.add('hidden');
        }
      }, 5000);
    }
  }

  async saveSetting(key, value) {
    await chrome.storage.sync.set({ [key]: value });
  }

  async getSetting(key, defaultValue) {
    const result = await chrome.storage.sync.get({ [key]: defaultValue });
    return result[key];
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
}); 
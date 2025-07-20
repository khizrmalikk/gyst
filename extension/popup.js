// Simplified Popup Script for Job Application Bot Extension
class SimplePopupController {
  constructor() {
    this.currentTab = null;
    this.apiBaseUrl = 'http://localhost:3000';
    this.init();
  }

  async init() {
    console.log('🚀 Job Application Bot simple popup initialized');
    
    // Get current tab
    await this.getCurrentTab();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Try to analyze page for quick info (non-blocking)
    this.quickAnalyzePage();
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
    // Open dashboard button
    document.getElementById('openDashboard')?.addEventListener('click', () => {
      chrome.tabs.create({ url: `${this.apiBaseUrl}/pages` });
    });

    // Auto-detect forms checkbox
    document.getElementById('autoDetectForms')?.addEventListener('change', (e) => {
      this.saveSetting('autoDetectForms', e.target.checked);
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
  }

  async quickAnalyzePage() {
    try {
      // Try to get basic page info without blocking
      if (this.currentTab) {
        const pageTypeElement = document.getElementById('pageType');
        const jobSection = document.getElementById('jobSection');
        
        // Simple URL-based analysis
        const url = this.currentTab.url.toLowerCase();
        const title = this.currentTab.title || '';
        
        let pageType = '🌐 General Page';
        let showJobSection = false;
        
        if (url.includes('apply') || url.includes('application')) {
          pageType = '📝 Application Form';
        } else if (url.includes('job') || url.includes('career') || url.includes('linkedin.com/jobs') || url.includes('indeed.com')) {
          pageType = '💼 Job Listing';
          showJobSection = true;
          
          // Try to extract basic job info from title
          const jobTitle = document.getElementById('jobTitle');
          if (jobTitle && title) {
            jobTitle.textContent = title.split(' - ')[0] || title;
          }
        } else if (url.includes('linkedin.com/jobs') || url.includes('indeed.com') || url.includes('glassdoor.com')) {
          pageType = '🔍 Job Board';
        }
        
        if (pageTypeElement) {
          pageTypeElement.textContent = pageType;
        }
        
        if (showJobSection && jobSection) {
          jobSection.classList.remove('hidden');
        }
      }
    } catch (error) {
      console.error('❌ Quick page analysis failed:', error);
      // Don't block the popup if analysis fails
    }
  }

  async saveSetting(key, value) {
    try {
      await chrome.storage.sync.set({ [key]: value });
    } catch (error) {
      console.error('❌ Error saving setting:', error);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SimplePopupController();
}); 
// Background Script for Job Application Bot Extension
console.log('🚀 Job Application Bot background script loaded');

// Extension installation and startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('📦 Job Application Bot installed');
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'openJobBot',
    title: 'Open Job Application Bot',
    contexts: ['page']
  });
  
  // Show welcome notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icon48.png',
    title: 'Job Application Bot',
    message: 'Extension installed successfully! Click the icon to get started.'
  });
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Open side panel for the current tab
    await chrome.sidePanel.open({ tabId: tab.id });
    console.log('✅ Side panel opened for tab:', tab.id);
  } catch (error) {
    console.error('❌ Error opening side panel:', error);
    // Fallback to popup if side panel fails
    chrome.action.openPopup();
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'openJobBot') {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error('❌ Error opening side panel from context menu:', error);
    }
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message);
  
  switch (message.action) {
    case 'formsDetected':
      handleFormsDetected(message.forms, message.url, sender.tab);
      break;
      
    case 'jobAnalyzed':
      handleJobAnalyzed(message.jobData, sender.tab);
      break;
      
    case 'applicationSubmitted':
      handleApplicationSubmitted(message.applicationData, sender.tab);
      break;
      
    case 'openSidePanel':
      chrome.sidePanel.open({ tabId: sender.tab.id });
      break;
      
    default:
      console.log('🤷 Unknown message action:', message.action);
  }
  
  // Keep message channel open for async response
  return true;
});

// Handle form detection
function handleFormsDetected(forms, url, tab) {
  console.log('📝 Forms detected on page:', url, forms);
  
  // Show badge if application forms are found
  const applicationForms = forms.filter(form => form.isApplicationForm);
  if (applicationForms.length > 0) {
    chrome.action.setBadgeText({
      text: applicationForms.length.toString(),
      tabId: tab.id
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#4CAF50',
      tabId: tab.id
    });
  } else {
    chrome.action.setBadgeText({
      text: '',
      tabId: tab.id
    });
  }
}

// Handle job analysis
function handleJobAnalyzed(jobData, tab) {
  console.log('💼 Job analyzed:', jobData);
  
  // Show notification for job pages
  if (jobData.pageType === 'job_listing') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon48.png',
      title: 'Job Found!',
      message: `${jobData.title} at ${jobData.company}`
    });
  }
}

// Handle application submission
function handleApplicationSubmitted(applicationData, tab) {
  console.log('✅ Application submitted:', applicationData);
  
  // Show success notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icon48.png',
    title: 'Application Submitted!',
    message: `Applied to ${applicationData.jobTitle} at ${applicationData.company}`
  });
  
  // Clear badge
  chrome.action.setBadgeText({
    text: '',
    tabId: tab.id
  });
}

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Clear badge when navigating to new page
    chrome.action.setBadgeText({
      text: '',
      tabId: tabId
    });
  }
});

// Handle extension errors
chrome.runtime.onSuspend.addListener(() => {
  console.log('🔄 Extension suspended');
});

chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('🔄 Extension suspend canceled');
}); 
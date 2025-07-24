// Background Script for Job Application Bot Extension
console.log('🚀 Job Application Bot background script loaded');

// Wait for APIs to be ready
const waitForExtensionAPI = () => {
  return new Promise((resolve) => {
    if (chrome && chrome.runtime && chrome.action) {
      resolve();
    } else {
      const checkAPI = () => {
        if (chrome && chrome.runtime && chrome.action) {
          resolve();
        } else {
          setTimeout(checkAPI, 100);
        }
      };
      checkAPI();
    }
  });
};

// Extension installation and startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('📦 Job Application Bot installed');
  
  try {
    // Create context menu
    chrome.contextMenus.create({
      id: 'openJobBot',
      title: 'Open Job Application Bot',
      contexts: ['page']
    });
    
    // Show welcome notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon48.svg',
      title: 'Job Application Bot',
      message: 'Extension installed successfully! Click the icon to get started.'
    });
  } catch (error) {
    console.error('❌ Error during installation:', error);
  }
});

// Initialize extension after APIs are ready
waitForExtensionAPI().then(() => {
  console.log('✅ Extension APIs ready');
  
  // Handle extension icon click - open side panel
  chrome.action.onClicked.addListener(async (tab) => {
    try {
      console.log('🖱️ Extension icon clicked for tab:', tab.id);
      
      // Check if sidePanel API is available
      if (chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ tabId: tab.id });
        console.log('✅ Side panel opened for tab:', tab.id);
      } else {
        console.log('⚠️ Side panel API not available, opening popup in new tab');
        // Fallback to opening popup in new tab
        chrome.tabs.create({
          url: chrome.runtime.getURL('popup.html'),
          active: true
        });
      }
    } catch (error) {
      console.error('❌ Error opening side panel:', error);
      // Fallback to opening popup in new tab
      try {
        chrome.tabs.create({
          url: chrome.runtime.getURL('popup.html'),
          active: true
        });
      } catch (fallbackError) {
        console.error('❌ Fallback failed:', fallbackError);
      }
    }
  });
}).catch(error => {
  console.error('❌ Failed to initialize extension APIs:', error);
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'openJobBot') {
    try {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ tabId: tab.id });
      } else {
        chrome.tabs.create({
          url: chrome.runtime.getURL('popup.html'),
          active: true
        });
      }
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
      
    case 'pageChanged':
      handlePageChanged(message, sender.tab);
      break;
      
    case 'applicationSubmitted':
      handleApplicationSubmitted(message.applicationData, sender.tab);
      break;
      
    case 'openSidePanel':
      if (chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
      } else {
        chrome.tabs.create({
          url: chrome.runtime.getURL('popup.html'),
          active: true
        });
      }
      break;
      
    case 'extensionAuthSuccess':
      console.log('🔑 Background received extension auth success');
      handleExtensionAuthSuccess(message.authData, message.state);
      break;
      
    default:
      console.log('🤷 Unknown message action:', message.action);
  }
  
  // Keep message channel open for async response
  return true;
});

// Handle page changes
function handlePageChanged(message, tab) {
  console.log('🔄 Page changed on tab:', tab.id, 'URL:', message.url);
  
  try {
    // Forward the page change message to the side panel if it's open
    // Note: We can't directly message the side panel, but we can store the state
    // The side panel will need to periodically check for updates or listen differently
    
    // For now, we'll just log it and let the side panel's own URL monitoring handle it
    // Clear badges when page changes
    chrome.action.setBadgeText({
      text: '',
      tabId: tab.id
    });
    
  } catch (error) {
    console.error('❌ Error handling page change:', error);
  }
}

// Handle form detection
function handleFormsDetected(forms, url, tab) {
  console.log('📝 Forms detected on page:', url, forms);
  
  try {
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
  } catch (error) {
    console.error('❌ Error setting badge:', error);
  }
}

// Handle job analysis
function handleJobAnalyzed(jobData, tab) {
  console.log('💼 Job analyzed:', jobData);
  
  try {
    // Show notification for job pages
    if (jobData.pageType === 'job_listing') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon48.svg',
        title: 'Job Found!',
        message: `${jobData.title} at ${jobData.company}`
      });
    }
  } catch (error) {
    console.error('❌ Error showing notification:', error);
  }
}

// Handle application submission
function handleApplicationSubmitted(applicationData, tab) {
  console.log('✅ Application submitted:', applicationData);
  
  try {
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon48.svg',
      title: 'Application Submitted!',
      message: `Applied to ${applicationData.jobTitle} at ${applicationData.company}`
    });
    
    // Clear badge
    chrome.action.setBadgeText({
      text: '',
      tabId: tab.id
    });
  } catch (error) {
    console.error('❌ Error handling application submission:', error);
  }
}

// Handle extension authorization success
async function handleExtensionAuthSuccess(authData, state) {
  try {
    console.log('✅ Processing extension authorization success');
    
    // Store the auth data in chrome.storage
    await chrome.storage.local.set({
      extensionAuth: {
        userId: authData.userId,
        token: authData.token,
        timestamp: authData.timestamp,
        userName: authData.userName,
        userEmail: authData.userEmail
      }
    });
    
    console.log('✅ Extension auth stored in background script');
    
    // Try to notify any open side panels
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        // Send message to any side panels that might be open
        chrome.tabs.sendMessage(tab.id, {
          action: 'authSuccess',
          authData: authData
        }).catch(() => {
          // Ignore errors for tabs that don't have content scripts
        });
      } catch (error) {
        // Ignore errors for inactive tabs
      }
    }
    
  } catch (error) {
    console.error('❌ Error handling extension auth success:', error);
  }
}

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      // Clear badge when navigating to new page
      chrome.action.setBadgeText({
        text: '',
        tabId: tabId
      });
    } catch (error) {
      console.error('❌ Error clearing badge:', error);
    }
  }
});

// Handle extension errors
chrome.runtime.onSuspend.addListener(() => {
  console.log('🔄 Extension suspended');
});

chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('🔄 Extension suspend canceled');
}); 
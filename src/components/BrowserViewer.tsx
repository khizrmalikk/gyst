'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, ExternalLink, FormInput, FileText, Download, ArrowLeft, ArrowRight } from 'lucide-react';

interface BrowserViewerProps {
  jobUrl?: string;
  workflowId?: string;
  onFormFillComplete?: (result: any) => void;
}

export function BrowserViewer({ jobUrl, workflowId, onFormFillComplete }: BrowserViewerProps) {
  const [currentUrl, setCurrentUrl] = useState(jobUrl || '');
  const [urlInput, setUrlInput] = useState(jobUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isFormFilling, setIsFormFilling] = useState(false);
  const [isGeneratingDocuments, setIsGeneratingDocuments] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [navigationBlocked, setNavigationBlocked] = useState(false);
  const [scriptInjectionFailed, setScriptInjectionFailed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (jobUrl) {
      setCurrentUrl(jobUrl);
      setUrlInput(jobUrl);
      setIsLoading(true);
      setIframeBlocked(false); // Reset blocked state for new URL
      setNavigationBlocked(false);
      setScriptInjectionFailed(false);
      
      // Clear any existing timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      // Set a timeout to detect if iframe fails to load
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setIframeBlocked(true);
      }, 10000); // 10 second timeout
    }
  }, [jobUrl]);

  // Monitor iframe URL changes
  useEffect(() => {
    const monitorIframeUrl = () => {
      try {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          const iframeUrl = iframe.contentWindow.location.href;
          if (iframeUrl !== currentUrl && iframeUrl !== 'about:blank') {
            console.log('🔄 Iframe URL changed to:', iframeUrl);
            setCurrentUrl(iframeUrl);
            setUrlInput(iframeUrl);
          }
        }
      } catch (error) {
        // CORS error - can't access iframe URL
      }
    };

    const interval = setInterval(monitorIframeUrl, 1000);
    return () => clearInterval(interval);
  }, [currentUrl]);

  // Listen for navigation attempts from within the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only listen to messages from our iframe
      if (event.source === iframeRef.current?.contentWindow) {
        if (event.data.type === 'navigation') {
          // Handle navigation within iframe instead of opening new tab
          setNavigationBlocked(true);
          setCurrentUrl(event.data.url);
          setUrlInput(event.data.url);
          setIsLoading(true);
          setIframeBlocked(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      let url = urlInput.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      setCurrentUrl(url);
      setUrlInput(url);
      setIsLoading(true);
      setIframeBlocked(false);
      setNavigationBlocked(false);
      setScriptInjectionFailed(false);
      
      // Clear any existing timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      // Set a timeout to detect if iframe fails to load
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setIframeBlocked(true);
      }, 10000); // 10 second timeout
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    
    // Clear the timeout since iframe loaded successfully
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    
    // Reset script injection status for new page load
    setScriptInjectionFailed(false);
    
    // Try multiple approaches to prevent new tabs
    let scriptWorked = false;
    let cssWorked = false;
    
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow && iframe.contentDocument) {
        
        // Method 1: Inject CSS to hide/disable problematic elements
        try {
          const style = iframe.contentDocument.createElement('style');
          style.textContent = `
            /* Hide elements that commonly open new tabs */
            a[target="_blank"]::after {
              content: " (redirected)";
              font-size: 0.8em;
              color: #666;
            }
            
            /* Ensure all links open in same frame */
            a[target="_blank"],
            a[target="new"],
            a[target="_new"] {
              target: _self !important;
            }
          `;
          iframe.contentDocument.head.appendChild(style);
          cssWorked = true;
          console.log('✅ CSS injection successful');
        } catch (cssError) {
          console.log('❌ CSS injection failed:', cssError);
        }
        
        // Method 2: JavaScript injection (more comprehensive)
        try {
          const script = iframe.contentDocument.createElement('script');
          script.textContent = `
            (function() {
              console.log('🚀 Advanced navigation script loading...');
              
              let linksFixed = 0;
              let windowOpenCalls = 0;
              
              // Method 1: Aggressive target removal
              function fixAllLinks() {
                const allLinks = document.querySelectorAll('a');
                allLinks.forEach(link => {
                  if (link.target && link.target !== '_self') {
                    console.log('🔧 Fixing link target:', link.target, '->', '_self', link.href);
                    link.target = '_self';
                    linksFixed++;
                  }
                  
                  // Also remove rel="noopener" which can cause issues
                  if (link.rel && link.rel.includes('noopener')) {
                    link.rel = link.rel.replace(/noopener/g, '').trim();
                  }
                });
                
                // Fix forms too
                const allForms = document.querySelectorAll('form');
                allForms.forEach(form => {
                  if (form.target && form.target !== '_self') {
                    form.target = '_self';
                  }
                });
                
                console.log('🔧 Fixed', linksFixed, 'links to open in same window');
              }
              
              // Method 2: Override window.open completely
              const originalOpen = window.open;
              const originalLocation = window.location;
              
              window.open = function(url, target, features) {
                windowOpenCalls++;
                console.log('🪟 window.open call #' + windowOpenCalls + ' intercepted:', {url, target, features});
                
                if (url && url !== 'about:blank' && !url.startsWith('javascript:')) {
                  console.log('➡️ Redirecting to same window:', url);
                  try {
                    window.location.href = url;
                  } catch (e) {
                    window.location.assign(url);
                  }
                  return null;
                }
                
                console.log('🚫 Blocking window.open for:', url);
                return null;
              };
              
              // Method 3: Intercept link clicks before they execute
              document.addEventListener('click', function(e) {
                const link = e.target.closest('a');
                if (link && link.href) {
                  console.log('🖱️ Click on link:', link.href, 'target:', link.target);
                  
                  // Force target to _self if it's trying to open new window
                  if (link.target && link.target !== '_self') {
                    console.log('🔄 Forcing link to open in same window');
                    link.target = '_self';
                  }
                }
              }, true);
              
              // Method 4: Watch for DOM changes and fix new links
              if (window.MutationObserver) {
                const observer = new MutationObserver(function(mutations) {
                  let shouldFix = false;
                  mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList' || mutation.type === 'attributes') {
                      shouldFix = true;
                    }
                  });
                  
                  if (shouldFix) {
                    setTimeout(fixAllLinks, 50);
                  }
                });
                
                observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['target', 'href']
                });
              }
              
              // Run initial fix
              fixAllLinks();
              
              // Run fix again after a short delay for dynamic content
              setTimeout(fixAllLinks, 1000);
              setTimeout(fixAllLinks, 3000);
              
              console.log('✅ Advanced navigation script fully active');
              
              // Signal success to parent
              window.navigationScriptLoaded = true;
            })();
          `;
          iframe.contentDocument.head.appendChild(script);
          scriptWorked = true;
          console.log('✅ JavaScript injection successful');
          
          // Check if script actually executed
          setTimeout(() => {
            try {
              if (iframe.contentWindow && (iframe.contentWindow as any).navigationScriptLoaded) {
                console.log('✅ Script execution confirmed');
              } else {
                console.log('⚠️ Script injected but may not have executed');
                setScriptInjectionFailed(true);
              }
            } catch (e) {
              console.log('⚠️ Cannot verify script execution due to CORS');
              setScriptInjectionFailed(true);
            }
          }, 500);
          
        } catch (jsError) {
          console.log('❌ JavaScript injection failed:', jsError);
          setScriptInjectionFailed(true);
        }
      }
    } catch (error) {
      console.log('❌ All injection methods failed:', error);
      setScriptInjectionFailed(true);
    }
    
    if (!scriptWorked && !cssWorked) {
      setScriptInjectionFailed(true);
      console.log('❌ No injection methods worked - CORS restrictions active');
    }
    
    // Try to detect navigation state (limited due to CORS)
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        setCanGoBack(iframe.contentWindow.history.length > 1);
      }
    } catch (error) {
      // Ignore CORS errors
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIframeBlocked(true);
    
    // Clear the timeout since we got an error
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
  };

  const handleOpenBlockedSite = () => {
    if (currentUrl) {
      window.open(currentUrl, '_blank');
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setNavigationBlocked(false);
    setScriptInjectionFailed(false);
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  const handleBack = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.history.back();
      }
    } catch (error) {
      console.warn('Cannot navigate back due to CORS restrictions');
    }
  };

  const handleForward = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.history.forward();
      }
    } catch (error) {
      console.warn('Cannot navigate forward due to CORS restrictions');
    }
  };

  const handleOpenInNewTab = () => {
    if (currentUrl) {
      window.open(currentUrl, '_blank');
    }
  };

  const handleStartFormFilling = async () => {
    if (!currentUrl || !workflowId) return;
    
    setIsFormFilling(true);
    setIsGeneratingDocuments(true);
    
    try {
      const response = await fetch('/api/browser/analyze-and-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workflowId, 
          url: currentUrl,
          action: 'analyze_and_fill'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        onFormFillComplete?.(result);
      } else {
        throw new Error(result.error || 'Form filling failed');
      }
    } catch (error) {
      console.error('Form filling error:', error);
      onFormFillComplete?.({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsFormFilling(false);
      setIsGeneratingDocuments(false);
    }
  };

  const handleGenerateCV = async () => {
    if (!workflowId) return;
    
    setIsGeneratingDocuments(true);
    
    try {
      const response = await fetch('/api/browser/analyze-and-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workflowId, 
          url: currentUrl,
          action: 'generate_cv'
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.cv) {
        // Create and download the CV
        const blob = new Blob([result.cv], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cv_${workflowId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('CV generation error:', error);
    } finally {
      setIsGeneratingDocuments(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!workflowId) return;
    
    setIsGeneratingDocuments(true);
    
    try {
      const response = await fetch('/api/browser/analyze-and-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workflowId, 
          url: currentUrl,
          action: 'generate_cover_letter'
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.coverLetter) {
        // Create and download the cover letter
        const blob = new Blob([result.coverLetter], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cover_letter_${workflowId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Cover letter generation error:', error);
    } finally {
      setIsGeneratingDocuments(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Embedded Browser</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInNewTab}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open in New Tab
          </Button>
        </div>
        
        {/* URL Navigation Bar */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={!canGoBack}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleForward}
            disabled={!canGoForward}
            className="flex items-center gap-1"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          <form onSubmit={handleUrlSubmit} className="flex-1 flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter URL..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" size="sm" disabled={isLoading}>
              Go
            </Button>
          </form>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Browser Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleStartFormFilling}
            disabled={isFormFilling || !currentUrl}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FormInput className="h-4 w-4" />
            {isFormFilling ? 'Filling Form...' : 'Start Form Filling'}
          </Button>
          
          <Button
            onClick={handleGenerateCV}
            disabled={isGeneratingDocuments || !workflowId}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Generate CV
          </Button>
          
          <Button
            onClick={handleGenerateCoverLetter}
            disabled={isGeneratingDocuments || !workflowId}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Generate Cover Letter
          </Button>
        </div>
        
        {/* Browser Frame */}
        <div className="border rounded-lg overflow-hidden bg-white relative" style={{ height: '600px' }}>
          {/* Navigation Status Indicator */}
          {currentUrl && !isLoading && !iframeBlocked && (
            <div className="absolute top-2 right-2 z-10">
              {scriptInjectionFailed ? (
                <div className="bg-amber-100 border border-amber-300 rounded-full px-3 py-1 flex items-center text-xs">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                  <span className="text-amber-800">Links may open new tabs</span>
                </div>
              ) : (
                <div className="bg-green-100 border border-green-300 rounded-full px-3 py-1 flex items-center text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-green-800">Links contained</span>
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">Loading...</p>
              </div>
            </div>
          )}
          
          {iframeBlocked && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 max-w-md mx-auto">
                  <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-4">
                    <ExternalLink className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-medium text-orange-900 mb-2">Website Blocked</h3>
                  <p className="text-sm text-orange-800 mb-4">
                    This website cannot be displayed in the embedded browser due to security restrictions. 
                    Most job boards block iframe embedding for security reasons.
                  </p>
                  <div className="space-y-3">
                    <Button
                      onClick={handleOpenBlockedSite}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                    <p className="text-xs text-orange-700">
                      Navigate to the application form in the new tab, then return here to use the form filling features.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {currentUrl && !iframeBlocked && (
            <iframe
              ref={iframeRef}
              src={currentUrl}
              className="w-full h-full"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ display: isLoading ? 'none' : 'block' }}
              sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation"
              referrerPolicy="no-referrer-when-downgrade"
              allow="navigation-override"
            />
          )}
          
          {!currentUrl && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-600 mb-2">No URL Selected</p>
                <p className="text-sm text-gray-500">Click on a job's apply button to start browsing</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation Status */}
        {navigationBlocked && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Navigation intercepted successfully! Links are now staying within the embedded browser.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Script Injection Failed Warning */}
        {scriptInjectionFailed && !iframeBlocked && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-amber-800">
                  Link interception not available due to website security restrictions.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Some links may still open in new tabs. Copy and paste application URLs manually if needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
          {iframeBlocked ? (
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Click "Open in New Tab" to access the job application in a new browser tab</li>
              <li>2. Navigate to the application form in the new tab</li>
              <li>3. Return to this page and enter the application form URL in the address bar above</li>
              <li>4. Use "Start Form Filling" to analyze and fill the form</li>
              <li>5. Generate custom CV and cover letter as needed</li>
            </ol>
          ) : (
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Navigate to the job application form using the browser above</li>
              <li>2. All links will stay within this embedded browser (no new tabs)</li>
              <li>3. When you're ready to fill the form, click "Start Form Filling"</li>
              <li>4. The AI will analyze the page and automatically fill available fields</li>
              <li>5. Review the filled form and submit manually</li>
              <li>6. Generate custom CV and cover letter as needed</li>
            </ol>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 
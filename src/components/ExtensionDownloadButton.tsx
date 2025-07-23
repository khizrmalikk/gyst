'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ExtensionDownloadButtonProps {
  variant?: 'navbar' | 'banner';
  className?: string;
}

export default function ExtensionDownloadButton({ 
  variant = 'navbar', 
  className = '' 
}: ExtensionDownloadButtonProps) {
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if extension is installed by trying to communicate with it
    const checkExtensionInstalled = async () => {
      try {
        // Try to detect the extension by checking for a specific element it might inject
        // or by trying to send a message (this would need to be implemented in the extension)
        
        // Method 1: Check for extension-specific DOM elements
        const extensionElement = document.querySelector('[data-gyst-extension]');
        if (extensionElement) {
          setExtensionInstalled(true);
          setLoading(false);
          return;
        }

        // Method 2: Try to communicate with extension via postMessage
        let extensionFound = false;
        
        // Send a message to check if extension is present
        window.postMessage({ type: 'GYST_EXTENSION_CHECK' }, '*');
        
        // Listen for response
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'GYST_EXTENSION_RESPONSE') {
            extensionFound = true;
            setExtensionInstalled(true);
            setLoading(false);
            window.removeEventListener('message', handleMessage);
          }
        };

        window.addEventListener('message', handleMessage);
        
        // Timeout after 1 second if no response
        setTimeout(() => {
          if (!extensionFound) {
            setExtensionInstalled(false);
            setLoading(false);
          }
          window.removeEventListener('message', handleMessage);
        }, 1000);

      } catch (error) {
        console.log('Extension detection failed:', error);
        setExtensionInstalled(false);
        setLoading(false);
      }
    };

    // Only run in browser
    if (typeof window !== 'undefined') {
      checkExtensionInstalled();
    }
  }, []);

  // Don't render anything while loading or if extension is installed
  if (loading || extensionInstalled) {
    return null;
  }

  const EXTENSION_URL = 'https://chrome.google.com/webstore/detail/gyst-job-application-bot/YOUR_EXTENSION_ID';

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-[#66615E] to-[#949392] text-white p-4 ${className}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <div>
              <div className="font-semibold">Get the Chrome Extension</div>
              <div className="text-sm text-white/80">Generate CVs instantly while browsing jobs</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href={EXTENSION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-[#66615E] hover:bg-gray-100 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              Add to Chrome
            </a>
            <button 
              onClick={() => setExtensionInstalled(true)} 
              className="text-white/80 hover:text-white text-sm"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Navbar variant
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
        NEW
      </div>
      <a
        href={EXTENSION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center bg-[#66615E] hover:bg-[#5a5550] text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5c-5.25 0-9.5 4.25-9.5 9.5s4.25 9.5 9.5 9.5 9.5-4.25 9.5-9.5-4.25-9.5-9.5-9.5zm-1.5 15.5l-4-4 1.06-1.06 2.94 2.94 6.44-6.44 1.06 1.06-7.5 7.5z"/>
        </svg>
        Get Extension
      </a>
    </div>
  );
}

// Hook for extension detection that can be used in other components
export function useExtensionDetection() {
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkExtensionInstalled = async () => {
      try {
        // Same detection logic as above
        const extensionElement = document.querySelector('[data-gyst-extension]');
        if (extensionElement) {
          setExtensionInstalled(true);
          setLoading(false);
          return;
        }

        let extensionFound = false;
        window.postMessage({ type: 'GYST_EXTENSION_CHECK' }, '*');
        
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'GYST_EXTENSION_RESPONSE') {
            extensionFound = true;
            setExtensionInstalled(true);
            setLoading(false);
            window.removeEventListener('message', handleMessage);
          }
        };

        window.addEventListener('message', handleMessage);
        
        setTimeout(() => {
          if (!extensionFound) {
            setExtensionInstalled(false);
            setLoading(false);
          }
          window.removeEventListener('message', handleMessage);
        }, 1000);

      } catch (error) {
        setExtensionInstalled(false);
        setLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      checkExtensionInstalled();
    }
  }, []);

  return { extensionInstalled, loading };
} 
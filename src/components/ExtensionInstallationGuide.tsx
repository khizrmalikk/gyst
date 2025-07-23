'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ExtensionInstallationGuideProps {
  className?: string;
}

export default function ExtensionInstallationGuide({ 
  className = '' 
}: ExtensionInstallationGuideProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const EXTENSION_URL = 'https://chrome.google.com/webstore/detail/gyst-job-application-bot/YOUR_EXTENSION_ID';

  const installationSteps = [
    {
      step: 1,
      title: 'Visit Chrome Web Store',
      description: 'Click the "Add to Chrome" button below to go to our extension page',
      image: '/extension-screenshots/step1.png', // You'll need to add these
      instruction: 'Click "Add to Chrome" to get started'
    },
    {
      step: 2,
      title: 'Install Extension',
      description: 'Chrome will ask for permission to install the extension',
      image: '/extension-screenshots/step2.png',
      instruction: 'Click "Add Extension" when prompted'
    },
    {
      step: 3,
      title: 'Pin Extension',
      description: 'Pin GYST to your toolbar for easy access',
      image: '/extension-screenshots/step3.png',
      instruction: 'Click the puzzle piece icon and pin GYST'
    },
    {
      step: 4,
      title: 'Start Applying!',
      description: 'Visit any job posting and use GYST to generate custom applications',
      image: '/extension-screenshots/step4.png',
      instruction: 'Open any job listing and click the GYST icon'
    }
  ];

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-black mb-4">
          Install the GYST Chrome Extension
        </h2>
        <p className="text-xl text-[#66615E] mb-8">
          Generate custom CVs and cover letters while browsing any job site
        </p>
        
        {/* Main CTA */}
        <a
          href={EXTENSION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center bg-[#66615E] hover:bg-[#5a5550] text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors mb-6"
        >
          <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5c-5.25 0-9.5 4.25-9.5 9.5s4.25 9.5 9.5 9.5 9.5-4.25 9.5-9.5-4.25-9.5-9.5-9.5zm-1.5 15.5l-4-4 1.06-1.06 2.94 2.94 6.44-6.44 1.06 1.06-7.5 7.5z"/>
          </svg>
          Add to Chrome - Free
        </a>
        
        <div className="flex items-center justify-center space-x-4 text-sm text-[#949392]">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Free Forever
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Works on all job sites
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            No signup required to install
          </div>
        </div>
      </div>

      {/* Installation Steps */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold text-black mb-8 text-center">
          Installation Guide
        </h3>
        
        {/* Step Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            {installationSteps.map((step) => (
              <button
                key={step.step}
                onClick={() => setCurrentStep(step.step)}
                className={`w-10 h-10 rounded-full font-semibold text-sm transition-colors ${
                  currentStep === step.step
                    ? 'bg-[#66615E] text-white'
                    : 'bg-[#C9C8C7] text-[#66615E] hover:bg-[#949392] hover:text-white'
                }`}
              >
                {step.step}
              </button>
            ))}
          </div>
        </div>

        {/* Current Step */}
        <div className="text-center">
          {installationSteps
            .filter(step => step.step === currentStep)
            .map(step => (
              <div key={step.step} className="max-w-2xl mx-auto">
                <h4 className="text-xl font-semibold text-black mb-3">
                  Step {step.step}: {step.title}
                </h4>
                <p className="text-[#66615E] mb-6">
                  {step.description}
                </p>
                
                {/* Placeholder for screenshot */}
                <div className="bg-[#F2F0EF] border border-[#C9C8C7] rounded-lg p-8 mb-6">
                  <div className="w-full h-64 flex items-center justify-center text-[#949392]">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">Screenshot: {step.title}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#F2F0EF] border border-[#C9C8C7] rounded-lg p-4">
                  <p className="font-medium text-[#66615E]">
                    📝 {step.instruction}
                  </p>
                </div>
              </div>
            ))
          }
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-[#C9C8C7] text-[#66615E] rounded-lg hover:bg-[#C9C8C7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <button
            onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
            disabled={currentStep === 4}
            className="px-6 py-2 bg-[#66615E] text-white rounded-lg hover:bg-[#5a5550] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Features Highlight */}
      <div className="mt-12 grid md:grid-cols-3 gap-6">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <div className="w-12 h-12 bg-[#66615E] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h4 className="font-semibold text-black mb-2">Instant CV Generation</h4>
          <p className="text-sm text-[#66615E]">
            Generate a tailored CV for any job posting in seconds
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <div className="w-12 h-12 bg-[#949392] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="font-semibold text-black mb-2">Custom Cover Letters</h4>
          <p className="text-sm text-[#66615E]">
            AI-powered cover letters tailored to each specific role
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <div className="w-12 h-12 bg-[#C9C8C7] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 00-2 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2a2 2 0 012 2v10" />
            </svg>
          </div>
          <h4 className="font-semibold text-black mb-2">Universal Compatibility</h4>
          <p className="text-sm text-[#66615E]">
            Works on LinkedIn, Indeed, Glassdoor, and all major job sites
          </p>
        </div>
      </div>
    </div>
  );
} 
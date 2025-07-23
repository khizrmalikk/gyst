import Link from 'next/link';
import ExtensionInstallationGuide from '@/components/ExtensionInstallationGuide';

export const metadata = {
  title: 'Chrome Extension - GYST Job Application Bot',
  description: 'Generate custom CVs and cover letters while browsing any job site with our free Chrome extension.',
};

export default function ExtensionPage() {
  return (
    <div className="min-h-screen bg-[#F2F0EF]">
      {/* Navigation */}
      <header className="w-full px-4 py-6 sm:px-6 lg:px-8 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <span className="text-[#F2F0EF] font-bold text-lg">G</span>
            </div>
            <span className="text-2xl font-bold text-black tracking-tight">GYST</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link href="/auth/login" className="text-[#66615E] hover:text-black font-medium">
              Login
            </Link>
            <Link href="/auth/signup" className="bg-black hover:bg-[#66615E] text-[#F2F0EF] px-4 py-2 rounded-lg font-medium transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-green-100 text-green-800 rounded-full px-4 py-2 text-sm font-medium mb-6">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Free Chrome Extension
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-light text-black mb-6 tracking-tight leading-tight">
            Apply Smarter,<br />Not Harder
          </h1>
          
          <p className="text-xl sm:text-2xl text-[#66615E] mb-8 max-w-3xl mx-auto leading-relaxed">
            Install our Chrome extension and generate custom CVs and cover letters for any job posting, on any website, instantly.
          </p>
        </div>

        {/* Demo Video Placeholder */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <div className="aspect-video bg-gradient-to-br from-[#66615E] to-[#949392] rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 010 5H9m0-5a2.5 2.5 0 00-2.5 2.5v1.5M7 10H4a2 2 0 00-2 2v4a2 2 0 002 2h3m7-8h3a2 2 0 012 2v4a2 2 0 01-2 2h-3" />
                </svg>
                <h3 className="text-xl font-semibold mb-2">See GYST in Action</h3>
                <p className="text-white/80 mb-4">Watch how easy it is to generate job-specific CVs</p>
                <button className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  ▶ Play Demo Video
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-[#66615E] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-black mb-4">One-Click Generation</h3>
            <p className="text-[#66615E] leading-relaxed">
              No copy-pasting job descriptions. Just click and get a perfectly tailored CV for any job posting.
            </p>
          </div>

          <div className="bg-white rounded-lg p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-[#949392] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 00-2 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2a2 2 0 012 2v10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-black mb-4">Universal Compatibility</h3>
            <p className="text-[#66615E] leading-relaxed">
              Works seamlessly on LinkedIn, Indeed, Glassdoor, AngelList, and thousands of company career pages.
            </p>
          </div>

          <div className="bg-white rounded-lg p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-[#C9C8C7] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-black mb-4">Privacy First</h3>
            <p className="text-[#66615E] leading-relaxed">
              Your data stays secure. We only access pages when you actively use the extension.
            </p>
          </div>
        </div>
      </section>

      {/* Installation Guide */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ExtensionInstallationGuide />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-medium text-black mb-4 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-black mb-3">
              Do I need a GYST account to use the extension?
            </h3>
            <p className="text-[#66615E] leading-relaxed">
              Yes, you'll need to create a free GYST account to generate documents. This allows us to store your profile information and create personalized CVs and cover letters.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-black mb-3">
              Which job sites does the extension work with?
            </h3>
            <p className="text-[#66615E] leading-relaxed">
              Our extension works on virtually any website with job postings, including LinkedIn, Indeed, Glassdoor, AngelList, company career pages, and more. If you can read a job posting, GYST can generate documents for it.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-black mb-3">
              Is the extension really free?
            </h3>
            <p className="text-[#66615E] leading-relaxed">
              The extension itself is completely free to install and use. You'll only pay when you actually generate documents, using your GYST credits. New users get free credits to get started.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-black mb-3">
              How does the extension access my profile information?
            </h3>
            <p className="text-[#66615E] leading-relaxed">
              When you're logged into your GYST account, the extension securely fetches your profile information from our servers to generate personalized documents. We never store or access your browsing data.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-black mb-3">
              Can I customize the generated documents?
            </h3>
            <p className="text-[#66615E] leading-relaxed">
              Yes! The extension generates tailored documents based on your profile and the specific job posting. You can also update your profile anytime to ensure all future documents reflect your latest information.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-[#66615E] to-[#949392] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-medium text-white mb-6 tracking-tight">
            Ready to Transform Your Job Search?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Install the GYST Chrome extension and start generating professional, tailored documents in seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://chrome.google.com/webstore/detail/gyst-job-application-bot/YOUR_EXTENSION_ID"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-white text-[#66615E] hover:bg-[#F2F0EF] px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.5c-5.25 0-9.5 4.25-9.5 9.5s4.25 9.5 9.5 9.5 9.5-4.25 9.5-9.5-4.25-9.5-9.5-9.5zm-1.5 15.5l-4-4 1.06-1.06 2.94 2.94 6.44-6.44 1.06 1.06-7.5 7.5z"/>
              </svg>
              Add to Chrome - Free
            </a>
            <Link
              href="/auth/signup"
              className="inline-flex items-center border-2 border-white text-white hover:bg-white hover:text-[#66615E] px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#66615E] text-[#F2F0EF] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-[#F2F0EF] rounded-lg flex items-center justify-center">
                <span className="text-black font-bold">G</span>
              </div>
              <span className="text-xl font-bold">GYST</span>
            </div>
            
            <div className="flex space-x-6">
              <Link href="/" className="text-[#C9C8C7] hover:text-[#F2F0EF] transition-colors">
                Home
              </Link>
              <Link href="#" className="text-[#C9C8C7] hover:text-[#F2F0EF] transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-[#C9C8C7] hover:text-[#F2F0EF] transition-colors">
                Terms
              </Link>
              <Link href="#" className="text-[#C9C8C7] hover:text-[#F2F0EF] transition-colors">
                Support
              </Link>
            </div>
          </div>
          
          <div className="border-t border-[#949392] mt-8 pt-8 text-center text-[#C9C8C7]">
            <p>&copy; 2024 GYST. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F2F0EF] font-sans">
      {/* Header/Nav */}
      <header className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <span className="text-[#F2F0EF] font-bold text-lg">G</span>
            </div>
            <span className="text-2xl font-bold text-black tracking-tight">GYST</span>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-[#66615E] hover:text-black transition-colors">Features</a>
            <a href="#how-it-works" className="text-[#66615E] hover:text-black transition-colors">How It Works</a>
            <a href="#pricing" className="text-[#66615E] hover:text-black transition-colors">Pricing</a>
          </nav>
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
      <section className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl font-light text-black mb-6 tracking-tight leading-tight">
            Get Your Shit Together
          </h1>
          <p className="text-xl sm:text-2xl font-normal text-[#66615E] mb-8 max-w-3xl mx-auto leading-relaxed">
            Stop wasting time on endless job applications. Let AI find, customize, and apply to jobs for you while you focus on what matters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/auth/signup" className="bg-black hover:bg-[#66615E] text-[#F2F0EF] px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
              Start Applying Today
            </Link>
            <Link href="#how-it-works" className="border border-[#C9C8C7] text-[#66615E] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#C9C8C7] hover:text-black transition-colors">
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-medium text-black mb-4 tracking-tight">
              Why GYST Works
            </h2>
            <p className="text-xl text-[#66615E]">
              Designed specifically for new grads and early-career professionals
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-[#C9C8C7] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Smart Job Discovery</h3>
              <p className="text-[#66615E]">
                AI-powered search finds relevant opportunities across multiple platforms based on your preferences
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-[#949392] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Custom CV & Cover Letters</h3>
              <p className="text-[#66615E]">
                Automatically tailored resumes and cover letters for each job application
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-[#66615E] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Automated Applications</h3>
              <p className="text-[#66615E]">
                Submit applications 24/7 while you sleep, interview, or focus on other priorities
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-medium text-black mb-4 tracking-tight">
              How GYST Works
            </h2>
            <p className="text-xl text-[#66615E]">
              Four simple steps to landing your dream job
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-black text-[#F2F0EF] rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
              <h3 className="text-lg font-semibold text-black mb-2">Set Your Preferences</h3>
              <p className="text-[#66615E]">Tell our AI what kind of job you're looking for</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-[#C9C8C7] text-black rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
              <h3 className="text-lg font-semibold text-black mb-2">AI Finds Jobs</h3>
              <p className="text-[#66615E]">We search across multiple platforms for relevant opportunities</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-[#949392] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
              <h3 className="text-lg font-semibold text-black mb-2">Customize Applications</h3>
              <p className="text-[#66615E]">AI tailors your CV and cover letter for each job</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-[#66615E] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
              <h3 className="text-lg font-semibold text-black mb-2">Track Progress</h3>
              <p className="text-[#66615E]">Monitor applications and responses in your dashboard</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-medium text-black mb-4 tracking-tight">
              Simple, Credit-Based Pricing
            </h2>
            <p className="text-xl text-[#66615E]">
              Pay only for what you use
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="border border-[#C9C8C7] rounded-lg p-8 text-center">
              <h3 className="text-2xl font-bold text-black mb-4">Starter</h3>
              <div className="text-4xl font-bold text-black mb-2">$29</div>
              <p className="text-[#66615E] mb-6">50 applications</p>
              <ul className="text-left space-y-2 mb-8">
                <li className="flex items-center text-[#66615E]">
                  <svg className="w-5 h-5 text-black mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  AI job search
                </li>
                <li className="flex items-center text-[#66615E]">
                  <svg className="w-5 h-5 text-black mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Custom CV & cover letters
                </li>
                <li className="flex items-center text-[#66615E]">
                  <svg className="w-5 h-5 text-black mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Application tracking
                </li>
              </ul>
              <Link href="/auth/signup" className="w-full bg-[#949392] hover:bg-black text-white px-6 py-3 rounded-lg font-semibold transition-colors block">
                Get Started
              </Link>
            </div>
            
            <div className="border-2 border-black rounded-lg p-8 text-center relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-black text-[#F2F0EF] px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">Professional</h3>
              <div className="text-4xl font-bold text-black mb-2">$99</div>
              <p className="text-[#66615E] mb-6">200 applications</p>
                              <ul className="text-left space-y-2 mb-8">
                  <li className="flex items-center text-[#66615E]">
                    <svg className="w-5 h-5 text-black mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Everything in Starter
                  </li>
                  <li className="flex items-center text-[#66615E]">
                    <svg className="w-5 h-5 text-black mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Daily job alerts
                  </li>
                  <li className="flex items-center text-[#66615E]">
                    <svg className="w-5 h-5 text-black mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Priority support
                  </li>
                </ul>
                <Link href="/auth/signup" className="w-full bg-black hover:bg-[#66615E] text-[#F2F0EF] px-6 py-3 rounded-lg font-semibold transition-colors block">
                  Get Started
                </Link>
            </div>
            
            <div className="border border-[#C9C8C7] rounded-lg p-8 text-center">
              <h3 className="text-2xl font-bold text-black mb-4">Enterprise</h3>
              <div className="text-4xl font-bold text-black mb-2">$299</div>
              <p className="text-[#66615E] mb-6">1000 applications</p>
              <ul className="text-left space-y-2 mb-8">
                <li className="flex items-center text-[#66615E]">
                  <svg className="w-5 h-5 text-black mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Everything in Professional
                </li>
                <li className="flex items-center text-[#66615E]">
                  <svg className="w-5 h-5 text-black mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Advanced analytics
          </li>
                <li className="flex items-center text-[#66615E]">
                  <svg className="w-5 h-5 text-black mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Custom integrations
          </li>
              </ul>
              <Link href="/auth/signup" className="w-full bg-[#949392] hover:bg-black text-white px-6 py-3 rounded-lg font-semibold transition-colors block">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-medium text-[#F2F0EF] mb-4 tracking-tight">
            Ready to Get Your Shit Together?
          </h2>
          <p className="text-xl text-[#C9C8C7] mb-8 max-w-2xl mx-auto">
            Stop wasting time on manual job applications. Let GYST do the work while you focus on preparing for interviews.
          </p>
          <Link href="/auth/signup" className="bg-[#F2F0EF] text-black hover:bg-[#C9C8C7] px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
            Start Your Job Search Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#66615E] text-[#F2F0EF] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-[#F2F0EF] rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold">G</span>
                </div>
                <span className="text-xl font-bold">GYST</span>
              </div>
              <p className="text-[#C9C8C7]">
                The AI-powered job application platform for the next generation of professionals.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-[#C9C8C7]">
                <li><a href="#features" className="hover:text-[#F2F0EF] transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-[#F2F0EF] transition-colors">How It Works</a></li>
                <li><a href="#pricing" className="hover:text-[#F2F0EF] transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-[#C9C8C7]">
                <li><a href="#" className="hover:text-[#F2F0EF] transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-[#F2F0EF] transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-[#F2F0EF] transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-[#C9C8C7]">
                <li><a href="#" className="hover:text-[#F2F0EF] transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#F2F0EF] transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-[#F2F0EF] transition-colors">Cookie Policy</a></li>
              </ul>
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

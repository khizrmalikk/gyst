import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UserMenu from "@/components/UserMenu";
import ExtensionDownloadButton from "@/components/ExtensionDownloadButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication using Clerk
  const { userId } = await auth();
  
  // Redirect to login if not authenticated
  if (!userId) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-[#F2F0EF]">
      {/* Extension Download Banner */}
      <ExtensionDownloadButton variant="banner" />
      
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-[#C9C8C7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/pages" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <span className="text-[#F2F0EF] font-bold">G</span>
                </div>
                <span className="text-xl font-bold text-black">GYST</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-[#66615E]">
                Credits: <span className="font-semibold text-black">47</span>
              </div>
              
              {/* Extension Download Button */}
              <ExtensionDownloadButton variant="navbar" />
              
              {/* User Menu Component */}
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <div className="flex">
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4">
            <nav className="space-y-2">
              <Link href="/pages" className="flex items-center px-3 py-2 text-sm font-medium text-[#66615E] rounded-md hover:bg-[#F2F0EF] hover:text-black">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m7 7 5-5 5 5M7 7l5 5 5-5" />
                </svg>
                Dashboard
              </Link>
              
              <Link href="/pages/search" className="flex items-center px-3 py-2 text-sm font-medium text-[#66615E] rounded-md hover:bg-[#F2F0EF] hover:text-black">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Job Search
              </Link>
              
              <Link href="/pages/applications" className="flex items-center px-3 py-2 text-sm font-medium text-[#66615E] rounded-md hover:bg-[#F2F0EF] hover:text-black">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Applications
              </Link>
              
              <Link href="/pages/tailored-profiles" className="flex items-center px-3 py-2 text-sm font-medium text-[#66615E] rounded-md hover:bg-[#F2F0EF] hover:text-black">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Tailored Profiles
              </Link>
              
              <Link href="/pages/profile" className="flex items-center px-3 py-2 text-sm font-medium text-[#66615E] rounded-md hover:bg-[#F2F0EF] hover:text-black">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>
              
              <Link href="/pages/integrations" className="flex items-center px-3 py-2 text-sm font-medium text-[#66615E] rounded-md hover:bg-[#F2F0EF] hover:text-black">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Integrations
              </Link>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </div>
    </div>
  );
} 
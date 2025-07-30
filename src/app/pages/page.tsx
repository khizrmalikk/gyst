"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  applications: {
    total: number;
    thisWeek: number;
    change: string;
  };
  responses: {
    total: number;
    interviews: number;
    rejections: number;
    pending: number;
  };
  credits: {
    remaining: number;
    used: number;
    plan: string;
  };
  integrations: {
    gmail: {
      connected: boolean;
      syncEnabled: boolean;
    };
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    subtitle: string;
    timestamp: string;
    status?: string;
    responseType?: string;
    icon: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/dashboard/stats', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.error || 'Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'application':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'interview':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'rejection':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'follow_up':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
    }
  };

  const getActivityIconBg = (icon: string) => {
    switch (icon) {
      case 'application':
        return 'bg-[#949392]';
      case 'interview':
        return 'bg-[#66615E]';
      case 'rejection':
        return 'bg-red-500';
      case 'follow_up':
        return 'bg-blue-500';
      default:
        return 'bg-[#C9C8C7]';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-[#66615E]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Dashboard</h1>
          <p className="text-[#66615E]">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! Here's your job search overview.
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Error loading dashboard: {error}</p>
          <Button 
            onClick={fetchDashboardStats} 
            className="mt-2 bg-red-600 hover:bg-red-700 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Dashboard</h1>
        <p className="text-[#66615E]">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! Here's your job search overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-[#C9C8C7]">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-[#C9C8C7] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-black">{stats.applications.total}</p>
              <p className="text-sm text-[#66615E]">Applications Sent</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-[#C9C8C7]">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-[#949392] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-black">{stats.responses.total}</p>
              <p className="text-sm text-[#66615E]">Responses</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-[#C9C8C7]">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-[#66615E] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-black">{stats.responses.interviews}</p>
              <p className="text-sm text-[#66615E]">Interviews</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-[#C9C8C7]">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-black">{stats.credits.remaining}</p>
              <p className="text-sm text-[#66615E]">Credits Left</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7]">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-black mb-4">Recent Activity</h2>
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className={`w-10 h-10 ${getActivityIconBg(activity.icon)} rounded-full flex items-center justify-center`}>
                    {getActivityIcon(activity.icon)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">{activity.title}</p>
                    <p className="text-xs text-[#66615E]">{activity.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-[#C9C8C7] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[#66615E]">No recent activity yet</p>
              <p className="text-sm text-[#66615E]">Start applying to jobs to see your activity here</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7]">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-black mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="p-4 h-auto border-[#C9C8C7] hover:bg-[#F2F0EF] hover:text-black"
              onClick={() => window.location.href = '/pages/search'}
            >
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-[#66615E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm font-medium text-[#66615E]">Start New Search</span>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="p-4 h-auto border-[#C9C8C7] hover:bg-[#F2F0EF] hover:text-black"
              onClick={() => window.location.href = '/pages/profile'}
            >
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-[#66615E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-[#66615E]">Update Resume</span>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="p-4 h-auto border-[#C9C8C7] hover:bg-[#F2F0EF] hover:text-black"
              onClick={() => window.location.href = '/pages/integrations'}
            >
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-[#66615E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
                <span className="text-sm font-medium text-[#66615E]">Connect Gmail</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 
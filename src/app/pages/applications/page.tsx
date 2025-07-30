'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

interface EmailData {
  count: number;
  latestEmail: {
    id: string;
    subject: string;
    sender_email: string;
    sender_name?: string;
    received_at: string;
    status_detected: string;
    confidence_score: number;
  } | null;
  hasEmails: boolean;
}

interface StatusHistory {
  count: number;
  lastChange: {
    old_status: string;
    new_status: string;
    changed_at: string;
    trigger_type: string;
  } | null;
}

interface Application {
  id: string;
  userId: string;
  jobInfo: {
    title: string;
    company: string;
    location: string;
    description?: string;
    requirements?: string[];
    salary?: string;
  };
  applicationData: {
    url: string;
    status: string;
    appliedAt: string;
    applicationMethod: string;
    cvGenerated: boolean;
    coverLetterGenerated: boolean;
    formFieldsCount: number;
    aiResponsesCount: number;
    notes?: string;
  };
  emailData: EmailData;
  statusHistory: StatusHistory;
  metadata: {
    pageTitle: string;
    pageType: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30days');
  const [emailFilter, setEmailFilter] = useState('all'); // New filter for email status
  const router = useRouter();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/applications');
      const data = await response.json();
      
      if (data.success) {
        setApplications(data.applications || []);
        console.log('📊 Applications summary:', data.summary);
      } else {
        setError('Failed to load applications');
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "interview_scheduled":
      case "interview":
        return "bg-blue-600 text-white";
      case "submitted":
        return "bg-[#949392] text-white";
      case "under_review":
        return "bg-yellow-600 text-white";
      case "applied":
        return "bg-[#C9C8C7] text-black";
      case "rejected":
        return "bg-red-600 text-white";
      case "offer_received":
      case "accepted":
        return "bg-green-600 text-white";
      case "additional_info_requested":
        return "bg-orange-600 text-white";
      default:
        return "bg-[#C9C8C7] text-black";
    }
  };

  const formatStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case "submitted":
        return "Application Sent";
      case "interview_scheduled":
        return "Interview Scheduled";
      case "interview":
        return "Interview";
      case "under_review":
        return "Under Review";
      case "additional_info_requested":
        return "Info Requested";
      case "applied":
        return "Applied";
      case "rejected":
        return "Rejected";
      case "offer_received":
        return "Offer Received";
      case "accepted":
        return "Accepted";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  const getEmailIcon = (emailData: EmailData) => {
    if (!emailData.hasEmails) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }

    // Color based on latest email status
    const latestStatus = emailData.latestEmail?.status_detected;
    let iconColor = 'text-green-600'; // Default positive

    switch (latestStatus) {
      case 'rejected':
        iconColor = 'text-red-600';
        break;
      case 'interview_scheduled':
        iconColor = 'text-blue-600';
        break;
      case 'offer_received':
        iconColor = 'text-green-600';
        break;
      case 'under_review':
        iconColor = 'text-yellow-600';
        break;
      default:
        iconColor = 'text-blue-500';
    }

    return (
      <div className="relative">
        <svg className={`w-4 h-4 ${iconColor}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {emailData.count > 1 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {emailData.count > 9 ? '9+' : emailData.count}
          </span>
        )}
      </div>
    );
  };

  const handleRowClick = (applicationId: string) => {
    router.push(`/pages/applications/${applicationId}`);
  };

  const filteredApplications = applications.filter(app => {
    if (statusFilter !== 'all' && app.applicationData.status !== statusFilter) {
      return false;
    }
    
    if (emailFilter !== 'all') {
      if (emailFilter === 'with_emails' && !app.emailData.hasEmails) {
        return false;
      }
      if (emailFilter === 'no_emails' && app.emailData.hasEmails) {
        return false;
      }
    }
    
    if (dateFilter !== 'all') {
      const appliedDate = new Date(app.applicationData.appliedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - appliedDate.getTime()) / (1000 * 3600 * 24);
      
      switch (dateFilter) {
        case '7days':
          return daysDiff <= 7;
        case '30days':
          return daysDiff <= 30;
        case '3months':
          return daysDiff <= 90;
        default:
          return true;
      }
    }
    
    return true;
  });

  // Calculate statistics
  const stats = {
    total: applications.length,
    submitted: applications.filter(app => app.applicationData.status === 'submitted').length,
    interviews: applications.filter(app => app.applicationData.status.includes('interview')).length,
    responses: applications.filter(app => app.emailData.hasEmails).length,
    withEmails: applications.filter(app => app.emailData.hasEmails).length
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-black">Applications</h1>
            <p className="text-[#66615E]">Loading your applications...</p>
          </div>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-black">Applications</h1>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <p className="text-[#66615E] mb-4">Failed to load applications</p>
            <Button onClick={fetchApplications} className="bg-black text-white hover:bg-[#66615E]">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black">Applications</h1>
          <p className="text-[#66615E]">Track all your job applications and email responses in one place</p>
        </div>
        <Button 
          onClick={() => router.push('/pages/search')}
          className="bg-black text-white hover:bg-[#66615E]"
        >
          Apply to More Jobs
        </Button>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-[#C9C8C7]">
          <div className="text-2xl font-bold text-black">{stats.total}</div>
          <div className="text-sm text-[#66615E]">Total Applications</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-[#C9C8C7]">
          <div className="text-2xl font-bold text-[#949392]">{stats.submitted}</div>
          <div className="text-sm text-[#66615E]">Submitted</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-[#C9C8C7]">
          <div className="text-2xl font-bold text-blue-600">{stats.interviews}</div>
          <div className="text-sm text-[#66615E]">Interviews</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-[#C9C8C7]">
          <div className="text-2xl font-bold text-green-600">{stats.withEmails}</div>
          <div className="text-sm text-[#66615E]">With Responses</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-[#C9C8C7]">
          <div className="text-2xl font-bold text-[#66615E]">
            {stats.total > 0 ? Math.round((stats.withEmails / stats.total) * 100) : 0}%
          </div>
          <div className="text-sm text-[#66615E]">Response Rate</div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-[#C9C8C7]">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-[#66615E] mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#C9C8C7] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="interview_scheduled">Interview Scheduled</option>
              <option value="additional_info_requested">Info Requested</option>
              <option value="offer_received">Offer Received</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#66615E] mb-1">Email Responses</label>
            <select
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="px-3 py-2 border border-[#C9C8C7] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">All Applications</option>
              <option value="with_emails">With Responses</option>
              <option value="no_emails">No Responses</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#66615E] mb-1">Date Applied</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-[#C9C8C7] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="3months">Last 3 Months</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <Button 
              onClick={fetchApplications}
              variant="outline"
              className="border-[#C9C8C7] text-[#66615E] hover:bg-[#F2F0EF]"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white shadow-sm border border-[#C9C8C7] rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-[#C9C8C7]">
          <thead className="bg-[#F2F0EF]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#66615E] uppercase tracking-wider">
                Company & Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#66615E] uppercase tracking-wider">
                Location & Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#66615E] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#66615E] uppercase tracking-wider">
                Email Responses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#66615E] uppercase tracking-wider">
                Applied Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#C9C8C7]">
            {filteredApplications.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#66615E]">
                  {applications.length === 0 ? 'No applications found. Start applying to jobs!' : 'No applications match your filters.'}
                </td>
              </tr>
            ) : (
              filteredApplications.map((app) => (
                <tr 
                  key={app.id} 
                  className="hover:bg-[#F2F0EF] cursor-pointer transition-colors"
                  onClick={() => handleRowClick(app.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-black">
                        {app.jobInfo.company}
                      </div>
                      <div className="text-sm text-[#66615E]">
                        {app.jobInfo.title}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-black">{app.jobInfo.location || 'Not specified'}</div>
                    <div className="text-sm text-[#66615E] capitalize">
                      {app.applicationData.applicationMethod.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.applicationData.status)}`}>
                      {formatStatus(app.applicationData.status)}
                    </span>
                    {app.statusHistory.count > 0 && (
                      <div className="text-xs text-[#66615E] mt-1">
                        {app.statusHistory.count} status change{app.statusHistory.count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getEmailIcon(app.emailData)}
                      <div>
                        <div className="text-sm text-black">
                          {app.emailData.hasEmails ? `${app.emailData.count} email${app.emailData.count !== 1 ? 's' : ''}` : 'No emails'}
                        </div>
                        {app.emailData.latestEmail && (
                          <div className="text-xs text-[#66615E]">
                            Latest: {new Date(app.emailData.latestEmail.received_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#66615E]">
                    {new Date(app.applicationData.appliedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
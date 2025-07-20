'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

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
  metadata: {
    pageTitle: string;
    pageType: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30days');
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
      case "interview":
        return "bg-[#66615E] text-white";
      case "submitted":
        return "bg-[#949392] text-white";
      case "applied":
        return "bg-[#C9C8C7] text-black";
      case "rejected":
        return "bg-black text-white";
      case "accepted":
        return "bg-green-600 text-white";
      default:
        return "bg-[#C9C8C7] text-black";
    }
  };

  const formatStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case "submitted":
        return "Application Sent";
      case "interview":
        return "Interview Scheduled";
      case "applied":
        return "Applied";
      case "rejected":
        return "Rejected";
      case "accepted":
        return "Accepted";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleRowClick = (applicationId: string) => {
    router.push(`/pages/applications/${applicationId}`);
  };

  const filteredApplications = applications.filter(app => {
    if (statusFilter !== 'all' && app.applicationData.status !== statusFilter) {
      return false;
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
    interviews: applications.filter(app => app.applicationData.status === 'interview').length,
    responses: applications.filter(app => ['interview', 'accepted', 'rejected'].includes(app.applicationData.status)).length
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
          <p className="text-[#66615E]">Track all your job applications in one place</p>
        </div>
        <div className="flex items-center space-x-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-[#C9C8C7] rounded-lg bg-white text-black focus:border-black"
          >
            <option value="all">All Status</option>
            <option value="submitted">Application Sent</option>
            <option value="interview">Interview Scheduled</option>
            <option value="rejected">Rejected</option>
            <option value="accepted">Accepted</option>
          </select>
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-[#C9C8C7] rounded-lg bg-white text-black focus:border-black"
          >
            <option value="30days">Last 30 days</option>
            <option value="7days">Last 7 days</option>
            <option value="3months">Last 3 months</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-[#C9C8C7]">
          <p className="text-2xl font-bold text-black">{stats.total}</p>
          <p className="text-sm text-[#66615E]">Total Applications</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-[#C9C8C7]">
          <p className="text-2xl font-bold text-[#949392]">{stats.submitted}</p>
          <p className="text-sm text-[#66615E]">Submitted</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-[#C9C8C7]">
          <p className="text-2xl font-bold text-[#66615E]">{stats.interviews}</p>
          <p className="text-sm text-[#66615E]">Interviews</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-[#C9C8C7]">
          <p className="text-2xl font-bold text-black">{stats.responses}</p>
          <p className="text-sm text-[#66615E]">Responses</p>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F2F0EF]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#66615E] uppercase tracking-wider">
                  Company & Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#66615E] uppercase tracking-wider">
                  Location & Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#66615E] uppercase tracking-wider">
                  Salary & Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#66615E] uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#66615E] uppercase tracking-wider">
                  Status
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
                      <div className="text-sm text-black">
                        {app.jobInfo.salary || 'Not specified'}
                      </div>
                      <div className="text-xs text-[#66615E] space-x-2">
                        {app.applicationData.cvGenerated && <span className="bg-blue-100 text-blue-800 px-1 rounded">CV</span>}
                        {app.applicationData.coverLetterGenerated && <span className="bg-green-100 text-green-800 px-1 rounded">CL</span>}
                        {app.applicationData.formFieldsCount > 0 && <span className="bg-gray-100 text-gray-800 px-1 rounded">{app.applicationData.formFieldsCount}F</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#66615E]">
                      {new Date(app.applicationData.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.applicationData.status)}`}>
                        {formatStatus(app.applicationData.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 
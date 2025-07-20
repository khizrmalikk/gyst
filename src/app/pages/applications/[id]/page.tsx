'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
    formData?: any[];
  };
  documents?: {
    cvUrl?: string;
    coverLetterUrl?: string;
    cvFilename?: string;
    coverLetterFilename?: string;
  };
  metadata: {
    pageTitle: string;
    pageType: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ApplicationDetailPage() {
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const applicationId = params.id as string;

  useEffect(() => {
    if (applicationId) {
      fetchApplication();
    }
  }, [applicationId]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/applications');
      const data = await response.json();
      
      if (data.success) {
        const app = data.applications?.find((a: Application) => a.id === applicationId);
        if (app) {
          setApplication(app);
        } else {
          setError('Application not found');
        }
      } else {
        setError('Failed to load application');
      }
    } catch (err) {
      console.error('Error fetching application:', err);
      setError('Failed to load application');
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-[#66615E] hover:text-black">
            ← Back
          </Button>
          <h1 className="text-3xl font-bold text-black">Loading Application...</h1>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-[#66615E] hover:text-black">
            ← Back
          </Button>
          <h1 className="text-3xl font-bold text-black">Application Not Found</h1>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <p className="text-[#66615E] mb-4">{error || 'Application not found'}</p>
            <Button onClick={() => router.push('/pages/applications')} className="bg-black text-white hover:bg-[#66615E]">
              View All Applications
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-[#66615E] hover:text-black">
            ← Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">{application.jobInfo.company}</h1>
            <p className="text-xl text-[#66615E]">{application.jobInfo.title}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(application.applicationData.status)}`}>
            {formatStatus(application.applicationData.status)}
          </span>
          <p className="text-sm text-[#66615E] mt-1">
            Applied {new Date(application.applicationData.appliedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Job Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Job Information */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[#C9C8C7]">
            <h2 className="text-xl font-semibold text-black mb-4">Job Details</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-[#66615E]">Position:</span>
                <p className="text-black">{application.jobInfo.title}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-[#66615E]">Company:</span>
                <p className="text-black">{application.jobInfo.company}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-[#66615E]">Location:</span>
                <p className="text-black">{application.jobInfo.location || 'Not specified'}</p>
              </div>
              {application.jobInfo.salary && (
                <div>
                  <span className="text-sm font-medium text-[#66615E]">Salary:</span>
                  <p className="text-black">{application.jobInfo.salary}</p>
                </div>
              )}
              {application.jobInfo.description && (
                <div>
                  <span className="text-sm font-medium text-[#66615E]">Description:</span>
                  <p className="text-black">{application.jobInfo.description}</p>
                </div>
              )}
              {application.jobInfo.requirements && application.jobInfo.requirements.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-[#66615E]">Requirements:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {application.jobInfo.requirements.map((req, index) => (
                      <span key={index} className="bg-[#F2F0EF] text-[#66615E] px-2 py-1 rounded text-sm">
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-[#66615E]">Job URL:</span>
                <a href={application.applicationData.url} target="_blank" rel="noopener noreferrer" 
                   className="text-blue-600 hover:text-blue-800 underline block truncate">
                  {application.applicationData.url}
                </a>
              </div>
            </div>
          </div>

          {/* Form Data */}
          {application.applicationData.formData && application.applicationData.formData.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[#C9C8C7]">
              <h2 className="text-xl font-semibold text-black mb-4">Form Submission Data</h2>
              <div className="space-y-3">
                {application.applicationData.formData.map((field, index) => (
                  <div key={index} className="border-b border-[#F2F0EF] pb-2">
                    <span className="text-sm font-medium text-[#66615E]">
                      {field.label || field.name}:
                    </span>
                    <p className="text-black mt-1">{field.value || 'Not filled'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {application.applicationData.notes && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[#C9C8C7]">
              <h2 className="text-xl font-semibold text-black mb-4">Notes</h2>
              <p className="text-black">{application.applicationData.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column - Application Details */}
        <div className="space-y-6">
          
          {/* Application Summary */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[#C9C8C7]">
            <h2 className="text-xl font-semibold text-black mb-4">Application Summary</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-[#66615E]">Application Method:</span>
                <p className="text-black capitalize">{application.applicationData.applicationMethod.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-[#66615E]">Applied Date:</span>
                <p className="text-black">{new Date(application.applicationData.appliedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-[#66615E]">Form Fields Filled:</span>
                <p className="text-black">{application.applicationData.formFieldsCount || 0}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-[#66615E]">AI-Generated Responses:</span>
                <p className="text-black">{application.applicationData.aiResponsesCount || 0}</p>
              </div>
            </div>
          </div>

          {/* Generated Documents */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[#C9C8C7]">
            <h2 className="text-xl font-semibold text-black mb-4">Generated Documents</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#66615E]">CV Generated:</span>
                <div className="flex items-center space-x-2">
                  {application.applicationData.cvGenerated ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Yes</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">No</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#66615E]">Cover Letter Generated:</span>
                <div className="flex items-center space-x-2">
                  {application.applicationData.coverLetterGenerated ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Yes</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">No</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Page Metadata */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[#C9C8C7]">
            <h2 className="text-xl font-semibold text-black mb-4">Page Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-[#66615E]">Page Title:</span>
                <p className="text-black text-sm">{application.metadata.pageTitle}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-[#66615E]">Page Type:</span>
                <p className="text-black capitalize">{application.metadata.pageType.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-[#66615E]">Created:</span>
                <p className="text-black text-sm">{new Date(application.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-[#66615E]">Last Updated:</span>
                <p className="text-black text-sm">{new Date(application.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[#C9C8C7]">
            <h2 className="text-xl font-semibold text-black mb-4">Actions</h2>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
                onClick={() => window.open(application.applicationData.url, '_blank')}
              >
                View Job Posting
              </Button>
              <Button 
                variant="outline" 
                className="w-full text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
                onClick={() => router.push('/pages/applications')}
              >
                Back to Applications
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  emails: Array<{
    id: string;
    subject: string;
    sender_email: string;
    sender_name?: string;
    received_at: string;
    email_snippet: string;
    status_detected: string;
    confidence_score: number;
    ai_analysis: any;
  }>;
  hasEmails: boolean;
}

interface StatusHistory {
  count: number;
  changes: Array<{
    id: string;
    old_status: string;
    new_status: string;
    changed_at: string;
    trigger_type: string;
    trigger_source?: string;
    notes?: string;
  }>;
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
    formData?: any[];
  };
  emailData: EmailData;
  statusHistory: StatusHistory;
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
  statusUpdatedAt: string;
}

export default function ApplicationDetailPage() {
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'emails' | 'history'>('details');
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

  const getEmailStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "interview_scheduled":
        return "text-blue-600 bg-blue-50";
      case "rejected":
        return "text-red-600 bg-red-50";
      case "offer_received":
        return "text-green-600 bg-green-50";
      case "under_review":
        return "text-yellow-600 bg-yellow-50";
      case "additional_info_requested":
        return "text-orange-600 bg-orange-50";
      default:
        return "text-gray-600 bg-gray-50";
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
          {application.emailData.hasEmails && (
            <p className="text-sm text-blue-600 mt-1">
              📧 {application.emailData.count} email response{application.emailData.count !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7]">
        <div className="border-b border-[#C9C8C7]">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#66615E] hover:text-black hover:border-gray-300'
              }`}
            >
              Job Details
            </button>
            <button
              onClick={() => setActiveTab('emails')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'emails'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#66615E] hover:text-black hover:border-gray-300'
              }`}
            >
              Email Responses ({application.emailData.count})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#66615E] hover:text-black hover:border-gray-300'
              }`}
            >
              Status History ({application.statusHistory.count})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Job Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Job Information */}
                <div>
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
                  <div>
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
                  <div>
                    <h2 className="text-xl font-semibold text-black mb-4">Notes</h2>
                    <p className="text-black">{application.applicationData.notes}</p>
                  </div>
                )}
              </div>

              {/* Right Column - Application Summary */}
              <div className="space-y-6">
                {/* Application Summary */}
                <div className="bg-[#F2F0EF] p-4 rounded-lg">
                  <h2 className="text-lg font-semibold text-black mb-3">Application Summary</h2>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-[#66615E]">Method:</span>
                      <p className="text-black capitalize">{application.applicationData.applicationMethod.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-[#66615E]">Applied:</span>
                      <p className="text-black">{new Date(application.applicationData.appliedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-[#66615E]">Form Fields:</span>
                      <p className="text-black">{application.applicationData.formFieldsCount || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-[#66615E]">AI Responses:</span>
                      <p className="text-black">{application.applicationData.aiResponsesCount || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="bg-[#F2F0EF] p-4 rounded-lg">
                  <h2 className="text-lg font-semibold text-black mb-3">Generated Documents</h2>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#66615E]">CV Generated:</span>
                      {application.applicationData.cvGenerated ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Yes</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">No</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#66615E]">Cover Letter:</span>
                      {application.applicationData.coverLetterGenerated ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Yes</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">No</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
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
          )}

          {activeTab === 'emails' && (
            <div>
              <h2 className="text-xl font-semibold text-black mb-4">Email Responses</h2>
              {application.emailData.hasEmails ? (
                <div className="space-y-4">
                  {application.emailData.emails.map((email, index) => (
                    <div key={email.id} className="border border-[#C9C8C7] rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-black">{email.subject}</h3>
                          <p className="text-sm text-[#66615E]">
                            From: {email.sender_name || email.sender_email}
                          </p>
                          <p className="text-xs text-[#66615E]">
                            {new Date(email.received_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getEmailStatusColor(email.status_detected)}`}>
                            {formatStatus(email.status_detected)}
                          </span>
                          <span className="text-xs text-[#66615E]">
                            {Math.round(email.confidence_score * 100)}% confidence
                          </span>
                        </div>
                      </div>
                      <div className="bg-[#F2F0EF] p-3 rounded text-sm text-black">
                        {email.email_snippet}
                      </div>
                      {email.ai_analysis?.keywords && (
                        <div className="mt-2">
                          <span className="text-xs text-[#66615E]">Keywords:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {email.ai_analysis.keywords.map((keyword: string, i: number) => (
                              <span key={i} className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-[#C9C8C7] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-[#66615E]">No email responses found</p>
                  <p className="text-sm text-[#66615E]">Connect your Gmail account to automatically track responses</p>
                  <Button 
                    onClick={() => router.push('/pages/integrations')}
                    className="mt-4 bg-black text-white hover:bg-[#66615E]"
                  >
                    Connect Gmail
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h2 className="text-xl font-semibold text-black mb-4">Status History</h2>
              {application.statusHistory.count > 0 ? (
                <div className="space-y-4">
                  {application.statusHistory.changes.map((change, index) => (
                    <div key={change.id} className="flex items-start space-x-4 pb-4 border-b border-[#C9C8C7] last:border-b-0">
                      <div className="flex-shrink-0 w-2 h-2 bg-black rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {change.old_status && (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(change.old_status)}`}>
                              {formatStatus(change.old_status)}
                            </span>
                          )}
                          <span className="text-[#66615E]">→</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(change.new_status)}`}>
                            {formatStatus(change.new_status)}
                          </span>
                        </div>
                        <p className="text-sm text-[#66615E]">
                          {new Date(change.changed_at).toLocaleString()}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            change.trigger_type === 'email' ? 'bg-blue-100 text-blue-800' :
                            change.trigger_type === 'manual' ? 'bg-gray-100 text-gray-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {change.trigger_type === 'email' ? '📧 Email' : 
                             change.trigger_type === 'manual' ? '👤 Manual' : 
                             '🤖 System'}
                          </span>
                        </div>
                        {change.notes && (
                          <p className="text-sm text-black mt-2 bg-[#F2F0EF] p-2 rounded">
                            {change.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-[#C9C8C7] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <p className="text-[#66615E]">No status changes recorded</p>
                  <p className="text-sm text-[#66615E]">Status changes will appear here as your application progresses</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
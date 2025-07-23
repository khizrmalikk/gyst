'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface TailoredProfile {
  id: string;
  label: string;
  company_name: string;
  job_title: string;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  job_description: string;
  job_requirements: string[];
  job_url: string;
  tailored_data: {
    name: string;
    email: string;
    summary: string;
    skills: string[];
    workHistory: WorkHistoryItem[];
    education: Education;
    certifications: Certification[];
    languages: Language[];
  };
}

interface WorkHistoryItem {
  id?: string;
  position: string;
  company: string;
  startDate: string;
  endDate: string | null;
  description: string;
}

interface Education {
  id?: string;
  degree: string;
  institution: string;
  year: string;
  field: string;
}

interface Certification {
  id?: string;
  name: string;
  issuer: string;
  date: string;
}

interface Language {
  id?: string;
  name: string;
  proficiency: string;
}

export default function TailoredProfilesPage() {
  const { isLoaded, userId } = useAuth();
  const [profiles, setProfiles] = useState<TailoredProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<TailoredProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'last_used_at' | 'company_name'>('created_at');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<TailoredProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load tailored profiles
  useEffect(() => {
    if (isLoaded && userId) {
      loadTailoredProfiles();
    }
  }, [isLoaded, userId]);

  const loadTailoredProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/tailored-profiles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to load profiles: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProfiles(data.profiles || []);
      } else {
        throw new Error(data.error || 'Failed to load tailored profiles');
      }
    } catch (error) {
      console.error('Error loading tailored profiles:', error);
      setError(error instanceof Error ? error.message : 'Failed to load tailored profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (profile: TailoredProfile) => {
    try {
      const response = await fetch(`/api/tailored-profiles/${profile.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete profile');
      }

      // Remove from local state
      setProfiles(prev => prev.filter(p => p.id !== profile.id));
      setShowDeleteModal(false);
      setProfileToDelete(null);
      
      if (selectedProfile?.id === profile.id) {
        setSelectedProfile(null);
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      setError('Failed to delete profile');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never used';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Filter and sort profiles
  const filteredProfiles = profiles
    .filter(profile => 
      profile.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'last_used_at':
          const aDate = a.last_used_at ? new Date(a.last_used_at) : new Date(0);
          const bDate = b.last_used_at ? new Date(b.last_used_at) : new Date(0);
          return bDate.getTime() - aDate.getTime();
        case 'company_name':
          return a.company_name.localeCompare(b.company_name);
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#66615E]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F0EF]">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-black mb-2">Tailored Profiles</h1>
          <p className="text-[#66615E] text-lg">
            Manage your job-specific profile variations. You can create up to 10 tailored profiles.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-[#66615E] bg-opacity-10">
                <svg className="w-6 h-6 text-[#66615E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[#66615E]">Total Profiles</p>
                <p className="text-2xl font-semibold text-black">{profiles.length}/10</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[#66615E]">Recently Used</p>
                <p className="text-2xl font-semibold text-black">
                  {profiles.filter(p => p.last_used_at && 
                    new Date(p.last_used_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[#66615E]">Most Used Company</p>
                <p className="text-lg font-semibold text-black">
                  {profiles.length > 0 
                    ? (() => {
                        const companies = profiles.reduce((acc, profile) => {
                          acc[profile.company_name] = (acc[profile.company_name] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>);
                        const sortedCompanies = Object.entries(companies).sort(([,a], [,b]) => b - a);
                        return sortedCompanies[0]?.[0] || 'None';
                      })()
                    : 'None'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[#66615E]">Available Slots</p>
                <p className="text-2xl font-semibold text-black">{10 - profiles.length}</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profiles List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              {/* Search and Sort */}
              <div className="p-6 border-b border-[#C9C8C7]">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search profiles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-[#C9C8C7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66615E] focus:border-transparent"
                    />
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'created_at' | 'last_used_at' | 'company_name')}
                    className="px-4 py-2 border border-[#C9C8C7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66615E] focus:border-transparent"
                  >
                    <option value="created_at">Sort by Created</option>
                    <option value="last_used_at">Sort by Last Used</option>
                    <option value="company_name">Sort by Company</option>
                  </select>
                </div>
              </div>

              {/* Profiles List */}
              <div className="divide-y divide-[#C9C8C7]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#66615E]"></div>
                  </div>
                ) : filteredProfiles.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[#F2F0EF] rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#949392]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-black mb-2">No Tailored Profiles</h3>
                    <p className="text-[#66615E] mb-4">
                      {searchQuery 
                        ? `No profiles match "${searchQuery}"`
                        : "You haven't created any tailored profiles yet."
                      }
                    </p>
                    <p className="text-sm text-[#949392]">
                      Use the Chrome extension to create tailored profiles while browsing job postings.
                    </p>
                  </div>
                ) : (
                  filteredProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile)}
                      className={`p-6 cursor-pointer hover:bg-[#F2F0EF] transition-colors ${
                        selectedProfile?.id === profile.id ? 'bg-[#F2F0EF] border-l-4 border-[#66615E]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-black">{profile.company_name}</h3>
                            <span className="text-[#949392]">•</span>
                            <span className="text-[#66615E]">{profile.job_title}</span>
                          </div>
                          <p className="text-sm text-[#949392] mb-2">
                            Label: {profile.label}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-[#949392]">
                            <span>Created {formatDate(profile.created_at)}</span>
                            <span>•</span>
                            <span>Last used {formatRelativeTime(profile.last_used_at)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfileToDelete(profile);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              {selectedProfile ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-black">Profile Details</h2>
                    <button
                      onClick={() => setSelectedProfile(null)}
                      className="text-[#949392] hover:text-black"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Job Info */}
                    <div>
                      <h3 className="font-semibold text-black mb-3">Job Information</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-[#949392]">Company:</span>
                          <p className="text-black">{selectedProfile.company_name}</p>
                        </div>
                        <div>
                          <span className="text-sm text-[#949392]">Position:</span>
                          <p className="text-black">{selectedProfile.job_title}</p>
                        </div>
                        <div>
                          <span className="text-sm text-[#949392]">Label:</span>
                          <p className="text-black font-mono text-sm">{selectedProfile.label}</p>
                        </div>
                        {selectedProfile.job_url && (
                          <div>
                            <span className="text-sm text-[#949392]">Job URL:</span>
                            <a
                              href={selectedProfile.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm break-all"
                            >
                              View Original Posting
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Profile Summary */}
                    <div>
                      <h3 className="font-semibold text-black mb-3">Tailored Summary</h3>
                      <p className="text-sm text-[#66615E] leading-relaxed">
                        {selectedProfile.tailored_data.summary}
                      </p>
                    </div>

                    {/* Skills */}
                    <div>
                      <h3 className="font-semibold text-black mb-3">Key Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfile.tailored_data.skills?.slice(0, 8).map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-[#F2F0EF] text-[#66615E] rounded-full text-sm"
                          >
                            {skill}
                          </span>
                        ))}
                        {selectedProfile.tailored_data.skills?.length > 8 && (
                          <span className="px-3 py-1 bg-[#C9C8C7] text-[#66615E] rounded-full text-sm">
                            +{selectedProfile.tailored_data.skills.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Usage Stats */}
                    <div>
                      <h3 className="font-semibold text-black mb-3">Usage Statistics</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#949392]">Created:</span>
                          <span className="text-black">{formatDate(selectedProfile.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#949392]">Last Updated:</span>
                          <span className="text-black">{formatDate(selectedProfile.updated_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#949392]">Last Used:</span>
                          <span className="text-black">{formatRelativeTime(selectedProfile.last_used_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Requirements */}
                    {selectedProfile.job_requirements && selectedProfile.job_requirements.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-black mb-3">Job Requirements</h3>
                        <ul className="space-y-1 text-sm text-[#66615E]">
                          {selectedProfile.job_requirements.slice(0, 5).map((req, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-[#949392] mr-2">•</span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#F2F0EF] rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#949392]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-black mb-2">Select a Profile</h3>
                  <p className="text-[#66615E]">
                    Click on a profile from the list to view its details.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && profileToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black">Delete Tailored Profile</h3>
            </div>
            
            <p className="text-[#66615E] mb-6">
              Are you sure you want to delete the tailored profile for <strong>{profileToDelete.company_name}</strong> - <strong>{profileToDelete.job_title}</strong>? This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-[#66615E] hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProfile(profileToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
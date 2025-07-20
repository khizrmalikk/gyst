'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { UserProfile, Education, Experience, Certification, Language } from '@/lib/supabase'

export default function ProfilePage() {
  const { user } = useUser()
  
  // State management
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [education, setEducation] = useState<Education[]>([])
  const [experience, setExperience] = useState<Experience[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    portfolio_url: '',
    website_url: '',
    ethnicity: '',
    gender: '',
    additional_information: '',
    skills: [] as string[]
  })

  // CV Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(false)

  // Modal states
  const [showEducationModal, setShowEducationModal] = useState(false)
  const [showExperienceModal, setShowExperienceModal] = useState(false)
  const [showCertificationModal, setShowCertificationModal] = useState(false)
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [showCVUploadModal, setShowCVUploadModal] = useState(false)

  // Edit item states
  const [editingEducation, setEditingEducation] = useState<Education | null>(null)
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null)
  const [editingCertification, setEditingCertification] = useState<Certification | null>(null)
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null)

  // Load profile data
  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load profile
      const profileResponse = await fetch('/api/profile')
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfile(profileData)
        setEditForm({
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          linkedin_url: profileData.linkedin_url || '',
          portfolio_url: profileData.portfolio_url || '',
          website_url: profileData.website_url || '',
          ethnicity: profileData.ethnicity || '',
          gender: profileData.gender || '',
          additional_information: profileData.additional_information || '',
          skills: profileData.skills || []
        })
      }

      // Load education
      const educationResponse = await fetch('/api/profile/education')
      if (educationResponse.ok) {
        const educationData = await educationResponse.json()
        setEducation(educationData)
      }

      // Load experience
      const experienceResponse = await fetch('/api/profile/experience')
      if (experienceResponse.ok) {
        const experienceData = await experienceResponse.json()
        setExperience(experienceData)
      }

      // You can add similar calls for certifications and languages when those endpoints are ready

    } catch (err) {
      setError('Failed to load profile data')
      console.error('Error loading profile:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      setIsEditing(false)
      setSuccess('Profile updated successfully!')
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/profile/cv-upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload CV')
      }

      const result = await response.json()
      setSuccess('CV uploaded and processed successfully! Your profile has been updated with the extracted information.')
      setShowCVUploadModal(false)
      
      // Reload profile data
      await loadProfileData()
      
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload CV')
    } finally {
      setIsUploading(false)
      setUploadProgress(false)
    }
  }

  const handleSkillAdd = (skill: string) => {
    if (skill.trim() && !editForm.skills.includes(skill.trim())) {
      setEditForm(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }))
    }
  }

  const handleSkillRemove = (skillToRemove: string) => {
    setEditForm(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  // Helper functions for delete operations
  const handleDeleteEducation = async (id: string) => {
    try {
      const response = await fetch(`/api/profile/education/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete education')
      }

      // Reload data after deletion
      loadProfileData()
    } catch (err) {
      console.error('Error deleting education:', err)
    }
  }

  const handleDeleteExperience = async (id: string) => {
    try {
      const response = await fetch(`/api/profile/experience/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete experience')
      }

      // Reload data after deletion
      loadProfileData()
    } catch (err) {
      console.error('Error deleting experience:', err)
    }
  }

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F0EF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-[#66615E]">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black">Profile</h1>
          <p className="text-[#66615E]">Manage your personal information and career details</p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={showCVUploadModal} onOpenChange={setShowCVUploadModal}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
              >
                Upload CV
              </Button>
            </DialogTrigger>
            <CVUploadModal
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              onFileUpload={handleCVUpload}
              onClose={() => setShowCVUploadModal(false)}
            />
          </Dialog>
          
        <Button
            onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
            disabled={isLoading}
            className="bg-black hover:bg-[#66615E] text-white"
        >
            {isEditing ? 'Save Changes' : 'Edit Profile'}
        </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7] p-6">
        <div className="flex items-center space-x-4">
          <img 
            src={user?.imageUrl || "/default-avatar.png"} 
            alt="Profile" 
            className="w-20 h-20 rounded-full border-2 border-[#C9C8C7]"
          />
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-black">
              {profile?.full_name || user?.fullName || "Welcome!"}
            </h2>
            <p className="text-[#66615E]">
              {profile?.location || 'Location not specified'}
            </p>
            <div className="flex items-center space-x-4 mt-2">
              {profile?.profile_complete ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Profile Complete
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Profile Incomplete
                </span>
              )}
              {profile?.cv_uploaded && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  CV Uploaded
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7] p-6">
        <h3 className="text-xl font-semibold text-black mb-4">Personal Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-[#66615E] mb-1">Full Name</Label>
            {isEditing ? (
              <Input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
              />
            ) : (
              <p className="text-black">{profile?.full_name || 'Not specified'}</p>
            )}
          </div>

          <div>
            <Label className="text-[#66615E] mb-1">Email</Label>
            <p className="text-black">{profile?.email || user?.primaryEmailAddress?.emailAddress}</p>
            <p className="text-xs text-[#66615E] mt-1">Email is managed by your account settings</p>
          </div>

          <div>
            <Label className="text-[#66615E] mb-1">Phone</Label>
            {isEditing ? (
              <Input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
              />
            ) : (
              <p className="text-black">{profile?.phone || 'Not specified'}</p>
            )}
          </div>

          <div>
            <Label className="text-[#66615E] mb-1">Location</Label>
            {isEditing ? (
              <Input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
                placeholder="City, Country"
              />
            ) : (
              <p className="text-black">{profile?.location || 'Not specified'}</p>
            )}
          </div>

          <div>
            <Label className="text-[#66615E] mb-1">LinkedIn URL</Label>
            {isEditing ? (
              <Input
                type="url"
                value={editForm.linkedin_url}
                onChange={(e) => setEditForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            ) : (
              <p className="text-black">
                {profile?.linkedin_url ? (
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {profile.linkedin_url}
                  </a>
                ) : (
                  'Not specified'
                )}
              </p>
            )}
          </div>

          <div>
            <Label className="text-[#66615E] mb-1">Portfolio URL</Label>
            {isEditing ? (
              <Input
                type="url"
                value={editForm.portfolio_url}
                onChange={(e) => setEditForm(prev => ({ ...prev, portfolio_url: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
                placeholder="https://yourportfolio.com"
              />
            ) : (
              <p className="text-black">
                {profile?.portfolio_url ? (
                  <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {profile.portfolio_url}
                  </a>
                ) : (
                  'Not specified'
                )}
              </p>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 pt-6 border-t border-[#C9C8C7]">
            <h4 className="text-lg font-medium text-black mb-4">Optional Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-[#66615E] mb-1">Website URL</Label>
                <Input
                  type="url"
                  value={editForm.website_url}
                  onChange={(e) => setEditForm(prev => ({ ...prev, website_url: e.target.value }))}
                  className="border-[#C9C8C7] focus:border-black focus:ring-black"
                />
              </div>

              <div>
                <Label className="text-[#66615E] mb-1">Ethnicity</Label>
                <Input
                  type="text"
                  value={editForm.ethnicity}
                  onChange={(e) => setEditForm(prev => ({ ...prev, ethnicity: e.target.value }))}
                  className="border-[#C9C8C7] focus:border-black focus:ring-black"
                />
              </div>

              <div>
                <Label className="text-[#66615E] mb-1">Gender</Label>
                <Input
                  type="text"
                  value={editForm.gender}
                  onChange={(e) => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                  className="border-[#C9C8C7] focus:border-black focus:ring-black"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-[#66615E] mb-1">Additional Information</Label>
                <textarea
                  value={editForm.additional_information}
                  onChange={(e) => setEditForm(prev => ({ ...prev, additional_information: e.target.value }))}
                  className="w-full min-h-[100px] px-3 py-2 border border-[#C9C8C7] rounded-md focus:border-black focus:ring-black"
                  placeholder="Any additional information you'd like to share..."
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7] p-6">
        <h3 className="text-xl font-semibold text-black mb-4">Skills</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {(isEditing ? editForm.skills : profile?.skills || []).map((skill, index) => (
            <span key={index} className="inline-flex items-center px-3 py-1 bg-[#F2F0EF] text-black rounded-full text-sm border border-[#C9C8C7]">
              {skill}
              {isEditing && (
                <button
                  onClick={() => handleSkillRemove(skill)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        {isEditing && (
            <Input
              type="text"
              placeholder="Add a skill and press Enter"
              className="border-[#C9C8C7] focus:border-black focus:ring-black"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                const newSkill = e.currentTarget.value.trim()
                if (newSkill) {
                  handleSkillAdd(newSkill)
                  e.currentTarget.value = ''
                  }
                }
              }}
            />
        )}
      </div>

      {/* Education */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7] p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-black">Education</h3>
          <Button
            onClick={() => {
              setEditingEducation(null)
              setShowEducationModal(true)
            }}
            variant="outline"
            className="text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
          >
            Add Education
          </Button>
        </div>
        
        {education.length === 0 ? (
          <p className="text-[#66615E] text-center py-8">No education records added yet.</p>
        ) : (
          <div className="space-y-4">
            {education.map((edu) => (
              <EducationCard 
                key={edu.id} 
                education={edu}
                onEdit={(edu) => {
                  setEditingEducation(edu)
                  setShowEducationModal(true)
                }}
                onDelete={(id) => handleDeleteEducation(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Experience */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7] p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-black">Experience</h3>
          <Button
            onClick={() => {
              setEditingExperience(null)
              setShowExperienceModal(true)
            }}
            variant="outline"
            className="text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
          >
            Add Experience
          </Button>
        </div>
        
        {experience.length === 0 ? (
          <p className="text-[#66615E] text-center py-8">No experience records added yet.</p>
        ) : (
          <div className="space-y-4">
            {experience.map((exp) => (
              <ExperienceCard 
                key={exp.id} 
                experience={exp}
                onEdit={(exp) => {
                  setEditingExperience(exp)
                  setShowExperienceModal(true)
                }}
                onDelete={(id) => handleDeleteExperience(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <EducationModal
        open={showEducationModal}
        onClose={() => setShowEducationModal(false)}
        education={editingEducation}
        onSave={() => {
          setShowEducationModal(false)
          loadProfileData()
        }}
      />

      <ExperienceModal
        open={showExperienceModal}
        onClose={() => setShowExperienceModal(false)}
        experience={editingExperience}
        onSave={() => {
          setShowExperienceModal(false)
          loadProfileData()
        }}
      />
    </div>
  )
}

// Component types
interface CVUploadModalProps {
  isUploading: boolean
  uploadProgress: boolean
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onClose: () => void
}

interface EducationCardProps {
  education: Education
  onEdit: (education: Education) => void
  onDelete: (id: string) => void
}

interface ExperienceCardProps {
  experience: Experience
  onEdit: (experience: Experience) => void
  onDelete: (id: string) => void
}

interface EducationModalProps {
  open: boolean
  onClose: () => void
  education: Education | null
  onSave: () => void
}

interface ExperienceModalProps {
  open: boolean
  onClose: () => void
  experience: Experience | null
  onSave: () => void
}

// CV Upload Modal Component
const CVUploadModal = ({ isUploading, uploadProgress, onFileUpload, onClose }: CVUploadModalProps) => (
  <DialogContent className="bg-white">
    <DialogHeader>
      <DialogTitle className="text-black">Upload CV</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <p className="text-[#66615E]">Upload your CV to automatically update your profile with extracted information.</p>
      
      <div className="border-2 border-dashed border-[#C9C8C7] rounded-lg p-8 text-center">
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={onFileUpload}
          className="hidden"
          id="cv-upload-modal"
          disabled={isUploading}
        />
        <label
          htmlFor="cv-upload-modal"
          className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="w-16 h-16 bg-[#F2F0EF] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#66615E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-lg font-medium text-black mb-2">
            {uploadProgress ? 'Processing CV...' : 'Click to upload your CV'}
          </p>
          <p className="text-[#66615E] text-sm">
            PDF, DOC, or DOCX files up to 5MB
          </p>
        </label>
      </div>
    </div>
  </DialogContent>
)

// Education Card Component
const EducationCard = ({ education, onEdit, onDelete }: EducationCardProps) => (
  <div className="border border-[#C9C8C7] rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <h4 className="text-lg font-medium text-black">{education.degree} in {education.field_of_study}</h4>
        <p className="text-[#66615E]">{education.institution}</p>
        <p className="text-sm text-[#66615E]">
          {education.start_date} - {education.is_current ? 'Present' : education.end_date}
        </p>
        {education.gpa && <p className="text-sm text-[#66615E]">GPA: {education.gpa}</p>}
        {education.description && <p className="text-sm text-black mt-2">{education.description}</p>}
      </div>
      <div className="flex space-x-2">
        <Button
          onClick={() => onEdit(education)}
          variant="outline"
          size="sm"
          className="text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
        >
          Edit
        </Button>
        <Button
          onClick={() => onDelete(education.id)}
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Delete
        </Button>
      </div>
    </div>
  </div>
)

// Experience Card Component
const ExperienceCard = ({ experience, onEdit, onDelete }: ExperienceCardProps) => (
  <div className="border border-[#C9C8C7] rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <h4 className="text-lg font-medium text-black">{experience.position}</h4>
        <p className="text-[#66615E]">{experience.company}</p>
        {experience.location && <p className="text-sm text-[#66615E]">{experience.location}</p>}
        <p className="text-sm text-[#66615E]">
          {experience.start_date} - {experience.is_current ? 'Present' : experience.end_date}
        </p>
        <p className="text-sm text-black mt-2">{experience.description}</p>
        {experience.skills_used && experience.skills_used.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {experience.skills_used.map((skill: string, index: number) => (
              <span key={index} className="px-2 py-1 bg-[#F2F0EF] text-xs rounded text-black border border-[#C9C8C7]">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex space-x-2">
        <Button
          onClick={() => onEdit(experience)}
          variant="outline"
          size="sm"
          className="text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
        >
          Edit
        </Button>
        <Button
          onClick={() => onDelete(experience.id)}
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Delete
        </Button>
      </div>
    </div>
  </div>
)

// Education Modal Component
const EducationModal = ({ open, onClose, education, onSave }: EducationModalProps) => {
  const [formData, setFormData] = useState({
    institution: '',
    degree: '',
    field_of_study: '',
    start_date: '',
    end_date: '',
    gpa: '',
    description: '',
    is_current: false
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (education) {
      setFormData({
        institution: education.institution || '',
        degree: education.degree || '',
        field_of_study: education.field_of_study || '',
        start_date: education.start_date || '',
        end_date: education.end_date || '',
        gpa: education.gpa || '',
        description: education.description || '',
        is_current: education.is_current || false
      })
    } else {
      setFormData({
        institution: '',
        degree: '',
        field_of_study: '',
        start_date: '',
        end_date: '',
        gpa: '',
        description: '',
        is_current: false
      })
    }
  }, [education, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const url = education 
        ? `/api/profile/education/${education.id}`
        : '/api/profile/education'
      
      const method = education ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save education')
      }

      onSave()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save education')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-black">
            {education ? 'Edit Education' : 'Add Education'}
          </DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#66615E]">Institution</Label>
              <Input
                required
                value={formData.institution}
                onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
              />
            </div>
          <div>
              <Label className="text-[#66615E]">Degree</Label>
              <Input
                required
                value={formData.degree}
                onChange={(e) => setFormData(prev => ({ ...prev, degree: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
              />
            </div>
          </div>

          <div>
            <Label className="text-[#66615E]">Field of Study</Label>
            <Input
              required
              value={formData.field_of_study}
              onChange={(e) => setFormData(prev => ({ ...prev, field_of_study: e.target.value }))}
              className="border-[#C9C8C7] focus:border-black focus:ring-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#66615E]">Start Date</Label>
              <Input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
              />
            </div>
            <div>
              <Label className="text-[#66615E]">End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
                disabled={formData.is_current}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_current"
              checked={formData.is_current}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                is_current: e.target.checked,
                end_date: e.target.checked ? '' : prev.end_date
              }))}
              className="rounded border-[#C9C8C7]"
            />
            <Label htmlFor="is_current" className="text-[#66615E]">Currently studying here</Label>
          </div>

          <div>
            <Label className="text-[#66615E]">GPA (optional)</Label>
            <Input
              value={formData.gpa}
              onChange={(e) => setFormData(prev => ({ ...prev, gpa: e.target.value }))}
              className="border-[#C9C8C7] focus:border-black focus:ring-black"
              placeholder="e.g., 3.8"
            />
          </div>

          <div>
            <Label className="text-[#66615E]">Description (optional)</Label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full min-h-[100px] px-3 py-2 border border-[#C9C8C7] rounded-md focus:border-black focus:ring-black"
              placeholder="Describe your studies, achievements, or relevant coursework..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-black hover:bg-[#66615E] text-white"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Experience Modal Component
const ExperienceModal = ({ open, onClose, experience, onSave }: ExperienceModalProps) => {
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    location: '',
    start_date: '',
    end_date: '',
    description: '',
    skills_used: [] as string[],
    is_current: false
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skillInput, setSkillInput] = useState('')

  useEffect(() => {
    if (experience) {
      setFormData({
        company: experience.company || '',
        position: experience.position || '',
        location: experience.location || '',
        start_date: experience.start_date || '',
        end_date: experience.end_date || '',
        description: experience.description || '',
        skills_used: experience.skills_used || [],
        is_current: experience.is_current || false
      })
    } else {
      setFormData({
        company: '',
        position: '',
        location: '',
        start_date: '',
        end_date: '',
        description: '',
        skills_used: [],
        is_current: false
      })
    }
  }, [experience, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const url = experience 
        ? `/api/profile/experience/${experience.id}`
        : '/api/profile/experience'
      
      const method = experience ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save experience')
      }

      onSave()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save experience')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills_used.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills_used: [...prev.skills_used, skillInput.trim()]
      }))
      setSkillInput('')
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills_used: prev.skills_used.filter(skill => skill !== skillToRemove)
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-black">
            {experience ? 'Edit Experience' : 'Add Experience'}
          </DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#66615E]">Company</Label>
              <Input
                required
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
              />
            </div>
            <div>
              <Label className="text-[#66615E]">Position</Label>
              <Input
                required
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
              />
            </div>
          </div>

          <div>
            <Label className="text-[#66615E]">Location (optional)</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="border-[#C9C8C7] focus:border-black focus:ring-black"
              placeholder="City, Country"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#66615E]">Start Date</Label>
              <Input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
              />
          </div>
            <div>
              <Label className="text-[#66615E]">End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
                disabled={formData.is_current}
              />
        </div>
      </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_current_exp"
              checked={formData.is_current}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                is_current: e.target.checked,
                end_date: e.target.checked ? '' : prev.end_date
              }))}
              className="rounded border-[#C9C8C7]"
            />
            <Label htmlFor="is_current_exp" className="text-[#66615E]">Currently working here</Label>
          </div>

          <div>
            <Label className="text-[#66615E]">Description</Label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full min-h-[120px] px-3 py-2 border border-[#C9C8C7] rounded-md focus:border-black focus:ring-black"
              placeholder="Describe your responsibilities, achievements, and key contributions..."
            />
          </div>

          <div>
            <Label className="text-[#66615E]">Skills Used (optional)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.skills_used.map((skill, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 bg-[#F2F0EF] text-sm rounded border border-[#C9C8C7]">
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-1 text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </span>
              ))}
        </div>
            <div className="flex space-x-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                className="border-[#C9C8C7] focus:border-black focus:ring-black"
                placeholder="Add a skill"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSkill()
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddSkill}
                variant="outline"
                className="text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
              >
                Add
          </Button>
        </div>
      </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-black hover:bg-[#66615E] text-white"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
    </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 
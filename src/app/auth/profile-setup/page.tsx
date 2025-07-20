'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function ProfileSetupPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState<'choice' | 'upload' | 'manual'>('choice')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
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
    skills: '' // Will be split into array
  })

  // Check if user is loaded and redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/auth/login')
    }
  }, [isLoaded, user, router])

  // Pre-fill form with user data if available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        full_name: user.fullName || '',
        email: user.primaryEmailAddress?.emailAddress || ''
      }))
    }
  }, [user])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setUploadProgress(true)
    setError(null)
    setSuccess(null)

    try {
      // First create a basic profile
      const profileResponse = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: user?.fullName || 'Unknown',
          email: user?.primaryEmailAddress?.emailAddress || 'unknown@example.com',
          profile_complete: false,
          cv_uploaded: false
        })
      })

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json()
        // If profile already exists, that's fine
        if (errorData.error !== 'Profile already exists') {
          throw new Error(errorData.error || 'Failed to create profile')
        }
      }

      // Upload and parse CV
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
      setSuccess('CV uploaded and processed successfully! Your profile has been populated with the extracted information.')
      
      // Redirect to profile page after a short delay
      setTimeout(() => {
        router.push('/pages/profile')
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setUploadProgress(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate required fields
      if (!formData.full_name || !formData.email) {
        throw new Error('Full name and email are required')
      }

      // Create profile with manual data
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          skills: formData.skills.split(',').map(skill => skill.trim()).filter(Boolean),
          profile_complete: true,
          cv_uploaded: false
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create profile')
      }

      setSuccess('Profile created successfully!')
      
      // Redirect to main app
      setTimeout(() => {
        router.push('/pages/search')
      }, 1500)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    // Create minimal profile and redirect
    const createMinimalProfile = async () => {
      try {
        await fetch('/api/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: user?.fullName || 'Unknown',
            email: user?.primaryEmailAddress?.emailAddress || 'unknown@example.com',
            profile_complete: false,
            cv_uploaded: false
          })
        })
      } catch (err) {
        console.error('Failed to create minimal profile:', err)
      }
    }

    createMinimalProfile()
    router.push('/pages/search')
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F0EF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-[#66615E]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F0EF] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg border border-[#C9C8C7] p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">Complete Your Profile</h1>
            <p className="text-[#66615E]">
              Let's set up your profile to help you find the perfect job opportunities
            </p>
          </div>

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          {currentStep === 'choice' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className="p-6 border-2 border-[#C9C8C7] rounded-lg cursor-pointer hover:border-black transition-colors"
                  onClick={() => setCurrentStep('upload')}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-black mb-2">Upload CV</h3>
                    <p className="text-[#66615E] text-sm">
                      Upload your existing CV and we'll automatically extract your information
                    </p>
                  </div>
                </div>

                <div 
                  className="p-6 border-2 border-[#C9C8C7] rounded-lg cursor-pointer hover:border-black transition-colors"
                  onClick={() => setCurrentStep('manual')}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-black mb-2">Fill Manually</h3>
                    <p className="text-[#66615E] text-sm">
                      Enter your information manually using our guided form
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
                >
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-black mb-2">Upload Your CV</h2>
                <p className="text-[#66615E]">
                  We support PDF and Word documents (max 5MB)
                </p>
              </div>

              <div className="border-2 border-dashed border-[#C9C8C7] rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleCVUpload}
                  className="hidden"
                  id="cv-upload"
                  disabled={isLoading}
                />
                <label
                  htmlFor="cv-upload"
                  className={`cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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

              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('choice')}
                  disabled={isLoading}
                  className="text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'manual' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-black mb-2">Enter Your Information</h2>
                <p className="text-[#66615E]">
                  Fill in your details to complete your profile
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name" className="text-[#66615E]">Full Name *</Label>
                    <Input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      className="border-[#C9C8C7] focus:border-black focus:ring-black"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-[#66615E]">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="border-[#C9C8C7] focus:border-black focus:ring-black"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-[#66615E]">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="border-[#C9C8C7] focus:border-black focus:ring-black"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location" className="text-[#66615E]">Location</Label>
                    <Input
                      id="location"
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="border-[#C9C8C7] focus:border-black focus:ring-black"
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="linkedin_url" className="text-[#66615E]">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      type="url"
                      value={formData.linkedin_url}
                      onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                      className="border-[#C9C8C7] focus:border-black focus:ring-black"
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>

                  <div>
                    <Label htmlFor="portfolio_url" className="text-[#66615E]">Portfolio URL</Label>
                    <Input
                      id="portfolio_url"
                      type="url"
                      value={formData.portfolio_url}
                      onChange={(e) => handleInputChange('portfolio_url', e.target.value)}
                      className="border-[#C9C8C7] focus:border-black focus:ring-black"
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="skills" className="text-[#66615E]">Skills</Label>
                  <Input
                    id="skills"
                    type="text"
                    value={formData.skills}
                    onChange={(e) => handleInputChange('skills', e.target.value)}
                    className="border-[#C9C8C7] focus:border-black focus:ring-black"
                    placeholder="JavaScript, React, Node.js, etc. (comma-separated)"
                  />
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
                    >
                      Optional Fields
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle className="text-black">Additional Information</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="website_url" className="text-[#66615E]">Website URL</Label>
                        <Input
                          id="website_url"
                          type="url"
                          value={formData.website_url}
                          onChange={(e) => handleInputChange('website_url', e.target.value)}
                          className="border-[#C9C8C7] focus:border-black focus:ring-black"
                        />
                      </div>

                      <div>
                        <Label htmlFor="ethnicity" className="text-[#66615E]">Ethnicity</Label>
                        <Input
                          id="ethnicity"
                          type="text"
                          value={formData.ethnicity}
                          onChange={(e) => handleInputChange('ethnicity', e.target.value)}
                          className="border-[#C9C8C7] focus:border-black focus:ring-black"
                        />
                      </div>

                      <div>
                        <Label htmlFor="gender" className="text-[#66615E]">Gender</Label>
                        <Input
                          id="gender"
                          type="text"
                          value={formData.gender}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className="border-[#C9C8C7] focus:border-black focus:ring-black"
                        />
                      </div>

                      <div>
                        <Label htmlFor="additional_information" className="text-[#66615E]">Additional Information</Label>
                        <textarea
                          id="additional_information"
                          value={formData.additional_information}
                          onChange={(e) => handleInputChange('additional_information', e.target.value)}
                          className="w-full min-h-[100px] px-3 py-2 border border-[#C9C8C7] rounded-md focus:border-black focus:ring-black"
                          placeholder="Any additional information you'd like to share..."
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="flex justify-center space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep('choice')}
                    disabled={isLoading}
                    className="text-[#66615E] border-[#C9C8C7] hover:bg-[#F2F0EF]"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-black hover:bg-[#66615E] text-white"
                  >
                    {isLoading ? 'Creating Profile...' : 'Create Profile'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
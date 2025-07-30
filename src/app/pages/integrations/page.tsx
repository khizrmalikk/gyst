'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface GmailIntegration {
  id: string
  isConnected: boolean
  email?: string
  connectedAt?: string
  lastSyncAt?: string
  syncEnabled: boolean
  totalEmailsProcessed: number
  responsesFound: number
}

export default function IntegrationsPage() {
  const { user } = useUser()
  
  // State management
  const [gmailIntegration, setGmailIntegration] = useState<GmailIntegration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)

  useEffect(() => {
    loadGmailIntegration()
  }, [])

  const loadGmailIntegration = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/integrations/gmail/status', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to load Gmail integration: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setGmailIntegration(data.integration || {
          id: 'gmail',
          isConnected: false,
          syncEnabled: false,
          totalEmailsProcessed: 0,
          responsesFound: 0
        })
      } else {
        throw new Error(data.error || 'Failed to load Gmail integration')
      }
    } catch (error) {
      console.error('Error loading Gmail integration:', error)
      setError(error instanceof Error ? error.message : 'Failed to load Gmail integration')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectGmail = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      
      const response = await fetch('/api/integrations/gmail/connect', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to connect Gmail: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        throw new Error(data.error || 'Failed to get authorization URL')
      }
    } catch (error) {
      console.error('Error connecting Gmail:', error)
      setError(error instanceof Error ? error.message : 'Failed to connect Gmail')
      setIsConnecting(false)
    }
  }

  const handleDisconnectGmail = async () => {
    try {
      setIsDisconnecting(true)
      setError(null)
      
      const response = await fetch('/api/integrations/gmail/disconnect', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to disconnect Gmail: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setSuccess('Gmail disconnected successfully')
        setShowDisconnectModal(false)
        loadGmailIntegration() // Reload the integration status
      } else {
        throw new Error(data.error || 'Failed to disconnect Gmail')
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error)
      setError(error instanceof Error ? error.message : 'Failed to disconnect Gmail')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleToggleSync = async () => {
    if (!gmailIntegration?.isConnected) return
    
    try {
      setError(null)
      
      const response = await fetch('/api/integrations/gmail/sync-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          syncEnabled: !gmailIntegration.syncEnabled
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update sync settings: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setGmailIntegration(prev => prev ? {
          ...prev,
          syncEnabled: !prev.syncEnabled
        } : null)
        setSuccess(`Email sync ${!gmailIntegration.syncEnabled ? 'enabled' : 'disabled'}`)
      } else {
        throw new Error(data.error || 'Failed to update sync settings')
      }
    } catch (error) {
      console.error('Error updating sync settings:', error)
      setError(error instanceof Error ? error.message : 'Failed to update sync settings')
    }
  }

  const handleManualSync = async () => {
    if (!gmailIntegration?.isConnected) return
    
    try {
      setError(null)
      
      const response = await fetch('/api/integrations/gmail/sync', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to sync emails: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setSuccess(`Sync completed! Processed ${data.emailsProcessed || 0} emails, found ${data.responsesFound || 0} responses`)
        loadGmailIntegration() // Reload to get updated stats
      } else {
        throw new Error(data.error || 'Failed to sync emails')
      }
    } catch (error) {
      console.error('Error syncing emails:', error)
      setError(error instanceof Error ? error.message : 'Failed to sync emails')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F0EF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-[#66615E]">Loading integrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-black">Integrations</h1>
        <p className="text-[#66615E]">Connect external services to supercharge your job search</p>
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

      {/* Gmail Integration Card */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7] p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-5.909V8.909L12 14.545 7.545 8.909V21H1.636A1.636 1.636 0 0 1 0 19.364V5.457c0-.904.732-1.636 1.636-1.636h5.909L12 9.091l4.455-5.27h5.909c.904 0 1.636.732 1.636 1.636z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-black">Gmail</h2>
              <p className="text-[#66615E]">Track responses to your job applications automatically</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {gmailIntegration?.isConnected ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Not Connected
              </span>
            )}
          </div>
        </div>

        {gmailIntegration?.isConnected ? (
          <div className="space-y-6">
            {/* Connection Details */}
            <div className="bg-[#F2F0EF] rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-[#66615E]">Connected Email:</span>
                  <p className="text-black">{gmailIntegration.email || 'Loading...'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-[#66615E]">Connected Since:</span>
                  <p className="text-black">
                    {gmailIntegration.connectedAt ? new Date(gmailIntegration.connectedAt).toLocaleDateString() : 'Loading...'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-[#66615E]">Last Sync:</span>
                  <p className="text-black">
                    {gmailIntegration.lastSyncAt ? new Date(gmailIntegration.lastSyncAt).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-[#66615E]">Auto Sync:</span>
                  <p className="text-black">
                    {gmailIntegration.syncEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg border border-[#C9C8C7]">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-black">{gmailIntegration.totalEmailsProcessed}</p>
                    <p className="text-sm text-[#66615E]">Emails Processed</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#C9C8C7]">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-black">{gmailIntegration.responsesFound}</p>
                    <p className="text-sm text-[#66615E]">Responses Found</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleToggleSync}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {gmailIntegration.syncEnabled ? 'Disable Auto Sync' : 'Enable Auto Sync'}
              </Button>

              <Button
                onClick={handleManualSync}
                variant="outline"
                className="border-[#C9C8C7] hover:bg-[#F2F0EF]"
              >
                Sync Now
              </Button>

              <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Disconnect Gmail
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Disconnect Gmail</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-[#66615E]">
                      Are you sure you want to disconnect your Gmail account? This will:
                    </p>
                    <ul className="list-disc list-inside text-sm text-[#66615E] space-y-1">
                      <li>Stop automatic email sync</li>
                      <li>Remove access to your Gmail data</li>
                      <li>Keep existing response tracking data</li>
                    </ul>
                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowDisconnectModal(false)}
                        className="border-[#C9C8C7]"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDisconnectGmail}
                        disabled={isDisconnecting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-black">What you'll get:</h3>
                <ul className="space-y-2 text-sm text-[#66615E]">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Automatic response tracking
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Interview request detection
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Rejection notification alerts
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Application status updates
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium text-black">Privacy & Security:</h3>
                <ul className="space-y-2 text-sm text-[#66615E]">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Read-only access to emails
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    No email content stored
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Revoke access anytime
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Industry-standard encryption
                  </li>
                </ul>
              </div>
            </div>

            {/* Connect Button */}
            <div className="text-center pt-4">
              <Button
                onClick={handleConnectGmail}
                disabled={isConnecting}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-5.909V8.909L12 14.545 7.545 8.909V21H1.636A1.636 1.636 0 0 1 0 19.364V5.457c0-.904.732-1.636 1.636-1.636h5.909L12 9.091l4.455-5.27h5.909c.904 0 1.636.732 1.636 1.636z"/>
                    </svg>
                    Connect Gmail Account
                  </>
                )}
              </Button>
              <p className="text-sm text-[#66615E] mt-2">
                You'll be redirected to Google to authorize access
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Coming Soon Section */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7] p-6">
        <h2 className="text-xl font-semibold text-black mb-4">Coming Soon</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border border-[#C9C8C7] rounded-lg opacity-50">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-black">LinkedIn</h3>
                <p className="text-sm text-[#66615E]">Auto-apply to LinkedIn jobs</p>
              </div>
            </div>
          </div>

          <div className="p-4 border border-[#C9C8C7] rounded-lg opacity-50">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l2 2 4-4m0-9.5V9a2 2 0 00-2 2H8a2 2 0 00-2-2v4.5" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-black">Indeed</h3>
                <p className="text-sm text-[#66615E]">Sync with Indeed applications</p>
              </div>
            </div>
          </div>

          <div className="p-4 border border-[#C9C8C7] rounded-lg opacity-50">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5h5l-5 5-5-5h5V7.5a10 10 0 0120 0V17z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-black">Calendar</h3>
                <p className="text-sm text-[#66615E]">Schedule interview reminders</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
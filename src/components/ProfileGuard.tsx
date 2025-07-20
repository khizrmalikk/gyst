'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'

interface ProfileGuardProps {
  children: React.ReactNode
}

export default function ProfileGuard({ children }: ProfileGuardProps) {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)
  const [hasProfile, setHasProfile] = useState(false)

  // Routes that don't require profile completion
  const exemptRoutes = [
    '/auth/profile-setup',
    '/auth/login',
    '/auth/signup',
    '/',
    '/api'
  ]

  // Check if current route requires profile completion
  const requiresProfile = !exemptRoutes.some(route => 
    pathname.startsWith(route)
  )

  useEffect(() => {
    const checkProfile = async () => {
      if (!isLoaded || !user) {
        setIsCheckingProfile(false)
        return
      }

      // If route doesn't require profile, skip check
      if (!requiresProfile) {
        setHasProfile(true)
        setIsCheckingProfile(false)
        return
      }

      try {
        const response = await fetch('/api/profile')
        
        if (!response.ok) {
          console.error('Error fetching profile:', response.status, response.statusText)
          // On error, redirect to profile setup to be safe
          router.push('/auth/profile-setup')
          return
        }

        const profile = await response.json()
        
        // Check if profile is complete
        if (!profile.profile_complete) {
          router.push('/auth/profile-setup')
          return
        }

        setHasProfile(true)
      } catch (error) {
        console.error('Error checking profile:', error)
        // On error, redirect to profile setup to be safe
        router.push('/auth/profile-setup')
      } finally {
        setIsCheckingProfile(false)
      }
    }

    checkProfile()
  }, [isLoaded, user, router, requiresProfile, pathname])

  // Show loading state while checking
  if (isCheckingProfile || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F0EF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-[#66615E]">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is not authenticated, let Clerk handle it
  if (!user) {
    return <>{children}</>
  }

  // If route doesn't require profile or user has complete profile, render children
  if (!requiresProfile || hasProfile) {
    return <>{children}</>
  }

  // Otherwise, show loading (user will be redirected)
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F2F0EF]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
        <p className="text-[#66615E]">Setting up your profile...</p>
      </div>
    </div>
  )
} 
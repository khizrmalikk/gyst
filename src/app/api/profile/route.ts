import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserProfile, createUserProfile, updateUserProfile } from '@/lib/supabase'

// GET /api/profile - Get user profile (auto-create if doesn't exist)
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let profile = await getUserProfile(userId)
    
    // If profile doesn't exist, create a basic one
    if (!profile) {
      try {
        console.log('Profile not found for user:', userId, 'attempting to create...')
        
        // Get user info from Clerk
        const { currentUser } = await import('@clerk/nextjs/server')
        const user = await currentUser()
        
        console.log('Clerk user data:', {
          id: user?.id,
          fullName: user?.fullName,
          email: user?.primaryEmailAddress?.emailAddress,
          phone: user?.primaryPhoneNumber?.phoneNumber
        })
        
        const profileData = {
          user_id: userId,
          full_name: user?.fullName || '',
          email: user?.primaryEmailAddress?.emailAddress || '',
          phone: user?.primaryPhoneNumber?.phoneNumber || undefined,
          location: undefined,
          linkedin_url: undefined,
          portfolio_url: undefined,
          website_url: undefined,
          ethnicity: undefined,
          gender: undefined,
          additional_information: undefined,
          skills: [],
          profile_complete: false,
          cv_uploaded: false,
          education: [],
          experience: [],
          certifications: [],
          languages: [],
          credits: 10 // Default credits for new users
        }

        console.log('Creating profile with data:', profileData)
        profile = await createUserProfile(profileData)
        console.log('Successfully auto-created profile for user:', userId)
      } catch (createError) {
        console.error('Detailed error auto-creating profile:', createError)
        console.error('Error stack:', createError instanceof Error ? createError.stack : 'No stack trace')
        return NextResponse.json({ 
          error: 'Failed to create profile', 
          details: createError instanceof Error ? createError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/profile - Create user profile
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.full_name || !body.email) {
      return NextResponse.json({ error: 'Full name and email are required' }, { status: 400 })
    }

    // Check if profile already exists
    const existingProfile = await getUserProfile(userId)
    if (existingProfile) {
      return NextResponse.json({ error: 'Profile already exists' }, { status: 409 })
    }

    const profileData = {
      user_id: userId,
      full_name: body.full_name,
      email: body.email,
      phone: body.phone || null,
      location: body.location || null,
      linkedin_url: body.linkedin_url || null,
      portfolio_url: body.portfolio_url || null,
      website_url: body.website_url || null,
      ethnicity: body.ethnicity || null,
      gender: body.gender || null,
      additional_information: body.additional_information || null,
      skills: body.skills || [],
      profile_complete: body.profile_complete || false,
      cv_uploaded: body.cv_uploaded || false,
      education: [],
      experience: [],
      certifications: [],
      languages: []
    }

    const profile = await createUserProfile(profileData)
    
    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error('Error creating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Check if profile exists
    const existingProfile = await getUserProfile(userId)
    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const updates: Record<string, any> = {
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      location: body.location,
      linkedin_url: body.linkedin_url,
      portfolio_url: body.portfolio_url,
      website_url: body.website_url,
      ethnicity: body.ethnicity,
      gender: body.gender,
      additional_information: body.additional_information,
      skills: body.skills,
      profile_complete: body.profile_complete,
      cv_uploaded: body.cv_uploaded
    }

    // Remove undefined values
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    )

    const profile = await updateUserProfile(userId, updates)
    
    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
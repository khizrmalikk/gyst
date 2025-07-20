import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Client for public/anon usage (subject to RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for API routes (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Database types
export interface UserProfile {
  id: string
  user_id: string
  full_name: string
  email: string
  phone?: string
  location?: string
  linkedin_url?: string
  portfolio_url?: string
  website_url?: string
  ethnicity?: string
  gender?: string
  additional_information?: string
  created_at: string
  updated_at: string
  
  // CV/Resume fields
  education: Education[]
  experience: Experience[]
  skills: string[]
  certifications?: Certification[]
  languages?: Language[]
  
  // Profile completion status
  profile_complete: boolean
  cv_uploaded: boolean
}

export interface Education {
  id: string
  institution: string
  degree: string
  field_of_study: string
  start_date: string
  end_date?: string
  gpa?: string
  description?: string
  is_current: boolean
}

export interface Experience {
  id: string
  company: string
  position: string
  location?: string
  start_date: string
  end_date?: string
  is_current: boolean
  description: string
  skills_used?: string[]
}

export interface Certification {
  id: string
  name: string
  issuer: string
  issue_date: string
  expiry_date?: string
  credential_id?: string
  credential_url?: string
}

export interface Language {
  id: string
  language: string
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'native'
}

// Helper functions
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    // First get the basic profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // No profile found
        return null
      }
      console.error('Error fetching user profile:', profileError)
      return null
    }

    // Get related data using the profile UUID as foreign key
    const [educationData, experienceData, certificationsData, languagesData] = await Promise.all([
      supabaseAdmin.from('education').select('*').eq('user_id', profileData.id),
      supabaseAdmin.from('experience').select('*').eq('user_id', profileData.id),
      supabaseAdmin.from('certifications').select('*').eq('user_id', profileData.id),
      supabaseAdmin.from('languages').select('*').eq('user_id', profileData.id)
    ])

    return {
      ...profileData,
      education: educationData.data || [],
      experience: experienceData.data || [],
      certifications: certificationsData.data || [],
      languages: languagesData.data || []
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user profile:', error)
    throw error
  }

  return data
}

export const createUserProfile = async (profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) => {
  // Extract only the fields that belong to the user_profiles table
  const profileData = {
    user_id: profile.user_id,
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedin_url: profile.linkedin_url,
    portfolio_url: profile.portfolio_url,
    website_url: profile.website_url,
    ethnicity: profile.ethnicity,
    gender: profile.gender,
    additional_information: profile.additional_information,
    skills: profile.skills,
    profile_complete: profile.profile_complete,
    cv_uploaded: profile.cv_uploaded
  }

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .insert(profileData)
    .select()
    .single()

  if (error) {
    console.error('Error creating user profile:', error)
    throw error
  }

  // Return the created profile with empty arrays for related data
  return {
    ...data,
    education: [],
    experience: [],
    certifications: [],
    languages: []
  }
} 
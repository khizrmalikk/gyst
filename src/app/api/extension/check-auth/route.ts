import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 Extension auth check request');
    
    // Check if user is authenticated to the web app
    const { userId } = await auth();
    
    if (!userId) {
      console.log('❌ User not authenticated to web app');
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: 'Not logged in'
      }, { status: 401 });
    }
    
    console.log('✅ User authenticated to web app:', userId);
    
    // Get user profile
    const dbProfile = await getUserProfile(userId);
    
    if (!dbProfile) {
      console.log('❌ User profile not found');
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: 'Profile not found. Please complete your profile in the web app.',
        redirectTo: '/pages/profile'
      }, { status: 404 });
    }
    
    // Return user profile data
    const userProfile = {
      id: userId,
      name: dbProfile.full_name || 'Name not provided',
      email: dbProfile.email || 'Email not provided',
      phone: dbProfile.phone || 'Phone not provided',
      location: dbProfile.location || 'Location not specified',
      summary: dbProfile.additional_information || 'Please update your professional summary',
      skills: dbProfile.skills && dbProfile.skills.length > 0 ? dbProfile.skills : ['Please add skills'],
      // Add other profile fields as needed...
      profileComplete: dbProfile.profile_complete || false
    };
    
    console.log('✅ Extension auth check successful for:', userProfile.name);
    
    return NextResponse.json({
      success: true,
      authenticated: true,
      profile: userProfile
    });
    
  } catch (error) {
    console.error('❌ Extension auth check error:', error);
    return NextResponse.json({
      success: false,
      authenticated: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 
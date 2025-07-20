import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserProfile } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('👤 Extension profile request received');
    
    // Check if this is an extension request
    const extensionRequest = request.headers.get('x-extension-request') === 'true';
    
    if (extensionRequest) {
      console.log('🔧 Extension request - checking authentication...');
      
      // Try to get authenticated user
      const { userId } = await auth();
      
      if (!userId) {
        console.log('❌ No authenticated user found');
        return NextResponse.json(
          { 
            success: false,
            error: 'Authentication required',
            message: 'Please log in to your account to use the extension features.'
          },
          { status: 401 }
        );
      }
      
      console.log('✅ User authenticated:', userId);
      
      // Get complete profile from Supabase database - NO CLERK DATA FALLBACKS
      console.log('📊 Fetching profile from Supabase database...');
      const dbProfile = await getUserProfile(userId);
      
      if (!dbProfile) {
        console.log('❌ No database profile found');
        return NextResponse.json(
          { 
            success: false,
            error: 'Profile not found',
            message: 'Please complete your profile in the web app before using the extension features.',
            redirectTo: '/pages/profile'
          },
          { status: 404 }
        );
      }
      
      console.log('📊 Database profile found:', {
        name: dbProfile.full_name,
        email: dbProfile.email,
        skillsCount: dbProfile.skills?.length || 0,
        experienceCount: dbProfile.experience?.length || 0,
        educationCount: dbProfile.education?.length || 0
      });
      
      // Use ONLY database profile data - no Clerk fallbacks
      const userProfile = {
        id: userId,
        // Basic info from database
        name: dbProfile.full_name || 'Name not provided',
        email: dbProfile.email || 'Email not provided', 
        phone: dbProfile.phone || 'Phone not provided',
        location: dbProfile.location || 'Location not specified',
        
        // Professional summary from database
        summary: dbProfile.additional_information || 'Please update your professional summary in your profile',
        
        // Skills from database
        skills: dbProfile.skills && dbProfile.skills.length > 0 
          ? dbProfile.skills 
          : ['Please add skills to your profile'],
          
        // Education from database
        education: dbProfile.education && dbProfile.education.length > 0
          ? {
              degree: dbProfile.education[0].degree,
              school: dbProfile.education[0].institution,
              field: dbProfile.education[0].field_of_study,
              year: dbProfile.education[0].end_date 
                ? new Date(dbProfile.education[0].end_date).getFullYear().toString()
                : dbProfile.education[0].start_date
                  ? new Date(dbProfile.education[0].start_date).getFullYear().toString()
                  : 'Year not specified',
              gpa: dbProfile.education[0].gpa,
              description: dbProfile.education[0].description
            }
          : {
              degree: 'Please add education to your profile',
              school: 'Institution not specified',
              field: 'Field not specified', 
              year: 'Year not specified'
            },
            
        // Work experience from database  
        workHistory: dbProfile.experience && dbProfile.experience.length > 0
          ? dbProfile.experience.map((exp: any) => ({
              title: exp.position,
              company: exp.company,
              location: exp.location || 'Location not specified',
              duration: exp.end_date && !exp.is_current
                ? `${new Date(exp.start_date).getFullYear()} - ${new Date(exp.end_date).getFullYear()}`
                : `${new Date(exp.start_date).getFullYear()} - Present`,
              description: exp.description,
              skills: exp.skills_used || [],
              startDate: exp.start_date,
              endDate: exp.end_date,
              isCurrent: exp.is_current
            }))
          : [
              {
                title: 'Please add work experience to your profile',
                company: 'Company not specified',
                location: 'Location not specified',
                duration: 'Duration not specified', 
                description: 'Please update your work experience in your profile',
                skills: [],
                startDate: null,
                endDate: null,
                isCurrent: false
              }
            ],
            
        // Certifications from database
        certifications: dbProfile.certifications || [],
        
        // Languages from database
        languages: dbProfile.languages || [],
        
        // Profile completion status
        profileComplete: dbProfile.profile_complete || false,
        cvUploaded: dbProfile.cv_uploaded || false,
        
        // Calculate experience level from work history
        experience: dbProfile.experience && dbProfile.experience.length > 0
          ? `${dbProfile.experience.length}+ position${dbProfile.experience.length > 1 ? 's' : ''}`
          : 'Experience not specified',
          
        // Additional profile URLs
        linkedIn: dbProfile.linkedin_url,
        portfolio: dbProfile.portfolio_url, 
        website: dbProfile.website_url,
        
        // Extension-specific metadata
        extensionEnabled: true,
        lastLogin: new Date().toISOString(),
        dataSource: 'supabase_database'
      };

      console.log('✅ Complete profile prepared for extension with ONLY database data:', {
        name: userProfile.name,
        email: userProfile.email,
        skillsCount: userProfile.skills.length,
        workHistoryCount: userProfile.workHistory.length,
        profileComplete: userProfile.profileComplete
      });

      return NextResponse.json({
        success: true,
        profile: userProfile,
        authenticated: true,
        dataSource: 'supabase_database'
      });
    }
    
    // Non-extension request (from web app) - same logic, only database data
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get complete profile from Supabase database for web app
    const dbProfile = await getUserProfile(userId);
    
    if (!dbProfile) {
      return NextResponse.json(
        { error: 'Profile not found. Please complete your profile.' },
        { status: 404 }
      );
    }

    // Use ONLY database data for web app too
    const userProfile = {
      id: userId,
      name: dbProfile.full_name || 'Name not provided',
      email: dbProfile.email || 'Email not provided',
      phone: dbProfile.phone || 'Phone not provided',
      location: dbProfile.location || 'Location not specified',
      summary: dbProfile.additional_information || 'Please update your professional summary',
      skills: dbProfile.skills && dbProfile.skills.length > 0 ? dbProfile.skills : ['Please add skills'],
      education: dbProfile.education && dbProfile.education.length > 0
        ? {
            degree: dbProfile.education[0].degree,
            school: dbProfile.education[0].institution,
            field: dbProfile.education[0].field_of_study,
            year: dbProfile.education[0].end_date 
              ? new Date(dbProfile.education[0].end_date).getFullYear().toString()
              : new Date(dbProfile.education[0].start_date).getFullYear().toString()
          }
        : {
            degree: 'Please add education',
            school: 'Institution not specified',
            field: 'Field not specified',
            year: 'Year not specified'
          },
      workHistory: dbProfile.experience && dbProfile.experience.length > 0
        ? dbProfile.experience.map((exp: any) => ({
            title: exp.position,
            company: exp.company,
            location: exp.location || 'Location not specified',
            duration: exp.end_date && !exp.is_current
              ? `${new Date(exp.start_date).getFullYear()} - ${new Date(exp.end_date).getFullYear()}`
              : `${new Date(exp.start_date).getFullYear()} - Present`,
            description: exp.description
          }))
        : [
            {
              title: 'Please add work experience',
              company: 'Company not specified',
              location: 'Location not specified', 
              duration: 'Duration not specified',
              description: 'Please update your work experience'
            }
          ],
      experience: dbProfile.experience && dbProfile.experience.length > 0 ? `${dbProfile.experience.length}+ positions` : 'Experience not specified',
      certifications: dbProfile.certifications || [],
      languages: dbProfile.languages || [],
      profileComplete: dbProfile.profile_complete || false,
      dataSource: 'supabase_database'
    };

    return NextResponse.json({
      success: true,
      profile: userProfile,
      dataSource: 'supabase_database'
    });

  } catch (error) {
    console.error('❌ Profile API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Could not fetch profile data from database'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // TODO: Add proper authentication for Chrome extension
    const userId = 'extension-user';

    const profileData = await request.json();

    // TODO: Update user profile in database
    console.log('Updating profile for user:', userId, profileData);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Getting tailored profiles for user');
    
    // Get user ID from Clerk
    const { userId } = await auth();
    if (!userId) {
      console.log('❌ No authenticated user found');
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Get all tailored profiles for the user
    const { data: tailoredProfiles, error } = await supabase
      .from('tailored_profiles')
      .select(`
        id,
        label,
        company_name,
        job_title,
        created_at,
        updated_at,
        last_used_at,
        tailored_data
      `)
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching tailored profiles:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch tailored profiles' 
      }, { status: 500 });
    }

    console.log(`✅ Found ${tailoredProfiles?.length || 0} tailored profiles`);

    return NextResponse.json({
      success: true,
      profiles: tailoredProfiles || [],
      count: tailoredProfiles?.length || 0
    });

  } catch (error) {
    console.error('❌ Unexpected error in GET tailored profiles:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Creating new tailored profile');
    
    // Get user ID from Clerk
    const { userId } = await auth();
    if (!userId) {
      console.log('❌ No authenticated user found');
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { 
      companyName, 
      jobTitle, 
      jobDescription, 
      jobRequirements = [],
      jobUrl,
      baseProfileData 
    } = body;

    // Validate required fields
    if (!companyName || !jobTitle || !jobDescription || !baseProfileData) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: companyName, jobTitle, jobDescription, baseProfileData' 
      }, { status: 400 });
    }

    console.log('📊 Tailoring profile for:', { companyName, jobTitle });

    // Check if user already has 10 tailored profiles
    const { count: existingCount } = await supabase
      .from('tailored_profiles')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    if (existingCount && existingCount >= 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Maximum of 10 tailored profiles allowed. Please delete an existing profile first.' 
      }, { status: 400 });
    }

    // Generate unique label
    const { data: labelResult } = await supabase.rpc('generate_tailored_profile_label', {
      p_user_id: userId,
      p_company_name: companyName,
      p_job_title: jobTitle
    });

    const label = labelResult || `${companyName}-${jobTitle}`;
    console.log('🏷️ Generated label:', label);

    // Call AI to tailor the profile data
    const tailoredData = await tailorProfileWithAI(baseProfileData, {
      companyName,
      jobTitle,
      jobDescription,
      jobRequirements
    });

    // Save tailored profile to database
    const { data: newProfile, error: insertError } = await supabase
      .from('tailored_profiles')
      .insert([{
        user_id: userId,
        label,
        company_name: companyName,
        job_title: jobTitle,
        job_description: jobDescription,
        job_requirements: jobRequirements,
        job_url: jobUrl,
        tailored_data: tailoredData,
        last_used_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating tailored profile:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create tailored profile' 
      }, { status: 500 });
    }

    console.log('✅ Tailored profile created successfully');

    return NextResponse.json({
      success: true,
      profile: newProfile,
      message: `Tailored profile "${label}" created successfully`
    });

  } catch (error) {
    console.error('❌ Unexpected error in POST tailored profiles:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// AI function to tailor profile data
async function tailorProfileWithAI(baseProfile: any, jobInfo: any) {
  try {
    const openai = await import('openai');
    const client = new openai.default({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are an expert career advisor. I will provide you with a base user profile in JSON format and job information. Your task is to return a tailored version of the profile that emphasizes the most relevant skills, experiences, and qualifications for this specific position.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON in the EXACT same structure as the input profile
2. Keep all the original data but strategically emphasize, reorder, and enhance relevant parts
3. Tailor the summary to highlight the most relevant experience for this role
4. Reorder skills to put the most relevant ones first
5. Enhance job descriptions to emphasize achievements relevant to the target role
6. Keep all factual information accurate - do not fabricate experience or skills

BASE PROFILE DATA:
${JSON.stringify(baseProfile, null, 2)}

JOB INFORMATION:
- Company: ${jobInfo.companyName}
- Job Title: ${jobInfo.jobTitle}
- Job Description: ${jobInfo.jobDescription}
- Key Requirements: ${jobInfo.jobRequirements?.join(', ') || 'Not specified'}

TAILORING INSTRUCTIONS:
1. Rewrite the summary to emphasize experience most relevant to this ${jobInfo.jobTitle} role at ${jobInfo.companyName}
2. Reorder skills array to prioritize those mentioned in the job requirements
3. Enhance work experience descriptions to highlight relevant achievements and technologies
4. If education is relevant to the role, emphasize relevant coursework or projects
5. Keep all contact information exactly the same
6. Do not add skills, experiences, or qualifications that aren't already present in some form

Return only the tailored profile JSON, no additional text or formatting.
`;

    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional career advisor who specializes in tailoring resumes and profiles for specific job applications. Return only valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2500
    });

    const tailoredContent = response.choices[0]?.message?.content;
    
    if (!tailoredContent) {
      throw new Error('No response from AI');
    }

    // Parse and validate the JSON response
    let tailoredProfile;
    try {
      tailoredProfile = JSON.parse(tailoredContent);
    } catch (parseError) {
      console.warn('⚠️ AI returned invalid JSON, using fallback approach');
      // Fallback: return original profile with enhanced summary
      tailoredProfile = {
        ...baseProfile,
        summary: `${baseProfile.summary} With strong expertise relevant to ${jobInfo.jobTitle} roles, particularly in areas that align with ${jobInfo.companyName}'s requirements.`
      };
    }

    return tailoredProfile;

  } catch (error) {
    console.error('❌ Error in AI tailoring:', error);
    
    // Fallback: return enhanced version of base profile
    return {
      ...baseProfile,
      summary: `${baseProfile.summary} Seeking to apply expertise in a ${jobInfo.jobTitle} role at ${jobInfo.companyName}.`
    };
  }
} 
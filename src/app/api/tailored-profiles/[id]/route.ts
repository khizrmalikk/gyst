import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    console.log('🔍 Getting tailored profile:', params.id);
    
    // Get user ID from Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Get specific tailored profile
    const { data: profile, error } = await supabase
      .from('tailored_profiles')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          success: false, 
          error: 'Tailored profile not found' 
        }, { status: 404 });
      }
      
      console.error('❌ Error fetching tailored profile:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch tailored profile' 
      }, { status: 500 });
    }

    // Update last_used_at timestamp
    await supabase
      .from('tailored_profiles')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', userId);

    console.log('✅ Tailored profile fetched successfully');

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('❌ Unexpected error in GET tailored profile:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    console.log('✏️ Updating tailored profile:', params.id);
    
    // Get user ID from Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { 
      label,
      companyName, 
      jobTitle, 
      jobDescription, 
      jobRequirements,
      jobUrl,
      tailoredData 
    } = body;

    // Build update object with provided fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (label !== undefined) updateData.label = label;
    if (companyName !== undefined) updateData.company_name = companyName;
    if (jobTitle !== undefined) updateData.job_title = jobTitle;
    if (jobDescription !== undefined) updateData.job_description = jobDescription;
    if (jobRequirements !== undefined) updateData.job_requirements = jobRequirements;
    if (jobUrl !== undefined) updateData.job_url = jobUrl;
    if (tailoredData !== undefined) updateData.tailored_data = tailoredData;

    // Update the tailored profile
    const { data: updatedProfile, error } = await supabase
      .from('tailored_profiles')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          success: false, 
          error: 'Tailored profile not found' 
        }, { status: 404 });
      }
      
      console.error('❌ Error updating tailored profile:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update tailored profile' 
      }, { status: 500 });
    }

    console.log('✅ Tailored profile updated successfully');

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Tailored profile updated successfully'
    });

  } catch (error) {
    console.error('❌ Unexpected error in PUT tailored profile:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    console.log('🗑️ Deleting tailored profile:', params.id);
    
    // Get user ID from Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // First, get the profile to return its info
    const { data: profile } = await supabase
      .from('tailored_profiles')
      .select('label, company_name, job_title')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    // Delete the tailored profile
    const { error } = await supabase
      .from('tailored_profiles')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error deleting tailored profile:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete tailored profile' 
      }, { status: 500 });
    }

    console.log('✅ Tailored profile deleted successfully');

    return NextResponse.json({
      success: true,
      message: `Tailored profile "${profile?.label || 'Unknown'}" deleted successfully`
    });

  } catch (error) {
    console.error('❌ Unexpected error in DELETE tailored profile:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 
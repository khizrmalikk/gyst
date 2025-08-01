import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin, getUserProfile } from '@/lib/supabase'

// PUT /api/profile/experience/[id] - Update experience record
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getUserProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const experienceId = params.id

    // Verify experience record belongs to user
    const { data: existingExperience, error: fetchError } = await supabaseAdmin
      .from('experience')
      .select('*')
      .eq('id', experienceId)
      .eq('user_id', profile.id)
      .single()

    if (fetchError || !existingExperience) {
      return NextResponse.json({ error: 'Experience record not found' }, { status: 404 })
    }

    const updates: Record<string, any> = {
      company: body.company,
      position: body.position,
      location: body.location,
      start_date: body.start_date,
      end_date: body.end_date,
      is_current: body.is_current,
      description: body.description,
      skills_used: body.skills_used
    }

    // Remove undefined values
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    )

    const { data: experience, error } = await supabaseAdmin
      .from('experience')
      .update(updates)
      .eq('id', experienceId)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating experience record:', error)
      return NextResponse.json({ error: 'Failed to update experience record' }, { status: 500 })
    }

    return NextResponse.json(experience)
  } catch (error) {
    console.error('Error updating experience record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/profile/experience/[id] - Delete experience record
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getUserProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { id } = params

    // First, verify the experience record exists and belongs to the user
    const { data: existingExperience, error: fetchError } = await supabaseAdmin
      .from('experience')
      .select('*')
      .eq('id', id)
      .eq('user_id', profile.id)
      .single()

    if (fetchError || !existingExperience) {
      return NextResponse.json({ error: 'Experience record not found' }, { status: 404 })
    }

    // Delete the experience record
    const { error: deleteError } = await supabaseAdmin
      .from('experience')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id)

    if (deleteError) {
      console.error('Error deleting experience record:', deleteError)
      return NextResponse.json({ error: 'Failed to delete experience record' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Experience record deleted successfully' })
  } catch (error) {
    console.error('Error deleting experience record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
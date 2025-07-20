import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin, getUserProfile } from '@/lib/supabase'

// PUT /api/profile/education/[id] - Update education record
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getUserProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const educationId = params.id

    // Verify education record belongs to user
    const { data: existingEducation, error: fetchError } = await supabaseAdmin
      .from('education')
      .select('*')
      .eq('id', educationId)
      .eq('user_id', profile.id)
      .single()

    if (fetchError || !existingEducation) {
      return NextResponse.json({ error: 'Education record not found' }, { status: 404 })
    }

    const updates: Record<string, any> = {
      institution: body.institution,
      degree: body.degree,
      field_of_study: body.field_of_study,
      start_date: body.start_date,
      end_date: body.end_date,
      gpa: body.gpa,
      description: body.description,
      is_current: body.is_current
    }

    // Remove undefined values
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    )

    const { data: education, error } = await supabaseAdmin
      .from('education')
      .update(updates)
      .eq('id', educationId)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating education record:', error)
      return NextResponse.json({ error: 'Failed to update education record' }, { status: 500 })
    }

    return NextResponse.json(education)
  } catch (error) {
    console.error('Error updating education record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/profile/education/[id] - Delete education record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getUserProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { id } = params

    // First, verify the education record exists and belongs to the user
    const { data: existingEducation, error: fetchError } = await supabaseAdmin
      .from('education')
      .select('*')
      .eq('id', id)
      .eq('user_id', profile.id)
      .single()

    if (fetchError || !existingEducation) {
      return NextResponse.json({ error: 'Education record not found' }, { status: 404 })
    }

    // Delete the education record
    const { error: deleteError } = await supabaseAdmin
      .from('education')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id)

    if (deleteError) {
      console.error('Error deleting education record:', deleteError)
      return NextResponse.json({ error: 'Failed to delete education record' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Education record deleted successfully' })
  } catch (error) {
    console.error('Error deleting education record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
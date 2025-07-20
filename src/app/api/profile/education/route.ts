import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin, getUserProfile } from '@/lib/supabase'

// GET /api/profile/education - Get user's education records
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getUserProfile(userId)
    if (!profile) {
      // Return empty array if no profile exists yet
      return NextResponse.json([])
    }

    const { data: education, error } = await supabaseAdmin
      .from('education')
      .select('*')
      .eq('user_id', profile.id)
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Error fetching education:', error)
      return NextResponse.json({ error: 'Failed to fetch education records' }, { status: 500 })
    }

    return NextResponse.json(education)
  } catch (error) {
    console.error('Error fetching education:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/profile/education - Add education record
export async function POST(request: NextRequest) {
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
    
    // Validate required fields
    if (!body.institution || !body.degree || !body.field_of_study || !body.start_date) {
      return NextResponse.json({ 
        error: 'Institution, degree, field of study, and start date are required' 
      }, { status: 400 })
    }

    const educationData = {
      user_id: profile.id,
      institution: body.institution,
      degree: body.degree,
      field_of_study: body.field_of_study,
      start_date: body.start_date,
      end_date: body.end_date || null,
      gpa: body.gpa || null,
      description: body.description || null,
      is_current: body.is_current || false
    }

    const { data: education, error } = await supabaseAdmin
      .from('education')
      .insert(educationData)
      .select()
      .single()

    if (error) {
      console.error('Error creating education record:', error)
      return NextResponse.json({ error: 'Failed to create education record' }, { status: 500 })
    }

    return NextResponse.json(education, { status: 201 })
  } catch (error) {
    console.error('Error creating education record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
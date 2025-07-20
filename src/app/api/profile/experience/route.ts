import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin, getUserProfile } from '@/lib/supabase'

// GET /api/profile/experience - Get user's experience records
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

    const { data: experience, error } = await supabaseAdmin
      .from('experience')
      .select('*')
      .eq('user_id', profile.id)
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Error fetching experience:', error)
      return NextResponse.json({ error: 'Failed to fetch experience records' }, { status: 500 })
    }

    return NextResponse.json(experience)
  } catch (error) {
    console.error('Error fetching experience:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/profile/experience - Add experience record
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
    if (!body.company || !body.position || !body.start_date || !body.description) {
      return NextResponse.json({ 
        error: 'Company, position, start date, and description are required' 
      }, { status: 400 })
    }

    const experienceData = {
      user_id: profile.id,
      company: body.company,
      position: body.position,
      location: body.location || null,
      start_date: body.start_date,
      end_date: body.end_date || null,
      is_current: body.is_current || false,
      description: body.description,
      skills_used: body.skills_used || []
    }

    const { data: experience, error } = await supabaseAdmin
      .from('experience')
      .insert(experienceData)
      .select()
      .single()

    if (error) {
      console.error('Error creating experience record:', error)
      return NextResponse.json({ error: 'Failed to create experience record' }, { status: 500 })
    }

    return NextResponse.json(experience, { status: 201 })
  } catch (error) {
    console.error('Error creating experience record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
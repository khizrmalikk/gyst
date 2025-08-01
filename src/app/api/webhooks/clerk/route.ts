import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { createUserProfile } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Get the headers
    const headerPayload = await headers()
    const svixId = headerPayload.get('svix-id')
    const svixTimestamp = headerPayload.get('svix-timestamp')
    const svixSignature = headerPayload.get('svix-signature')

    // If there are no headers, error out
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
    }

    // Get the body
    const payload = await request.json()
    const body = JSON.stringify(payload)

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

    let evt: any

    // Verify the webhook
    try {
      evt = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      })
    } catch (err) {
      console.error('Error verifying webhook:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the webhook
    const eventType = evt.type

    if (eventType === 'user.created') {
      const { id, email_addresses, phone_numbers, first_name, last_name } = evt.data

      const primaryEmail = email_addresses.find((email: any) => email.id === evt.data.primary_email_address_id)
      const primaryPhone = phone_numbers.find((phone: any) => phone.id === evt.data.primary_phone_number_id)

      try {
        // Create user profile in Supabase
        const profileData = {
          user_id: id,
          full_name: `${first_name || ''} ${last_name || ''}`.trim() || '',
          email: primaryEmail?.email_address || '',
          phone: primaryPhone?.phone_number || undefined,
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
          credits: 10 // Default credits for new users via webhook
        }

        const profile = await createUserProfile(profileData)
        console.log('Profile created via webhook for user:', id)
        
        return NextResponse.json({ 
          message: 'Profile created successfully',
          profile: profile 
        })
      } catch (error) {
        console.error('Error creating profile via webhook:', error)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }
    }

    if (eventType === 'user.updated') {
      const { id, email_addresses, phone_numbers, first_name, last_name } = evt.data

      const primaryEmail = email_addresses.find((email: any) => email.id === evt.data.primary_email_address_id)
      const primaryPhone = phone_numbers.find((phone: any) => phone.id === evt.data.primary_phone_number_id)

      try {
        // Update user profile in Supabase
        const updates = {
          full_name: `${first_name || ''} ${last_name || ''}`.trim() || '',
          email: primaryEmail?.email_address || '',
          phone: primaryPhone?.phone_number || undefined,
        }

        // Remove undefined values
        Object.keys(updates).forEach(key => 
          updates[key as keyof typeof updates] === undefined && delete updates[key as keyof typeof updates]
        )

        const { updateUserProfile } = await import('@/lib/supabase')
        await updateUserProfile(id, updates)
        
        console.log('Profile updated via webhook for user:', id)
        
        return NextResponse.json({ 
          message: 'Profile updated successfully'
        })
      } catch (error) {
        console.error('Error updating profile via webhook:', error)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data

      try {
        // Delete user profile and related data from Supabase
        const { supabaseAdmin } = await import('@/lib/supabase')
        
        // Delete in order due to foreign key constraints
        await supabaseAdmin.from('languages').delete().eq('user_id', id)
        await supabaseAdmin.from('certifications').delete().eq('user_id', id)
        await supabaseAdmin.from('experience').delete().eq('user_id', id)
        await supabaseAdmin.from('education').delete().eq('user_id', id)
        await supabaseAdmin.from('user_profiles').delete().eq('user_id', id)
        
        console.log('Profile deleted via webhook for user:', id)
        
        return NextResponse.json({ 
          message: 'Profile deleted successfully'
        })
      } catch (error) {
        console.error('Error deleting profile via webhook:', error)
        return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 })
      }
    }

    return NextResponse.json({ message: 'Webhook received' })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
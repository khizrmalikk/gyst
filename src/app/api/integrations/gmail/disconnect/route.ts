import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    console.log('🔌 Disconnecting Gmail integration...');
    
    // Check if user is authenticated
    const { userId } = await auth();
    
    if (!userId) {
      console.log('❌ User not authenticated');
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', userId);
    
    // Get existing integration
    const { data: integration, error: selectError } = await supabaseAdmin
      .from('gmail_integrations')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ Database error fetching integration:', selectError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch Gmail integration'
      }, { status: 500 });
    }
    
    // Revoke Google tokens if they exist
    if (integration?.access_token) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        
        oauth2Client.setCredentials({
          access_token: integration.access_token,
          refresh_token: integration.refresh_token
        });
        
        await oauth2Client.revokeCredentials();
        console.log('✅ Google tokens revoked');
      } catch (revokeError) {
        console.warn('⚠️ Failed to revoke Google tokens:', revokeError);
        // Continue with local cleanup even if token revocation fails
      }
    }
    
    // Deactivate integration in database (soft delete)
    const { error: updateError } = await supabaseAdmin
      .from('gmail_integrations')
      .update({
        is_active: false,
        sync_enabled: false,
        access_token: null,
        refresh_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('❌ Failed to deactivate Gmail integration:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to disconnect Gmail integration'
      }, { status: 500 });
    }
    
    console.log('✅ Gmail integration disconnected for user:', userId);
    
    return NextResponse.json({
      success: true,
      message: 'Gmail integration disconnected successfully'
    });
    
  } catch (error) {
    console.error('❌ Gmail disconnect error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to disconnect Gmail integration'
    }, { status: 500 });
  }
} 
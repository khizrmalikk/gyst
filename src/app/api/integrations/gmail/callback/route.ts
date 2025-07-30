import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Processing Gmail OAuth callback...');
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth error
    if (error) {
      console.error('❌ OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pages/integrations?error=oauth_denied`);
    }
    
    // Validate required parameters
    if (!code || !state) {
      console.error('❌ Missing OAuth parameters');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pages/integrations?error=missing_params`);
    }
    
    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (err) {
      console.error('❌ Invalid state parameter');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pages/integrations?error=invalid_state`);
    }
    
    const { userId, timestamp } = stateData;
    
    // Validate state timestamp (10 minutes max)
    if (!userId || !timestamp || Date.now() - timestamp > 10 * 60 * 1000) {
      console.error('❌ Expired or invalid state');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pages/integrations?error=expired_state`);
    }
    
    console.log('✅ Valid OAuth callback for user:', userId);
    
    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`;
    
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Get user's Gmail profile
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    console.log('✅ Retrieved Gmail profile:', profile.data.emailAddress);
    
    // Store integration in database
    const { data: existingIntegration } = await supabaseAdmin
      .from('gmail_integrations')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (existingIntegration) {
      // Update existing integration
      const { error: updateError } = await supabaseAdmin
        .from('gmail_integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          gmail_email: profile.data.emailAddress,
          is_active: true,
          sync_enabled: true,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('❌ Failed to update Gmail integration:', updateError);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pages/integrations?error=database_error`);
      }
    } else {
      // Create new integration
      const { error: insertError } = await supabaseAdmin
        .from('gmail_integrations')
        .insert({
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          gmail_email: profile.data.emailAddress,
          is_active: true,
          sync_enabled: true,
          connected_at: new Date().toISOString(),
          total_emails_processed: 0,
          responses_found: 0
        });
      
      if (insertError) {
        console.error('❌ Failed to create Gmail integration:', insertError);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pages/integrations?error=database_error`);
      }
    }
    
    console.log('✅ Gmail integration saved successfully');
    
    // Redirect back to integrations page with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pages/integrations?success=gmail_connected`);
    
  } catch (error) {
    console.error('❌ Gmail callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pages/integrations?error=callback_failed`);
  }
} 
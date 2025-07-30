import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { google } from 'googleapis';

// Gmail OAuth scopes - read-only access to Gmail
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
];

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Starting Gmail OAuth connection...');
    
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
    
    // Check if we have Google OAuth credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`;
    
    if (!clientId || !clientSecret) {
      console.error('❌ Missing Google OAuth credentials');
      return NextResponse.json({
        success: false,
        error: 'Gmail integration not configured. Please contact support.'
      }, { status: 500 });
    }
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    
    // Generate auth URL with state parameter for security
    const state = Buffer.from(JSON.stringify({ 
      userId,
      timestamp: Date.now() 
    })).toString('base64');
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required for refresh tokens
      prompt: 'consent',      // Force consent screen to get refresh token
      scope: GMAIL_SCOPES,
      state: state,           // Include user ID for verification
    });
    
    console.log('✅ Generated OAuth URL for user:', userId);
    
    return NextResponse.json({
      success: true,
      authUrl: authUrl,
      message: 'Redirecting to Google OAuth...'
    });
    
  } catch (error) {
    console.error('❌ Gmail connect error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initiate Gmail connection'
    }, { status: 500 });
  }
} 
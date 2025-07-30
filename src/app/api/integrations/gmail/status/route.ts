import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking Gmail integration status...');
    
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
    
    // Check if user has Gmail integration
    const { data: integration, error } = await supabaseAdmin
      .from('gmail_integrations')
      .select(`
        id,
        user_id,
        gmail_email,
        access_token,
        refresh_token,
        is_active,
        sync_enabled,
        connected_at,
        last_sync_at,
        total_emails_processed,
        responses_found,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Database error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to check Gmail integration status'
      }, { status: 500 });
    }
    
    if (!integration) {
      console.log('ℹ️ No Gmail integration found for user');
      return NextResponse.json({
        success: true,
        integration: {
          id: 'gmail',
          isConnected: false,
          syncEnabled: false,
          totalEmailsProcessed: 0,
          responsesFound: 0
        }
      });
    }
    
    console.log('✅ Gmail integration found:', integration.gmail_email);
    
    // Return integration status
    const integrationData = {
      id: integration.id,
      isConnected: true,
      email: integration.gmail_email,
      connectedAt: integration.connected_at,
      lastSyncAt: integration.last_sync_at,
      syncEnabled: integration.sync_enabled,
      totalEmailsProcessed: integration.total_emails_processed || 0,
      responsesFound: integration.responses_found || 0
    };
    
    return NextResponse.json({
      success: true,
      integration: integrationData
    });
    
  } catch (error) {
    console.error('❌ Gmail status check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('⚙️ Updating Gmail sync settings...');
    
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
    
    // Parse request body
    const { syncEnabled } = await request.json();
    
    if (typeof syncEnabled !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'Invalid syncEnabled value'
      }, { status: 400 });
    }
    
    // Update sync settings
    const { data: integration, error } = await supabaseAdmin
      .from('gmail_integrations')
      .update({
        sync_enabled: syncEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true)
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ Failed to update sync settings:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update sync settings'
      }, { status: 500 });
    }
    
    if (!integration) {
      return NextResponse.json({
        success: false,
        error: 'Gmail integration not found'
      }, { status: 404 });
    }
    
    console.log(`✅ Gmail sync ${syncEnabled ? 'enabled' : 'disabled'} for user:`, userId);
    
    return NextResponse.json({
      success: true,
      syncEnabled: syncEnabled,
      message: `Gmail sync ${syncEnabled ? 'enabled' : 'disabled'} successfully`
    });
    
  } catch (error) {
    console.error('❌ Gmail sync settings error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update sync settings'
    }, { status: 500 });
  }
} 
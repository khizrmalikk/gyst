import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🚪 Logout request received');
    
    // Check if user is authenticated
    const { userId } = await auth();
    
    if (!userId) {
      console.log('⚠️ No user to logout');
      return NextResponse.json(
        { success: true, message: 'No active session found' },
        { status: 200 }
      );
    }
    
    console.log('✅ User logged out successfully:', userId);
    
    // Create response with success message
    const response = NextResponse.json({
      success: true,
      message: 'Successfully logged out'
    });
    
    // Note: Clerk handles session management automatically through their components
    // The actual logout will happen on the frontend using Clerk's signOut function
    // This endpoint is mainly for logging and consistency
    
    return response;
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    
    // Even if there's an error, we'll return success since logout should be permissive
    return NextResponse.json(
      { success: true, message: 'Logout completed' },
      { status: 200 }
    );
  }
} 
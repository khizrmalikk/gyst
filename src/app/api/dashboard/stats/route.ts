import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// Define types for activity items
interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  timestamp: string;
  status?: string;
  responseType?: string;
  icon: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching dashboard stats...');
    
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
    
    // Fetch applications count
    const { count: applicationsCount, error: applicationsError } = await supabaseAdmin
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (applicationsError) {
      console.error('❌ Error fetching applications count:', applicationsError);
    }
    
    // Fetch email responses stats (if Gmail integration exists)
    const { data: emailStats, error: emailStatsError } = await supabaseAdmin
      .from('email_responses')
      .select('response_type')
      .eq('user_id', userId)
      .eq('is_archived', false);
    
    if (emailStatsError) {
      console.error('❌ Error fetching email stats:', emailStatsError);
    }
    
    // Count responses by type
    const responsesCount = emailStats?.length || 0;
    const interviewsCount = emailStats?.filter(r => r.response_type === 'interview').length || 0;
    const rejectionsCount = emailStats?.filter(r => r.response_type === 'rejection').length || 0;
    
    // Fetch user profile for credits (assuming credits are stored in user_profiles)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('credits')
      .eq('user_id', userId)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error fetching user profile:', profileError);
    }
    
    // Fetch recent activity (last 5 applications and email responses)
    const { data: recentApplications, error: recentAppsError } = await supabaseAdmin
      .from('job_applications')
      .select(`
        id,
        job_title,
        company_name,
        application_status,
        created_at,
        applied_at,
        application_data
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentAppsError) {
      console.error('❌ Error fetching recent applications:', recentAppsError);
    }
    
    const { data: recentResponses, error: recentResponsesError } = await supabaseAdmin
      .from('email_responses')
      .select(`
        id,
        subject,
        sender_name,
        response_type,
        received_at,
        application_id,
        job_applications(job_title, company_name)
      `)
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('received_at', { ascending: false })
      .limit(5);
    
    if (recentResponsesError) {
      console.error('❌ Error fetching recent responses:', recentResponsesError);
    }
    
    // Combine and sort recent activity
    const recentActivity: ActivityItem[] = [];
    
    // Add recent applications
    if (recentApplications) {
      recentApplications.forEach(app => {
        recentActivity.push({
          id: `app_${app.id}`,
          type: 'application',
          title: `Application submitted to ${app.company_name}`,
          subtitle: `${app.job_title} - ${getTimeAgo(app.applied_at || app.created_at)}`,
          timestamp: app.applied_at || app.created_at,
          status: app.application_status,
          icon: 'application'
        });
      });
    }
    
    // Add recent email responses
    if (recentResponses) {
      recentResponses.forEach((response: any) => {
        const responseTypeMap = {
          interview: 'Interview scheduled',
          rejection: 'Application response',
          follow_up: 'Follow-up received',
          acknowledgment: 'Application confirmed',
          other: 'Email received'
        };
        
        const companyName = response.job_applications?.company_name || 'Unknown Company';
        
        recentActivity.push({
          id: `email_${response.id}`,
          type: 'email_response',
          title: responseTypeMap[response.response_type as keyof typeof responseTypeMap] || 'Email received',
          subtitle: `${companyName} - ${getTimeAgo(response.received_at)}`,
          timestamp: response.received_at,
          responseType: response.response_type,
          icon: response.response_type
        });
      });
    }
    
    // Sort by timestamp (most recent first) and limit to 6
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivity = recentActivity.slice(0, 6);
    
    // Check Gmail integration status
    const { data: gmailIntegration } = await supabaseAdmin
      .from('gmail_integrations')
      .select('is_active, sync_enabled')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    const stats = {
      applications: {
        total: applicationsCount || 0,
        thisWeek: 0, // TODO: Calculate this week's applications
        change: '+12%' // TODO: Calculate change from last period
      },
      responses: {
        total: responsesCount,
        interviews: interviewsCount,
        rejections: rejectionsCount,
        pending: (applicationsCount || 0) - responsesCount
      },
      credits: {
        remaining: userProfile?.credits || 50, // Default to 50 if not found
        used: 0, // TODO: Calculate used credits
        plan: 'Free' // TODO: Get actual plan
      },
      integrations: {
        gmail: {
          connected: !!gmailIntegration?.is_active,
          syncEnabled: !!gmailIntegration?.sync_enabled
        }
      },
      recentActivity: limitedActivity
    };
    
    console.log('✅ Dashboard stats fetched successfully');
    console.log('Stats summary:', {
      applications: stats.applications.total,
      responses: stats.responses.total,
      interviews: stats.responses.interviews,
      credits: stats.credits.remaining
    });
    
    return NextResponse.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    }, { status: 500 });
  }
}

// Helper function to calculate time ago
function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMs = now.getTime() - time.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return `${diffInMinutes} minutes ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} weeks ago`;
  }
} 
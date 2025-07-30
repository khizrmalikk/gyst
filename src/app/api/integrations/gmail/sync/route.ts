import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting Gmail sync with application matching...');
    
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
    
    // Get Gmail integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('gmail_integrations')
      .select('id, access_token, refresh_token, gmail_email, last_sync_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('sync_enabled', true)
      .single();
    
    if (integrationError || !integration) {
      console.log('❌ No active Gmail integration found');
      return NextResponse.json({
        success: false,
        error: 'Gmail integration not found or not enabled'
      }, { status: 404 });
    }
    
    console.log('✅ Gmail integration found:', integration.gmail_email);
    
    // Get user's job applications for matching
    const { data: userApplications, error: appsError } = await supabaseAdmin
      .from('job_applications')
      .select('id, company_name, job_title, job_url, application_status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (appsError) {
      console.error('❌ Error fetching user applications:', appsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user applications'
      }, { status: 500 });
    }
    
    console.log(`📋 Found ${userApplications?.length || 0} applications to match against`);
    
    // Set up Gmail API client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Calculate date range for sync (last sync or 30 days ago)
    const lastSyncDate = integration.last_sync_at 
      ? new Date(integration.last_sync_at)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    const afterTimestamp = Math.floor(lastSyncDate.getTime() / 1000);
    
    console.log('🔍 Searching for emails since:', lastSyncDate.toISOString());
    
    // Build search query to find job-related emails
    const companyDomains = userApplications?.map(app => 
      app.company_name.toLowerCase().replace(/\s+/g, '')
    ).filter(Boolean) || [];
    
    // Create more targeted search query
    const searchQuery = `in:inbox after:${afterTimestamp} (${companyDomains.map(domain => `from:${domain}`).join(' OR ')} OR subject:application OR subject:interview OR subject:position OR subject:job OR subject:opportunity OR subject:thank OR subject:next OR subject:unfortunately OR subject:regret OR from:noreply OR from:hr OR from:recruiting OR from:talent)`;
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: 50 // Reasonable limit
    });
    
    const messages = response.data.messages || [];
    console.log(`📧 Found ${messages.length} potential job-related emails`);
    
    let emailsProcessed = 0;
    let applicationsUpdated = 0;
    let emailsLinked = 0;
    
    // Process each message
    for (const message of messages) {
      try {
        // Get full message details
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full'
        });
        
        const headers = fullMessage.data.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        // Extract sender email and name
        const senderMatch = from.match(/^(.+?)\s*<(.+)>$/) || ['', '', from];
        const senderName = senderMatch[1]?.trim() || '';
        const senderEmail = senderMatch[2]?.trim() || from;
        
        // Get message body snippet
        const snippet = fullMessage.data.snippet || '';
        
        console.log(`📧 Processing: ${subject.substring(0, 50)}... from ${senderEmail}`);
        
        // Check if we've already processed this email
        const { data: existingEmail } = await supabaseAdmin
          .from('application_emails')
          .select('id')
          .eq('gmail_message_id', message.id!)
          .eq('user_id', userId)
          .single();
        
        if (existingEmail) {
          console.log(`⏭️ Email already processed: ${message.id}`);
          continue;
        }
        
        // Try to match email to an application
        const { data: matchedAppId, error: matchError } = await supabaseAdmin
          .rpc('match_email_to_application', {
            p_user_id: userId,
            p_sender_email: senderEmail,
            p_subject: subject,
            p_snippet: snippet
          });
        
        if (matchError) {
          console.error('❌ Error matching email to application:', matchError);
          continue;
        }
        
        if (!matchedAppId) {
          console.log(`🤷 No matching application found for email from ${senderEmail}`);
          emailsProcessed++;
          continue;
        }
        
        console.log(`✅ Matched email to application: ${matchedAppId}`);
        
        // Analyze email content to determine status
        const statusAnalysis = analyzeEmailForStatus(subject, snippet, senderEmail);
        
        // Store the email data
        const { error: emailInsertError } = await supabaseAdmin
          .from('application_emails')
          .insert({
            application_id: matchedAppId,
            user_id: userId,
            gmail_message_id: message.id!,
            gmail_thread_id: fullMessage.data.threadId!,
            sender_email: senderEmail,
            sender_name: senderName,
            subject: subject,
            received_at: new Date(date || Date.now()).toISOString(),
            email_snippet: snippet,
            status_detected: statusAnalysis.suggestedStatus,
            confidence_score: statusAnalysis.confidence,
            ai_analysis: {
              keywords: statusAnalysis.keywords,
              sentiment: statusAnalysis.sentiment,
              category: statusAnalysis.category,
              reasoning: statusAnalysis.reasoning
            }
          });
        
        if (emailInsertError) {
          console.error('❌ Failed to insert email record:', emailInsertError);
          continue;
        }
        
        emailsLinked++;
        
        // Update application status if confidence is high enough
        if (statusAnalysis.confidence >= 0.7 && statusAnalysis.suggestedStatus) {
          const emailData = {
            message_id: message.id,
            subject: subject,
            from: senderEmail,
            received_at: new Date(date || Date.now()).toISOString(),
            snippet: snippet
          };
          
          const { data: statusUpdated, error: statusError } = await supabaseAdmin
            .rpc('update_application_status', {
              p_application_id: matchedAppId,
              p_user_id: userId,
              p_new_status: statusAnalysis.suggestedStatus,
              p_trigger_type: 'email',
              p_trigger_source: message.id,
              p_notes: `Status updated from email: ${subject}`,
              p_email_data: emailData
            });
          
          if (statusError) {
            console.error('❌ Failed to update application status:', statusError);
          } else if (statusUpdated) {
            console.log(`🎯 Updated application status to: ${statusAnalysis.suggestedStatus}`);
            applicationsUpdated++;
          }
        }
        
        emailsProcessed++;
        
        // Rate limiting - small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (messageError) {
        console.error('❌ Error processing message:', messageError);
        continue;
      }
    }
    
    // Update sync statistics
    const { error: updateError } = await supabaseAdmin
      .from('gmail_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        total_emails_processed: (integration.total_emails_processed || 0) + emailsProcessed,
        responses_found: (integration.responses_found || 0) + emailsLinked,
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id);
    
    if (updateError) {
      console.error('❌ Failed to update sync stats:', updateError);
    }
    
    console.log(`✅ Gmail sync completed!`);
    console.log(`📊 Results: ${emailsProcessed} emails processed, ${emailsLinked} linked to applications, ${applicationsUpdated} statuses updated`);
    
    return NextResponse.json({
      success: true,
      emailsProcessed,
      emailsLinked,
      applicationsUpdated,
      message: `Sync completed! Processed ${emailsProcessed} emails, linked ${emailsLinked} to applications, updated ${applicationsUpdated} statuses`
    });
    
  } catch (error) {
    console.error('❌ Gmail sync error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync Gmail'
    }, { status: 500 });
  }
}

// Enhanced email analysis function
function analyzeEmailForStatus(subject: string, snippet: string, senderEmail: string): {
  suggestedStatus: string | null;
  confidence: number;
  keywords: string[];
  sentiment: string;
  category: string;
  reasoning: string;
} {
  const text = (subject + ' ' + snippet).toLowerCase();
  const domain = senderEmail.split('@')[1] || '';
  
  let suggestedStatus = null;
  let confidence = 0.3; // Base confidence
  let sentiment = 'neutral';
  let category = 'other';
  let keywords: string[] = [];
  let reasoning = '';
  
  // Check for interview-related content
  if (text.match(/interview|schedule|call|meeting|next step|phone|video|zoom|teams|calendar|book|available|slot/)) {
    suggestedStatus = 'interview_scheduled';
    confidence = 0.85;
    sentiment = 'positive';
    category = 'interview';
    keywords = extractKeywords(text, ['interview', 'schedule', 'call', 'meeting']);
    reasoning = 'Email mentions interview scheduling or meeting arrangements';
  }
  
  // Check for rejection content
  else if (text.match(/unfortunately|regret|not selected|not moving forward|different direction|other candidates|position has been filled|decided to proceed|thank you for your interest|will not be moving forward|have chosen to move forward with other candidates/)) {
    suggestedStatus = 'rejected';
    confidence = 0.9;
    sentiment = 'negative';
    category = 'rejection';
    keywords = extractKeywords(text, ['unfortunately', 'regret', 'not selected', 'rejected']);
    reasoning = 'Email contains rejection language and terminology';
  }
  
  // Check for offer-related content
  else if (text.match(/offer|congratulations|pleased to offer|selected|excited to extend|welcome to|onboarding|start date|salary|compensation/)) {
    suggestedStatus = 'offer_received';
    confidence = 0.88;
    sentiment = 'positive';
    category = 'offer';
    keywords = extractKeywords(text, ['offer', 'congratulations', 'selected', 'onboarding']);
    reasoning = 'Email suggests job offer or positive selection';
  }
  
  // Check for application confirmation
  else if (text.match(/received|application|confirmation|thank you|acknowledge|review|submitted|under review/)) {
    suggestedStatus = 'under_review';
    confidence = 0.6;
    sentiment = 'neutral';
    category = 'confirmation';
    keywords = extractKeywords(text, ['received', 'confirmation', 'review', 'submitted']);
    reasoning = 'Email confirms application receipt or indicates review process';
  }
  
  // Check for follow-up requests
  else if (text.match(/follow.?up|additional information|questions|clarification|more details|portfolio|references/)) {
    suggestedStatus = 'additional_info_requested';
    confidence = 0.7;
    sentiment = 'neutral';
    category = 'follow_up';
    keywords = extractKeywords(text, ['follow-up', 'additional', 'questions', 'information']);
    reasoning = 'Email requests additional information or follow-up';
  }
  
  // Boost confidence for corporate domains
  if (domain.match(/\.(com|org|net)$/) && !domain.match(/(gmail|yahoo|hotmail|outlook)/)) {
    confidence += 0.1;
  }
  
  // Boost confidence for HR/recruiting emails
  if (senderEmail.match(/(hr|recruiting|talent|noreply|careers|jobs)/)) {
    confidence += 0.1;
  }
  
  // Cap confidence at 0.95
  confidence = Math.min(0.95, confidence);
  
  return {
    suggestedStatus,
    confidence,
    keywords,
    sentiment,
    category,
    reasoning
  };
}

// Helper function to extract relevant keywords
function extractKeywords(text: string, priorityKeywords: string[]): string[] {
  const allKeywords = text.toLowerCase().match(/\b(interview|rejection|position|job|opportunity|application|schedule|call|meeting|unfortunately|regret|thank|follow|status|update|offer|congratulations|selected|onboarding|review|confirmation|received)\b/g);
  const foundKeywords = allKeywords ? [...new Set(allKeywords)] : [];
  
  // Prioritize keywords from priority list
  const priority = foundKeywords.filter(kw => priorityKeywords.some(pk => kw.includes(pk)));
  const others = foundKeywords.filter(kw => !priorityKeywords.some(pk => kw.includes(pk)));
  
  return [...priority, ...others].slice(0, 10); // Limit to 10 keywords
} 
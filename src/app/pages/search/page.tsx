"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageFormatter } from "@/components/MessageFormatter";
import { BrowserViewer } from "@/components/BrowserViewer";

interface Message {
  role: string;
  content: string;
  jobData?: any;
  showApplyAll?: boolean;
  totalJobs?: number;
}

export default function SearchPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey! What kind of job are you looking for?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentJobUrls, setCurrentJobUrls] = useState<string[]>([]);
  const [currentJobs, setCurrentJobs] = useState<any[]>([]);
  const [isAutoApplying, setIsAutoApplying] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<any[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [currentJobForApplication, setCurrentJobForApplication] = useState<any>(null);

  const handleAutoApply = async (jobUrls?: string[]) => {
    const urlsToApply = jobUrls || currentJobUrls;
    if (urlsToApply.length === 0) return;
    
    setIsAutoApplying(true);
    setSuggestedActions([]); // Clear suggested actions
    
    try {
      const response = await fetch('/api/agent/workflow/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: messages.find(m => m.role === 'user')?.content || 'Job search',
          jobUrls: urlsToApply,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const autoApplyMessage: Message = {
          role: "assistant",
          content: `🚀 **Auto-Apply Started!**\n\nI've started the automated application process for ${urlsToApply.length} jobs. Here's what I'm doing:\n\n1. **Website Checker** - Verifying each job link is accessible and has application forms\n2. **Form Analyzer** - Analyzing application forms to see if they can be auto-filled\n3. **Application Filler** - Automatically filling and submitting applications using your profile\n\nWorkflow ID: ${data.workflowId}\n\nI'll monitor the progress and update you with results...`
        };
        setMessages(prev => [...prev, autoApplyMessage]);
        
        // Start monitoring the workflow progress
        monitorWorkflowProgress(data.workflowId, urlsToApply);
      } else {
        throw new Error(data.error || 'Failed to start auto-apply');
      }
    } catch (error) {
      console.error('Auto-apply error:', error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I couldn't start the auto-apply process. Please try again or apply manually."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAutoApplying(false);
    }
  };

  const monitorWorkflowProgress = async (workflowId: string, jobUrls: string[]) => {
    let pollCount = 0;
    const maxPolls = 60; // Maximum 5 minutes of polling (5 second intervals)
    
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/agent/workflow/${workflowId}/status`);
        const data = await response.json();
        
        if (data.success) {
          const { workflow, progress, tasksByType, applications } = data;
          
          // Update user with progress
          if (workflow.status === 'processing' && pollCount % 6 === 0) { // Every 30 seconds
            const progressMessage: Message = {
              role: "assistant",
              content: `📊 **Progress Update**\n\n• Checked: ${tasksByType.website_checker.filter((t: any) => t.status === 'completed').length}/${tasksByType.website_checker.length} websites\n• Analyzed: ${tasksByType.form_analyzer.filter((t: any) => t.status === 'completed').length} forms\n• Applied: ${tasksByType.application_filler.filter((t: any) => t.status === 'completed').length} applications\n\nOverall progress: ${progress.percentage}%`
            };
            setMessages(prev => [...prev, progressMessage]);
          }
          
          // Check if workflow is complete
          if (workflow.status === 'completed' || workflow.status === 'failed') {
            const websiteResults = tasksByType.website_checker.filter((t: any) => t.status === 'completed');
            const accessibleSites = websiteResults.filter((t: any) => {
              try {
                const result = JSON.parse(t.result || '{}');
                return result.data?.accessible;
              } catch {
                return false;
              }
            });
            
            const formsFound = websiteResults.filter((t: any) => {
              try {
                const result = JSON.parse(t.result || '{}');
                return result.data?.hasJobApplication;
              } catch {
                return false;
              }
            });
            
            const completionMessage: Message = {
              role: "assistant",
              content: `✅ **Workflow Complete!**\n\n**Summary:**\n• ${websiteResults.length}/${jobUrls.length} websites checked\n• ${accessibleSites.length} websites accessible\n• ${formsFound.length} application forms found\n• ${workflow.successfulApplications} applications submitted\n• ${workflow.failedApplications} applications failed\n\n${applications.length > 0 ? `**Successful Applications:**\n${applications.map((app: any) => `• ${app.job_title} at ${app.company_name}`).join('\n')}` : '**No applications were submitted automatically.**\n\nThis could be because:\n- Websites had timeout issues\n- No application forms were found\n- Forms were too complex for auto-filling'}\n\nCheck the Applications page for more details.`
            };
            setMessages(prev => [...prev, completionMessage]);
            return; // Stop polling
          }
          
          pollCount++;
          if (pollCount < maxPolls) {
            setTimeout(pollStatus, 5000); // Poll every 5 seconds
          }
        }
      } catch (error) {
        console.error('Error polling workflow status:', error);
        pollCount++;
        if (pollCount < maxPolls) {
          setTimeout(pollStatus, 5000);
        }
      }
    };
    
    // Start polling after a short delay
    setTimeout(pollStatus, 3000);
  };

  const handleJobApply = async (jobIndex: number) => {
    const job = currentJobs[jobIndex - 1]; // jobIndex is 1-indexed
    
    if (job) {
      // Check various possible URL properties
      const jobUrl = job.url || job.link || job.apply_url || job.job_url;
      
      if (jobUrl) {
        // Generate a workflow ID for this application session
        const workflowId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        setCurrentJobForApplication(job);
        setActiveWorkflowId(workflowId);
        
        // Add a message showing which job we're applying to
        const applyingMessage: Message = {
          role: "assistant",
          content: `🚀 Opening **${job.title}** at **${job.company}** for manual application.\n\nUse the browser below to navigate to the application form, then click "Start Form Filling" when ready!`
        };
        setMessages(prev => [...prev, applyingMessage]);
        
      } else {
        // Job found but no URL
        const errorMessage: Message = {
          role: "assistant",
          content: `Found the job "${job.title}" at "${job.company}" but no application URL is available. This job may require manual application.`
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } else {
      // Job not found
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I couldn't find that job in the current search results. Please try searching again."
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSuggestedAction = async (action: any) => {
    switch (action.type) {
      case 'apply':
        if (action.data?.jobId !== undefined) {
          await handleJobApply(action.data.jobId);
        } else {
          // Apply to all jobs
          await handleAutoApply();
        }
        break;
      case 'search':
        if (action.data?.query) {
          setInput(action.data.query);
        }
        break;
      default:
        console.log('Unknown action type:', action.type);
    }
  };

  const handleFormFillComplete = async (result: any) => {
    if (result.success) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Successfully filled ${result.successfulFills} out of ${result.totalFields} form fields!\n\n**Documents Generated:**\n- Custom CV\n- Tailored Cover Letter\n\nPlease review the filled form and submit when ready.`
      }]);
    } else {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Form filling failed: ${result.error}\n\nPlease try again or fill the form manually.`
      }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setSuggestedActions([]); // Clear previous suggested actions

    try {
      // Call the agent chat API
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          context: messages,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const aiResponse: Message = {
          role: "assistant",
          content: data.response
        };
        setMessages(prev => [...prev, aiResponse]);
        
        // If there are search results, display them
        if (data.searchResults) {
          const criteriaMessage: Message = {
            role: "assistant",
            content: `Found your job criteria:\n• Role: ${data.searchResults.criteria.jobTitle}\n• Location: ${data.searchResults.criteria.location || 'Any'}\n• Remote: ${data.searchResults.criteria.remote ? 'Yes' : 'No'}\n• Salary: ${data.searchResults.criteria.salaryRange ? `$${data.searchResults.criteria.salaryRange.min || 0}k - $${data.searchResults.criteria.salaryRange.max || 'unlimited'}k` : 'Not specified'}\n• Experience: ${data.searchResults.criteria.experience || 'Any level'}`
          };
          setMessages(prev => [...prev, criteriaMessage]);
          
          if (data.searchResults.jobs && data.searchResults.jobs.length > 0) {
            // Extract job URLs for auto-apply
            const jobUrls = data.searchResults.jobs.map((job: any) => job.url).filter(Boolean);
            setCurrentJobUrls(jobUrls);
            setCurrentJobs(data.searchResults.jobs);
            
            // Add intro message
            const introMessage: Message = {
              role: "assistant",
              content: `Found ${data.searchResults.jobs.length} jobs that match your criteria! 🎯`
            };
            setMessages(prev => [...prev, introMessage]);
            
            // Add each job as a separate interactive bubble
            data.searchResults.jobs.forEach((job: any, index: number) => {
              const jobMessage: Message = {
                role: "assistant",
                content: `**${job.title}** at **${job.company}**\n📍 ${job.location} • ${job.remote}\n💰 ${job.salary}\n\n${job.description}`,
                jobData: {
                  ...job,
                  index: index + 1
                }
              };
              setMessages(prev => [...prev, jobMessage]);
            });
            
            // Add "Apply to All" option at the end
            const applyAllMessage: Message = {
              role: "assistant", 
              content: "Ready to apply? Choose individual jobs above or apply to all at once:",
              showApplyAll: true,
              totalJobs: data.searchResults.jobs.length
            };
            setMessages(prev => [...prev, applyAllMessage]);
          }
        }
        
        // If there are suggested actions, store them to display as buttons
        if (data.actions && data.actions.length > 0) {
          setSuggestedActions(data.actions);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Job Search</h1>
        <p className="text-[#66615E]">Tell me what kind of job you're looking for and I'll help you find and apply to relevant positions.</p>
      </div>

      {/* Credits Warning */}
      <div className="bg-[#F2F0EF] border border-[#C9C8C7] rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-[#66615E] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm text-black">
            You have <strong>47 credits</strong> remaining. Each search costs 5 credits, each application costs 1 credit.
          </span>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7]">
        {/* Messages */}
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-black text-[#F2F0EF]' 
                  : 'bg-[#F2F0EF] text-black'
              }`}>
                {message.role === 'user' ? (
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <MessageFormatter 
                    content={message.content}
                    jobData={message.jobData}
                    showApplyAll={message.showApplyAll}
                    totalJobs={message.totalJobs}
                    onJobApply={handleJobApply}
                    onApplyAll={() => handleAutoApply()}
                    isAutoApplying={isAutoApplying}
                  />
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#F2F0EF] rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[#66615E] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#66615E] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-[#66615E] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Actions */}
        {suggestedActions.length > 0 && (
          <div className="px-6 py-4 border-t border-[#C9C8C7] bg-[#F9F8F7]">
            <div className="flex flex-wrap gap-2">
              {suggestedActions.map((action, index) => (
                <Button
                  key={index}
                  onClick={() => handleSuggestedAction(action)}
                  disabled={isAutoApplying}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  size="sm"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="border-t border-[#C9C8C7] p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me about your ideal job..."
              className="flex-1 border-[#C9C8C7] focus:border-black focus:ring-black"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-black hover:bg-[#66615E] text-[#F2F0EF] disabled:opacity-50"
            >
              Send
            </Button>
          </form>
          

        </div>
      </div>

      {/* Browser Viewer or Quick Start Templates */}
      {activeWorkflowId && currentJobForApplication ? (
        <BrowserViewer
          jobUrl={currentJobForApplication.url || currentJobForApplication.link}
          workflowId={activeWorkflowId}
          onFormFillComplete={handleFormFillComplete}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-[#C9C8C7] p-6">
          <h2 className="text-xl font-semibold text-black mb-4">Quick Start Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline"
              onClick={() => setInput("I'm looking for entry-level software engineer positions in San Francisco, preferably remote or hybrid, with a salary around $80-100k")}
              className="p-4 h-auto text-left border-[#C9C8C7] hover:bg-[#F2F0EF] hover:text-black"
            >
              <div>
                <h3 className="font-medium text-black">Software Engineer</h3>
                <p className="text-sm text-[#66615E]">Entry-level, SF Bay Area, $80-100k</p>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setInput("I'm a recent marketing graduate looking for digital marketing coordinator roles, open to remote work, anywhere in the US")}
              className="p-4 h-auto text-left border-[#C9C8C7] hover:bg-[#F2F0EF] hover:text-black"
            >
              <div>
                <h3 className="font-medium text-black">Marketing Coordinator</h3>
                <p className="text-sm text-[#66615E]">Recent grad, Remote, US-wide</p>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setInput("I'm looking for product manager positions at startups, 2-3 years experience, in New York or remote")}
              className="p-4 h-auto text-left border-[#C9C8C7] hover:bg-[#F2F0EF] hover:text-black"
            >
              <div>
                <h3 className="font-medium text-black">Product Manager</h3>
                <p className="text-sm text-[#66615E]">Startup, 2-3 years, NYC/Remote</p>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setInput("I'm interested in data analyst roles at tech companies, entry to mid-level, preferably on-site in Seattle")}
              className="p-4 h-auto text-left border-[#C9C8C7] hover:bg-[#F2F0EF] hover:text-black"
            >
              <div>
                <h3 className="font-medium text-black">Data Analyst</h3>
                <p className="text-sm text-[#66615E]">Tech companies, Entry-Mid, Seattle</p>
              </div>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 
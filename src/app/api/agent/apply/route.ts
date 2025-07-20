import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSmartLLMService } from "@/lib/llm";
import { JobApplicationAgent } from "@/lib/agent/workflow";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, jobUrl, customization, userProfile } = await request.json();
    
    // Create agent and perform application
    const agent = new JobApplicationAgent(userId);
    const applicationResult = await performAgenticJobApplication({
      jobId,
      jobUrl,
      customization,
      userProfile,
      userId
    });
    
    return NextResponse.json({
      success: true,
      applicationId: applicationResult.id,
      status: applicationResult.status,
      coverLetter: applicationResult.coverLetter,
      customizedResume: applicationResult.customizedResume,
      creditsUsed: 1 // Each application costs 1 credit
    });
    
  } catch (error) {
    console.error("Application agent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function performAgenticJobApplication({
  jobId,
  jobUrl,
  customization,
  userProfile,
  userId
}: {
  jobId: string;
  jobUrl: string;
  customization: any;
  userProfile: any;
  userId: string;
}) {
  // TODO: Implement actual job scraping and application logic
  // For now, using mock data with LLM integration
  
  const mockJobDescription = {
    title: "Software Engineer",
    company: "TechCorp",
    location: "San Francisco, CA",
    description: "Looking for a software engineer to join our team...",
    requirements: ["JavaScript", "React", "Node.js", "5+ years experience"],
    benefits: ["Health insurance", "401k", "Remote work"],
    salary: "$120,000 - $150,000"
  };
  
  const mockUserProfile = {
    name: userProfile?.name || "John Doe",
    experience: userProfile?.experience || "5 years of software development",
    skills: userProfile?.skills || ["JavaScript", "React", "Node.js", "Python"],
    achievements: userProfile?.achievements || ["Led team of 3 developers", "Increased app performance by 40%"]
  };
  
  // Check AI availability first
  const llmResult = await getSmartLLMService();
  
  let coverLetter;
  let resumeBullets;
  
  if (llmResult.available && llmResult.service) {
    // Generate personalized cover letter using LLM
    coverLetter = await llmResult.service.generateCoverLetter({
      jobDescription: mockJobDescription,
      userProfile: mockUserProfile,
      tone: customization?.tone || 'professional'
    });
    
    // TODO: Customize resume bullets using LLM
    resumeBullets = await llmResult.service.customizeResumeBullets({
      jobDescription: mockJobDescription,
      originalBullets: [
        "Developed web applications using React and Node.js",
        "Collaborated with cross-functional teams",
        "Optimized application performance"
      ],
      userSkills: mockUserProfile.skills
    });
  } else {
    // AI unavailable - use basic templates
    coverLetter = {
      content: `Dear ${mockJobDescription.company} Hiring Manager,\n\nI am writing to express my interest in the ${mockJobDescription.title} position. AI features are temporarily unavailable, but I am excited about this opportunity.\n\nBest regards,\n${mockUserProfile.name}`,
      tone: 'professional',
      keyPoints: ['Interest in position', 'Relevant experience'],
      aiGenerated: false
    };
    
    resumeBullets = {
      bullets: [
        "Developed web applications using React and Node.js",
        "Collaborated with cross-functional teams",
        "Optimized application performance"
      ],
      aiGenerated: false
    };
  }
  
  return {
    id: `app-${Date.now()}`,
    status: "submitted",
    appliedAt: new Date().toISOString(),
    customizedResume: resumeBullets,
    coverLetter: coverLetter
  };
} 
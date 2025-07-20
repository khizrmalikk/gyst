export interface AgentResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  retryable?: boolean;
}

export interface AgentTask {
  id: string;
  type: AgentType;
  jobId: string;
  jobUrl: string;
  payload: any;
  priority: number;
  maxRetries: number;
  currentRetry: number;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  assignedAgent?: string;
  result?: AgentResult;
}

export enum AgentType {
  WEBSITE_CHECKER = 'website_checker',
  FORM_ANALYZER = 'form_analyzer',
  APPLICATION_FILLER = 'application_filler'
}

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface WorkflowState {
  id: string;
  userId: string;
  searchQuery: string;
  totalJobs: number;
  processedJobs: number;
  successfulApplications: number;
  failedApplications: number;
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
  tasks: AgentTask[];
}

export enum WorkflowStatus {
  INITIALIZING = 'initializing',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface AgentContext {
  workflowId: string;
  userId: string;
  userProfile: any;
  tools: AgentTools;
}

export interface AgentTools {
  browser: any; // Playwright browser instance
  llm: any; // LLM client
  database: any; // Database client
}

export interface WebsiteCheckResult {
  accessible: boolean;
  hasJobApplication: boolean;
  applicationFormUrl?: string;
  errorMessage?: string;
  screenshots?: string[];
  formElements?: FormElement[];
}

export interface FormElement {
  type: string;
  name: string;
  id?: string;
  label?: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface ApplicationFormData {
  personalInfo: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    zipCode?: string;
  };
  workExperience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
  }>;
  skills: string[];
  coverLetter?: string;
  resumeUrl?: string;
} 
# Agent Workflow System

A sophisticated agentic workflow system for automated job applications that can check websites, analyze forms, and automatically fill and submit job applications.

## Architecture Overview

The system follows an **orchestrator pattern** with multiple specialized agents:

```
Orchestrator (Central Coordinator)
├── Website Checker Agent
├── Form Analyzer Agent
└── Application Filler Agent
```

### Core Components

#### 1. **Orchestrator** (`orchestrator.ts`)
- Central coordinator that manages the entire workflow
- Maintains context of all tasks and agents
- Handles task delegation, retry logic, and workflow state
- Provides real-time updates and progress tracking

#### 2. **Website Checker Agent** (`website-checker.ts`)
- Verifies job website accessibility
- Detects job application forms
- Extracts form elements and structure
- Takes screenshots for documentation

#### 3. **Form Analyzer Agent** (`form-analyzer.ts`)
- Analyzes form fields and their types
- Determines if forms can be auto-filled
- Calculates confidence scores
- Generates auto-fill strategies

#### 4. **Application Filler Agent** (`application-filler.ts`)
- Executes form filling based on strategies
- Handles different input types (text, select, file uploads)
- Submits applications automatically
- Verifies successful submission

## Key Features

### 🤖 **Multi-Agent Coordination**
- Agents communicate through the orchestrator
- Context sharing between agents
- Automatic retry and error handling
- Real-time progress monitoring

### 🔍 **Intelligent Form Detection**
- Automatic detection of job application forms
- Field type recognition and mapping
- Support for complex form structures
- Screenshot capture for debugging

### 📊 **Confidence Scoring**
- Calculates likelihood of successful auto-fill
- Identifies required vs optional fields
- Provides detailed analysis reports

### 🎯 **Smart Form Filling**
- Maps user profile data to form fields
- Handles different input types automatically
- File upload support (CV/resume)
- Fallback to LLM-guided filling

### 📈 **Progress Tracking**
- Real-time workflow status updates
- Detailed task-level progress
- Comprehensive logging system
- Success/failure metrics

## Database Schema

### Core Tables

#### `workflows`
- Tracks overall job application workflows
- Stores progress metrics and status
- Links to user profiles

#### `agent_tasks`
- Individual tasks for each agent
- Priority-based task queue
- Retry logic and failure handling

#### `agent_logs`
- Detailed logging for debugging
- Performance monitoring
- Error tracking

#### `job_applications`
- Successful application records
- Screenshot storage
- Application data backup

## API Endpoints

### Start Workflow
```
POST /api/agent/workflow/start
```
Initiates automated job application process

### Monitor Status
```
GET /api/agent/workflow/[workflowId]/status
```
Real-time workflow progress and statistics

## Usage Example

```typescript
// Start agent workflow
const response = await fetch('/api/agent/workflow/start', {
  method: 'POST',
  body: JSON.stringify({
    searchQuery: 'Software Engineer San Francisco',
    jobUrls: ['https://company.com/job1', 'https://company.com/job2']
  })
});

// Monitor progress
const status = await fetch(`/api/agent/workflow/${workflowId}/status`);
```

## Workflow Process

1. **Initialization**
   - Create workflow record
   - Generate initial tasks for each job URL
   - Set up agent context

2. **Website Checking**
   - Verify each job URL is accessible
   - Find application forms
   - Extract form structure

3. **Form Analysis**
   - Analyze form fields
   - Calculate auto-fill confidence
   - Generate filling strategy

4. **Application Submission**
   - Fill forms using user profile
   - Submit applications
   - Verify successful submission

5. **Completion**
   - Update workflow status
   - Generate completion report
   - Store results

## Error Handling

- **Retry Logic**: Configurable retry attempts for failed tasks
- **Graceful Degradation**: Fallback to manual process if automation fails
- **Detailed Logging**: Comprehensive error tracking and debugging
- **Screenshot Capture**: Visual documentation of failures

## Security Considerations

- **User Data Protection**: Secure handling of profile information
- **Rate Limiting**: Prevents overwhelming target websites
- **Permission Checks**: Validates user ownership of workflows
- **Data Encryption**: Sensitive data encrypted in database

## Performance Optimizations

- **Parallel Processing**: Multiple agents work simultaneously
- **Intelligent Queuing**: Priority-based task execution
- **Resource Management**: Efficient browser instance management
- **Caching**: Form analysis results cached for reuse

## Future Enhancements

- **Machine Learning**: Improve form detection accuracy
- **Browser Fingerprinting**: Better anti-bot detection evasion
- **Captcha Solving**: Integration with captcha solving services
- **Mobile Support**: Mobile-optimized form filling
- **Analytics Dashboard**: Advanced workflow analytics

## Technology Stack

- **Playwright**: Web automation and browser control
- **TypeScript**: Type-safe development
- **Next.js**: API endpoints and routing
- **Supabase**: Database and real-time updates
- **OpenAI**: LLM-powered form analysis
- **Clerk**: Authentication and user management

## Development Notes

- Agents inherit from `BaseAgent` for common functionality
- All database operations use admin client to bypass RLS
- Screenshots stored for debugging and verification
- Comprehensive logging for monitoring and debugging
- Real-time status updates via database triggers 
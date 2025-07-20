import { WorkflowState, WorkflowStatus, AgentTask, AgentType, TaskStatus, AgentContext, AgentResult } from './types';
import { BaseAgent } from './base-agent';
import { WebsiteCheckerAgent } from './website-checker';
import { FormAnalyzerAgent } from './form-analyzer';
import { ApplicationFillerAgent } from './application-filler';
import { chromium } from 'playwright';

export class Orchestrator {
  private workflowState: WorkflowState;
  private agents: Map<AgentType, BaseAgent>;
  private isRunning: boolean = false;
  private context: AgentContext;

  constructor(
    workflowState: WorkflowState,
    context: AgentContext
  ) {
    this.workflowState = workflowState;
    this.context = context;
    this.agents = new Map();
    this.initializeAgents();
  }

  private initializeAgents(): void {
    this.agents.set(AgentType.WEBSITE_CHECKER, new WebsiteCheckerAgent(this.context));
    this.agents.set(AgentType.FORM_ANALYZER, new FormAnalyzerAgent(this.context));
    this.agents.set(AgentType.APPLICATION_FILLER, new ApplicationFillerAgent(this.context));
  }

  async startWorkflow(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Workflow is already running');
    }

    this.isRunning = true;
    await this.updateWorkflowStatus(WorkflowStatus.PROCESSING);
    
    try {
      // Launch browser instance for all agents
      const browser = await chromium.launch({ headless: false });
      this.context.tools.browser = browser;

      await this.log('Workflow started');
      
      // Process tasks in a loop
      while (this.isRunning && await this.hasPendingTasks()) {
        await this.processNextTask();
        await this.delay(1000); // Small delay between tasks
      }

      await this.completeWorkflow();
    } catch (error) {
      await this.handleWorkflowError(error);
    } finally {
      // Clean up browser
      if (this.context.tools.browser) {
        await this.context.tools.browser.close();
      }
      this.isRunning = false;
    }
  }

  async stopWorkflow(): Promise<void> {
    this.isRunning = false;
    await this.updateWorkflowStatus(WorkflowStatus.CANCELLED);
    await this.log('Workflow stopped by user');
  }

  private async processNextTask(): Promise<void> {
    const task = await this.getNextTask();
    if (!task) {
      return;
    }

    const agent = this.agents.get(task.type);
    if (!agent) {
      await this.log(`No agent found for task type: ${task.type}`, 'error');
      return;
    }

    await this.log(`Processing task ${task.id} with agent ${task.type}`);
    
    try {
      // Update task status to in progress
      await this.updateTaskStatus(task.id, TaskStatus.IN_PROGRESS);
      
      // Execute the task
      const result = await agent.execute(task);
      
      // Handle the result
      await this.handleTaskResult(task, result);
      
    } catch (error) {
      await this.handleTaskError(task, error);
    }
  }

  private async handleTaskResult(task: AgentTask, result: AgentResult): Promise<void> {
    if (result.success) {
      await this.updateTaskStatus(task.id, TaskStatus.COMPLETED, result);
      await this.createFollowUpTasks(task, result);
      await this.log(`Task ${task.id} completed successfully`);
    } else {
      if (result.retryable && task.currentRetry < task.maxRetries) {
        // Retry the task
        await this.retryTask(task);
      } else {
        await this.updateTaskStatus(task.id, TaskStatus.FAILED, result);
        await this.log(`Task ${task.id} failed: ${result.message}`, 'error');
      }
    }
  }

  private async createFollowUpTasks(task: AgentTask, result: AgentResult): Promise<void> {
    switch (task.type) {
      case AgentType.WEBSITE_CHECKER:
        if (result.data?.accessible && result.data?.hasJobApplication) {
          // Create form analyzer task
          await this.createTask({
            type: AgentType.FORM_ANALYZER,
            jobId: task.jobId,
            jobUrl: task.jobUrl,
            payload: {
              websiteResult: result.data,
              applicationFormUrl: result.data.applicationFormUrl
            }
          });
        }
        break;
        
      case AgentType.FORM_ANALYZER:
        if (result.data?.canAutoFill) {
          // Create application filler task
          await this.createTask({
            type: AgentType.APPLICATION_FILLER,
            jobId: task.jobId,
            jobUrl: task.jobUrl,
            payload: {
              formData: result.data,
              applicationFormUrl: result.data.applicationFormUrl
            }
          });
        }
        break;
        
      case AgentType.APPLICATION_FILLER:
        if (result.data?.submitted) {
          this.workflowState.successfulApplications++;
        } else {
          this.workflowState.failedApplications++;
        }
        this.workflowState.processedJobs++;
        break;
    }
  }

  private async retryTask(task: AgentTask): Promise<void> {
    await this.updateTaskInDatabase(task.id, {
      status: TaskStatus.PENDING,
      current_retry: task.currentRetry + 1,
      updated_at: new Date().toISOString()
    });
    
    await this.log(`Retrying task ${task.id}, attempt ${task.currentRetry + 1}`);
  }

  private async handleTaskError(task: AgentTask, error: any): Promise<void> {
    const errorResult: AgentResult = {
      success: false,
      message: 'Task execution failed',
      error: error.message,
      retryable: true
    };

    await this.handleTaskResult(task, errorResult);
  }

  private async getNextTask(): Promise<AgentTask | null> {
    try {
      const { data, error } = await this.context.tools.database
        .from('agent_tasks')
        .select('*')
        .eq('workflow_id', this.workflowState.id)
        .eq('status', TaskStatus.PENDING)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        await this.log(`Error fetching next task: ${error.message}`, 'error');
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Transform database result to match AgentTask interface
      const dbTask = data[0];
      const task: AgentTask = {
        id: dbTask.id,
        type: dbTask.type,
        jobId: dbTask.job_id,
        jobUrl: dbTask.job_url,
        payload: typeof dbTask.payload === 'string' ? JSON.parse(dbTask.payload) : dbTask.payload,
        priority: dbTask.priority,
        maxRetries: dbTask.max_retries,
        currentRetry: dbTask.current_retry,
        status: dbTask.status,
        createdAt: new Date(dbTask.created_at),
        updatedAt: new Date(dbTask.updated_at),
        assignedAgent: dbTask.assigned_agent,
        result: dbTask.result ? JSON.parse(dbTask.result) : undefined
      };

      return task;
    } catch (error) {
      await this.log(`Error fetching next task: ${error}`, 'error');
      return null;
    }
  }

  private async createTask(taskData: {
    type: AgentType;
    jobId: string;
    jobUrl: string;
    payload: any;
  }): Promise<void> {
    const task: Partial<AgentTask> = {
      id: `${taskData.type}-${taskData.jobId}-${Date.now()}`,
      type: taskData.type,
      jobId: taskData.jobId,
      jobUrl: taskData.jobUrl,
      payload: taskData.payload,
      priority: this.getTaskPriority(taskData.type),
      maxRetries: 3,
      currentRetry: 0,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const { error } = await this.context.tools.database
        .from('agent_tasks')
        .insert({
          ...task,
          workflow_id: this.workflowState.id,
          payload: JSON.stringify(task.payload)
        });

      if (error) {
        await this.log(`Error creating task: ${error.message}`, 'error');
      }
    } catch (error) {
      await this.log(`Error creating task: ${error}`, 'error');
    }
  }

  private getTaskPriority(type: AgentType): number {
    switch (type) {
      case AgentType.WEBSITE_CHECKER:
        return 1;
      case AgentType.FORM_ANALYZER:
        return 2;
      case AgentType.APPLICATION_FILLER:
        return 3;
      default:
        return 0;
    }
  }

  private async updateTaskStatus(taskId: string, status: TaskStatus, result?: AgentResult): Promise<void> {
    await this.updateTaskInDatabase(taskId, {
      status,
      result: result ? JSON.stringify(result) : null,
      updated_at: new Date().toISOString()
    });
  }

  private async updateTaskInDatabase(taskId: string, updates: any): Promise<void> {
    try {
      const { error } = await this.context.tools.database
        .from('agent_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) {
        await this.log(`Error updating task ${taskId}: ${error.message}`, 'error');
      }
    } catch (error) {
      await this.log(`Error updating task ${taskId}: ${error}`, 'error');
    }
  }

  private async updateWorkflowStatus(status: WorkflowStatus): Promise<void> {
    this.workflowState.status = status;
    this.workflowState.updatedAt = new Date();

    try {
      const { error } = await this.context.tools.database
        .from('workflows')
        .update({
          status,
          processed_jobs: this.workflowState.processedJobs,
          successful_applications: this.workflowState.successfulApplications,
          failed_applications: this.workflowState.failedApplications,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.workflowState.id);

      if (error) {
        await this.log(`Error updating workflow status: ${error.message}`, 'error');
      }
    } catch (error) {
      await this.log(`Error updating workflow status: ${error}`, 'error');
    }
  }

  private async hasPendingTasks(): Promise<boolean> {
    try {
      const { data, error } = await this.context.tools.database
        .from('agent_tasks')
        .select('id')
        .eq('workflow_id', this.workflowState.id)
        .eq('status', TaskStatus.PENDING)
        .limit(1);

      if (error) {
        await this.log(`Error checking pending tasks: ${error.message}`, 'error');
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      await this.log(`Error checking pending tasks: ${error}`, 'error');
      return false;
    }
  }

  private async completeWorkflow(): Promise<void> {
    await this.updateWorkflowStatus(WorkflowStatus.COMPLETED);
    await this.log('Workflow completed successfully');
  }

  private async handleWorkflowError(error: any): Promise<void> {
    await this.updateWorkflowStatus(WorkflowStatus.FAILED);
    await this.log(`Workflow failed: ${error.message}`, 'error');
  }

  private async log(message: string, level: 'info' | 'error' | 'debug' = 'info'): Promise<void> {
    const logEntry = {
      workflow_id: this.workflowState.id,
      agent_type: 'orchestrator',
      message,
      level,
      timestamp: new Date().toISOString()
    };

    try {
      await this.context.tools.database
        .from('agent_logs')
        .insert(logEntry);
    } catch (error) {
      console.error('Error logging message:', error);
    }

    console.log(`[ORCHESTRATOR] ${message}`);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 
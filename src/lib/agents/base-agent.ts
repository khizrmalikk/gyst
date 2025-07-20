import { AgentResult, AgentTask, AgentContext, AgentType, TaskStatus } from './types';

export abstract class BaseAgent {
  protected agentType: AgentType;
  protected context: AgentContext;
  
  constructor(agentType: AgentType, context: AgentContext) {
    this.agentType = agentType;
    this.context = context;
  }

  abstract execute(task: AgentTask): Promise<AgentResult>;

  protected async updateTaskStatus(taskId: string, status: TaskStatus, result?: AgentResult): Promise<void> {
    try {
      const { data, error } = await this.context.tools.database
        .from('agent_tasks')
        .update({
          status,
          result: result ? JSON.stringify(result) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task status:', error);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  }

  protected async log(message: string, level: 'info' | 'error' | 'debug' = 'info'): Promise<void> {
    const logEntry = {
      workflow_id: this.context.workflowId,
      agent_type: this.agentType,
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

    // Also log to console for debugging
    console.log(`[${this.agentType}] ${message}`);
  }

  protected createSuccessResult(message: string, data?: any): AgentResult {
    return {
      success: true,
      message,
      data,
      retryable: false
    };
  }

  protected createErrorResult(message: string, error?: string, retryable: boolean = false): AgentResult {
    return {
      success: false,
      message,
      error,
      retryable
    };
  }

  protected async takeScreenshot(page: any, name: string): Promise<string> {
    try {
      const screenshotPath = `screenshots/${this.context.workflowId}/${name}-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return screenshotPath;
    } catch (error) {
      await this.log(`Error taking screenshot: ${error}`, 'error');
      return '';
    }
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 
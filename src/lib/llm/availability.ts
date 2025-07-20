// OpenAI availability checker without consuming credits
export interface AIAvailability {
  available: boolean;
  provider: 'openai' | 'unavailable';
  reason?: string;
  message?: string;
}

let lastAvailabilityCheck: {
  timestamp: number;
  result: AIAvailability;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function checkAIAvailability(): Promise<AIAvailability> {
  // Use cached result if available and recent
  if (lastAvailabilityCheck && 
      Date.now() - lastAvailabilityCheck.timestamp < CACHE_DURATION) {
    return lastAvailabilityCheck.result;
  }

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    const result: AIAvailability = {
      available: false,
      provider: 'unavailable',
      reason: 'no_api_key',
      message: 'AI features are currently unavailable. Please contact support for assistance.'
    };
    
    lastAvailabilityCheck = {
      timestamp: Date.now(),
      result
    };
    
    return result;
  }

  try {
    // Make a minimal, cheap API call to check quota status
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Use the models endpoint - it's free and just checks authentication
    await openai.models.list();
    
    const result: AIAvailability = {
      available: true,
      provider: 'openai'
    };
    
    lastAvailabilityCheck = {
      timestamp: Date.now(),
      result
    };
    
    return result;
    
  } catch (error: any) {
    let reason = 'unknown_error';
    let message = 'AI features are temporarily unavailable. Please try again later.';
    
    if (error?.status === 429 || error?.code === 'insufficient_quota') {
      reason = 'quota_exceeded';
      message = 'AI features are temporarily unavailable due to high demand. Please try again later or contact support.';
    } else if (error?.status === 401) {
      reason = 'invalid_key';
      message = 'AI features are currently unavailable. Please contact support for assistance.';
    } else if (error?.status >= 500) {
      reason = 'service_error';
      message = 'AI services are experiencing temporary issues. Please try again in a few minutes.';
    }
    
    const result: AIAvailability = {
      available: false,
      provider: 'unavailable',
      reason,
      message
    };
    
    lastAvailabilityCheck = {
      timestamp: Date.now(),
      result
    };
    
    return result;
  }
}

// Force refresh the availability check
export function clearAvailabilityCache(): void {
  lastAvailabilityCheck = null;
}

// Get user-friendly status message
export function getAIStatusMessage(availability: AIAvailability): string {
  if (availability.available) {
    return 'AI features are fully operational.';
  }
  
  return availability.message || 'AI features are currently unavailable.';
} 
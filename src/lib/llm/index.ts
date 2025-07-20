// Main LLM service exports
export { openaiService, OpenAIService } from './openai';
export { fallbackLLMService, FallbackLLMService } from './fallback';
export { checkAIAvailability, getAIStatusMessage, clearAvailabilityCache } from './availability';
export type { JobCriteria, JobDescription } from './openai';
export type { AIAvailability } from './availability';

// Import for internal use
import { openaiService } from './openai';
import { fallbackLLMService } from './fallback';
import { checkAIAvailability } from './availability';
import { OpenAI } from 'openai';

// Smart LLM service that checks availability first
export const getSmartLLMService = async () => {
  const availability = await checkAIAvailability();
  
  if (availability.available) {
    return {
      service: openaiService,
      available: true,
      message: undefined
    };
  } else {
    return {
      service: null,
      available: false,
      message: availability.message
    };
  }
};

// LLM service factory (for future support of multiple providers)
export const getLLMService = (provider: 'openai' | 'fallback' = 'openai') => {
  switch (provider) {
    case 'openai':
      return openaiService;
    case 'fallback':
      return fallbackLLMService;
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
};

// Direct LLM client for low-level access
export const getLLMClient = (): OpenAI => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  
  return new OpenAI({
    apiKey
  });
};

// Utility functions
export const isLLMConfigured = (): boolean => {
  return !!process.env.OPENAI_API_KEY;
};

export const validateLLMConfig = (): { 
  isValid: boolean; 
  errors: string[] 
} => {
  const errors: string[] = [];
  
  if (!process.env.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is not configured');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}; 
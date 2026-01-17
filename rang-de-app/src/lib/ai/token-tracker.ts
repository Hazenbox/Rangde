/**
 * Token Usage Tracker
 * Estimates and tracks token consumption for AI requests
 */

import { aiLogger } from './logger';

const STORAGE_KEY = 'ai-token-usage';

export interface TokenUsage {
  totalTokens: number;
  requestCount: number;
  lastReset: number;
  history: Array<{
    timestamp: number;
    estimatedTokens: number;
    type: 'request' | 'response';
  }>;
}

/**
 * Rough token estimation (chars / 4)
 * This is a simplified approximation. Actual token count may vary.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Get current token usage from localStorage
 */
export function getTokenUsage(): TokenUsage {
  if (typeof window === 'undefined') {
    return {
      totalTokens: 0,
      requestCount: 0,
      lastReset: Date.now(),
      history: [],
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Reset if more than 30 days old
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      if (parsed.lastReset < thirtyDaysAgo) {
        return resetTokenUsage();
      }
      
      return parsed;
    }
  } catch (error) {
    aiLogger.warn('Failed to load token usage:', error);
  }

  return {
    totalTokens: 0,
    requestCount: 0,
    lastReset: Date.now(),
    history: [],
  };
}

/**
 * Track token usage
 */
export function trackTokenUsage(
  text: string, 
  type: 'request' | 'response'
): void {
  if (typeof window === 'undefined') return;

  try {
    const usage = getTokenUsage();
    const estimatedTokens = estimateTokens(text);

    usage.totalTokens += estimatedTokens;
    if (type === 'request') {
      usage.requestCount++;
    }

    // Add to history (keep last 50 entries)
    usage.history.push({
      timestamp: Date.now(),
      estimatedTokens,
      type,
    });
    
    if (usage.history.length > 50) {
      usage.history = usage.history.slice(-50);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
    
    aiLogger.debug(`Tracked ${estimatedTokens} tokens (${type})`);
  } catch (error) {
    aiLogger.warn('Failed to track token usage:', error);
  }
}

/**
 * Reset token usage
 */
export function resetTokenUsage(): TokenUsage {
  const newUsage: TokenUsage = {
    totalTokens: 0,
    requestCount: 0,
    lastReset: Date.now(),
    history: [],
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
      aiLogger.info('Token usage reset');
    } catch (error) {
      aiLogger.warn('Failed to reset token usage:', error);
    }
  }

  return newUsage;
}

/**
 * Get usage statistics
 */
export function getUsageStats(): {
  totalTokens: number;
  requestCount: number;
  averageTokensPerRequest: number;
  estimatedCost: number; // Rough estimate based on Gemini pricing
  daysTracked: number;
} {
  const usage = getTokenUsage();
  const daysTracked = Math.max(1, Math.ceil((Date.now() - usage.lastReset) / (24 * 60 * 60 * 1000)));
  const averageTokensPerRequest = usage.requestCount > 0 
    ? Math.round(usage.totalTokens / usage.requestCount)
    : 0;

  // Rough cost estimate (Gemini 1.5 Flash is free up to 15 RPM, then ~$0.075 per 1M tokens)
  // This is just an estimate for awareness
  const estimatedCost = (usage.totalTokens / 1000000) * 0.075;

  return {
    totalTokens: usage.totalTokens,
    requestCount: usage.requestCount,
    averageTokensPerRequest,
    estimatedCost,
    daysTracked,
  };
}

/**
 * Check if approaching token limits (warning threshold)
 */
export function isApproachingLimit(): boolean {
  const usage = getTokenUsage();
  const MONTHLY_WARNING_THRESHOLD = 1000000; // 1M tokens per month
  
  return usage.totalTokens > MONTHLY_WARNING_THRESHOLD;
}

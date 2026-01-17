/**
 * Retry Utility
 * Implements exponential backoff for failed requests
 */

import { aiLogger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: ['429', '500', '502', '503', '504', 'timeout', 'network', 'ECONNRESET'],
  onRetry: () => {},
};

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  const errorMessage = error.message.toLowerCase();
  return retryableErrors.some(pattern => 
    errorMessage.includes(pattern.toLowerCase())
  );
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number, 
  initialDelay: number, 
  maxDelay: number, 
  backoffMultiplier: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry = 
        attempt <= opts.maxRetries && 
        isRetryableError(lastError, opts.retryableErrors);

      if (!shouldRetry) {
        aiLogger.error(`Request failed after ${attempt} attempt(s):`, lastError);
        throw lastError;
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt, 
        opts.initialDelay, 
        opts.maxDelay, 
        opts.backoffMultiplier
      );

      aiLogger.warn(
        `Request failed (attempt ${attempt}/${opts.maxRetries + 1}). ` +
        `Retrying in ${delay}ms...`,
        lastError.message
      );

      // Call onRetry callback
      opts.onRetry(attempt, lastError);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Retry a fetch request with exponential backoff
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, init);
    
    // Check if response indicates a retryable error
    if (response.status === 429 || response.status >= 500) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }, options);
}

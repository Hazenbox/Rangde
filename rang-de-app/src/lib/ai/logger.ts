/**
 * AI Debug Logger
 * Conditional logging utility for development
 */

const IS_DEV = process.env.NODE_ENV === 'development';
const AI_DEBUG = typeof window !== 'undefined' && localStorage.getItem('AI_DEBUG') === 'true';

export const aiLogger = {
  /**
   * Log debug information (only in development or when AI_DEBUG is enabled)
   */
  debug: (...args: any[]) => {
    if (IS_DEV || AI_DEBUG) {
      console.log('[AI Debug]', ...args);
    }
  },

  /**
   * Log informational messages (only in development or when AI_DEBUG is enabled)
   */
  info: (...args: any[]) => {
    if (IS_DEV || AI_DEBUG) {
      console.info('[AI Info]', ...args);
    }
  },

  /**
   * Log warnings (always shown)
   */
  warn: (...args: any[]) => {
    console.warn('[AI Warning]', ...args);
  },

  /**
   * Log errors (always shown)
   */
  error: (...args: any[]) => {
    console.error('[AI Error]', ...args);
  },

  /**
   * Enable debug mode
   */
  enableDebug: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('AI_DEBUG', 'true');
      console.log('[AI] Debug mode enabled. Reload the page to see debug logs.');
    }
  },

  /**
   * Disable debug mode
   */
  disableDebug: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('AI_DEBUG');
      console.log('[AI] Debug mode disabled.');
    }
  },
};

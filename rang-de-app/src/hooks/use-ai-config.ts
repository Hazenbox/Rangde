/**
 * AI Configuration Hook
 * Manages AI service configuration and API keys
 */

import { useState, useEffect } from 'react';
import type { AIServiceConfig, AIUsageStats } from '@/types/ai';
import { AI_CONFIG } from '@/config/ai-config';

const STORAGE_KEY = 'ai-config';
const USAGE_KEY = 'ai-usage';

export function useAIConfig() {
  const [config, setConfig] = useState<AIServiceConfig>({
    useBackendProxy: true,
    rateLimit: AI_CONFIG.freeRateLimit,
  });

  const [usage, setUsage] = useState<AIUsageStats>({
    requestCount: 0,
    lastReset: Date.now(),
    rateLimit: AI_CONFIG.freeRateLimit,
    remainingRequests: AI_CONFIG.freeRateLimit,
  });

  // Load config from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('Loaded AI config from localStorage:', { 
            hasApiKey: !!parsed.apiKey,
            useBackendProxy: parsed.useBackendProxy 
          });
          setConfig(parsed);
        }

        const storedUsage = localStorage.getItem(USAGE_KEY);
        if (storedUsage) {
          const parsed = JSON.parse(storedUsage);
          // Reset if window has expired
          if (Date.now() > parsed.lastReset + AI_CONFIG.rateLimitWindow) {
            resetUsage();
          } else {
            setUsage(parsed);
          }
        }
      } catch (error) {
        console.error('Failed to load AI config:', error);
      }
    }
  }, []);

  // Save config to localStorage
  const updateConfig = (newConfig: Partial<AIServiceConfig>) => {
    const updated = { ...config, ...newConfig };
    console.log('Updating AI config:', { 
      hasApiKey: !!updated.apiKey,
      useBackendProxy: updated.useBackendProxy 
    });
    setConfig(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('AI config saved to localStorage');
    }
  };

  // Increment usage count
  const incrementUsage = () => {
    const now = Date.now();
    
    // Check if we need to reset
    if (now > usage.lastReset + AI_CONFIG.rateLimitWindow) {
      resetUsage();
      return;
    }

    const newUsage = {
      ...usage,
      requestCount: usage.requestCount + 1,
      remainingRequests: Math.max(0, usage.remainingRequests - 1),
    };

    setUsage(newUsage);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(USAGE_KEY, JSON.stringify(newUsage));
    }
  };

  // Reset usage stats
  const resetUsage = () => {
    const newUsage = {
      requestCount: 0,
      lastReset: Date.now(),
      rateLimit: AI_CONFIG.freeRateLimit,
      remainingRequests: AI_CONFIG.freeRateLimit,
    };

    setUsage(newUsage);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(USAGE_KEY, JSON.stringify(newUsage));
    }
  };

  // Check if user has their own API key
  const hasApiKey = () => !!config.apiKey && config.apiKey.trim().length > 0;

  // Check if should use proxy
  const shouldUseProxy = () => config.useBackendProxy || !hasApiKey();

  // Check if rate limit exceeded (only for proxy users)
  const isRateLimited = () => {
    if (!shouldUseProxy()) return false;
    return usage.remainingRequests <= 0;
  };

  // Get time until reset (in minutes)
  const getResetTimeMinutes = () => {
    const resetTime = usage.lastReset + AI_CONFIG.rateLimitWindow;
    const remaining = Math.max(0, resetTime - Date.now());
    return Math.ceil(remaining / 60000);
  };

  return {
    config,
    usage,
    updateConfig,
    incrementUsage,
    resetUsage,
    hasApiKey,
    shouldUseProxy,
    isRateLimited,
    getResetTimeMinutes,
  };
}

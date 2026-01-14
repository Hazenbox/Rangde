/**
 * AI Chat API Route (Backend Proxy)
 * Provides free tier access to Gemini API with rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/ai/gemini-service';
import { AI_CONFIG } from '@/config/ai-config';
import type { AIContext } from '@/types/ai';

// Note: Rate limiting is now primarily handled client-side
// This server-side validation is a backup to prevent abuse

// Allowed origins for CORS (add your production domain)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://rang-de-one.vercel.app',
  // Add your production domains here
];

function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Allow requests without origin (same-origin, some tools)
  if (!origin && !referer) {
    return true;
  }
  
  // Check origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  
  // Check referer as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      return ALLOWED_ORIGINS.includes(refererOrigin);
    } catch {
      return false;
    }
  }
  
  return false;
}

function validateClientRateLimit(request: NextRequest): { 
  valid: boolean; 
  remaining?: number; 
  resetTime?: number;
  error?: string;
} {
  try {
    // Get client-provided rate limit info from headers
    const clientRemaining = request.headers.get('x-client-rate-remaining');
    const clientResetTime = request.headers.get('x-client-rate-reset');
    
    if (!clientRemaining || !clientResetTime) {
      // Client didn't provide rate limit info - allow but warn
      return { valid: true };
    }
    
    const remaining = parseInt(clientRemaining, 10);
    const resetTime = parseInt(clientResetTime, 10);
    
    // Validate the data makes sense
    if (isNaN(remaining) || isNaN(resetTime)) {
      return { valid: true }; // Invalid format, allow but don't trust
    }
    
    // Check if client claims to be rate limited
    if (remaining <= 0 && Date.now() < resetTime) {
      const resetInMinutes = Math.ceil((resetTime - Date.now()) / 60000);
      return {
        valid: false,
        remaining: 0,
        resetTime,
        error: `Rate limit exceeded. Please wait ${resetInMinutes} minutes or add your own API key.`,
      };
    }
    
    return { 
      valid: true, 
      remaining: Math.max(0, remaining - 1),
      resetTime,
    };
  } catch {
    // If anything goes wrong, allow the request
    return { valid: true };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate origin for security
    if (!validateOrigin(request)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Invalid origin' },
        { status: 403 }
      );
    }

    // Validate client-side rate limit
    const rateLimitCheck = validateClientRateLimit(request);

    if (!rateLimitCheck.valid) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: rateLimitCheck.error || 'Rate limit exceeded',
          resetTime: rateLimitCheck.resetTime,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': AI_CONFIG.freeRateLimit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || '',
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { message, context } = body as { message: string; context: AIContext };

    if (!message || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: message and context' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      return NextResponse.json(
        { 
          error: 'Backend API key not configured',
          message: isDevelopment 
            ? 'To use the free tier, add GEMINI_API_KEY to your .env.local file. Get a free API key at https://makersuite.google.com/app/apikey. Alternatively, add your own API key in the AI settings panel.'
            : 'The free tier is currently unavailable. Please add your own Gemini API key in the AI settings panel.',
          setupInstructions: {
            step1: 'Get a free API key from https://makersuite.google.com/app/apikey',
            step2: 'Click the AI settings icon in the navigation rail',
            step3: 'Paste your API key and save',
          },
        },
        { status: 503 } // Service Unavailable instead of 500
      );
    }

    // Initialize Gemini service
    const geminiService = new GeminiService(apiKey);

    // Send message
    const response = await geminiService.sendMessage(message, context);

    // Return response with rate limit headers
    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Limit': AI_CONFIG.freeRateLimit.toString(),
        'X-RateLimit-Remaining': rateLimitCheck.remaining?.toString() || AI_CONFIG.freeRateLimit.toString(),
        'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || Date.now().toString(),
      },
    });
  } catch (error) {
    console.error('AI chat API error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    rateLimit: AI_CONFIG.freeRateLimit,
    rateLimitWindow: AI_CONFIG.rateLimitWindow / 3600000, // hours
  });
}

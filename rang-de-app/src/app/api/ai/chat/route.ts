/**
 * AI Chat API Route (Backend Proxy)
 * Provides free tier access to Gemini API with rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/ai/gemini-service';
import { AI_CONFIG } from '@/config/ai-config';
import type { AIContext } from '@/types/ai';

// In-memory rate limiting (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: NextRequest): string {
  // Use IP address or session ID for rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return `ratelimit_${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const limit = rateLimitMap.get(key);

  // If no limit exists or window expired, create new
  if (!limit || now > limit.resetTime) {
    const resetTime = now + AI_CONFIG.rateLimitWindow;
    rateLimitMap.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: AI_CONFIG.freeRateLimit - 1,
      resetTime,
    };
  }

  // Check if under limit
  if (limit.count < AI_CONFIG.freeRateLimit) {
    limit.count++;
    return {
      allowed: true,
      remaining: AI_CONFIG.freeRateLimit - limit.count,
      resetTime: limit.resetTime,
    };
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetTime: limit.resetTime,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitKey = getRateLimitKey(request);
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      const resetInMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Free tier limit reached. Please wait ${resetInMinutes} minutes or add your own API key in settings.`,
          resetTime: rateLimit.resetTime,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': AI_CONFIG.freeRateLimit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
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
      return NextResponse.json(
        { error: 'Backend API key not configured. Please add your own API key in settings.' },
        { status: 500 }
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
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString(),
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

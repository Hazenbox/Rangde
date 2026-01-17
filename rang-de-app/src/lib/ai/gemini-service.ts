/**
 * Gemini AI Service
 * Handles communication with Google Gemini API and function calling
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG } from '@/config/ai-config';
import { AI_FUNCTION_DEFINITIONS } from './function-definitions';
import { aiLogger } from './logger';
import { retryWithBackoff } from './retry-utility';
import { trackTokenUsage } from './token-tracker';
import type { AIMessage, AIResponse, AIFunctionCall, AIContext } from '@/types/ai';

const HISTORY_STORAGE_KEY = 'ai-conversation-history';
const MAX_STORED_MESSAGES = 20;

// Fallback models to try if primary model fails
const MODEL_FALLBACKS = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-pro',
];

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversationHistory: AIMessage[] = [];
  private abortController: AbortController | null = null;
  private currentModelName: string;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.currentModelName = AI_CONFIG.model;
    
    this.model = this.genAI.getGenerativeModel({
      model: this.currentModelName,
      generationConfig: {
        temperature: AI_CONFIG.temperature,
        topP: AI_CONFIG.topP,
        topK: AI_CONFIG.topK,
        maxOutputTokens: AI_CONFIG.maxTokens,
      },
    });
    
    aiLogger.info(`Initialized Gemini with model: ${this.currentModelName}`);
    
    // Load conversation history from localStorage
    this.loadHistory();
  }
  
  /**
   * Try to initialize with a fallback model
   */
  private tryFallbackModel(): boolean {
    const currentIndex = MODEL_FALLBACKS.indexOf(this.currentModelName);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < MODEL_FALLBACKS.length) {
      const fallbackModel = MODEL_FALLBACKS[nextIndex];
      aiLogger.warn(`Trying fallback model: ${fallbackModel}`);
      
      try {
        this.currentModelName = fallbackModel;
        this.model = this.genAI.getGenerativeModel({
          model: fallbackModel,
          generationConfig: {
            temperature: AI_CONFIG.temperature,
            topP: AI_CONFIG.topP,
            topK: AI_CONFIG.topK,
            maxOutputTokens: AI_CONFIG.maxTokens,
          },
        });
        aiLogger.info(`Successfully switched to fallback model: ${fallbackModel}`);
        return true;
      } catch (error) {
        aiLogger.error(`Failed to initialize fallback model ${fallbackModel}:`, error);
        return false;
      }
    }
    
    aiLogger.error('No more fallback models available');
    return false;
  }

  /**
   * Load conversation history from localStorage
   */
  private loadHistory(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.conversationHistory = parsed.slice(-MAX_STORED_MESSAGES);
          aiLogger.debug(`Loaded ${this.conversationHistory.length} messages from history`);
        }
      }
    } catch (error) {
      aiLogger.warn('Failed to load conversation history:', error);
    }
  }

  /**
   * Save conversation history to localStorage
   */
  private saveHistory(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Keep only the last MAX_STORED_MESSAGES
      const toStore = this.conversationHistory.slice(-MAX_STORED_MESSAGES);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(toStore));
      aiLogger.debug(`Saved ${toStore.length} messages to history`);
    } catch (error) {
      aiLogger.warn('Failed to save conversation history:', error);
    }
  }

  /**
   * Wrap a promise with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string = 'Request timeout'
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }

  /**
   * Abort any ongoing request
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Send a message to Gemini with context and function calling
   */
  async sendMessage(
    userMessage: string,
    context: AIContext
  ): Promise<AIResponse> {
    try {
      // Build the conversation with system prompt and context
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Add user message to history
      const userMsg: AIMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
        status: 'pending',
      };
      
      this.conversationHistory.push(userMsg);

      // Track request tokens
      trackTokenUsage(userMessage, 'request');

      // Create new abort controller for this request
      this.abortController = new AbortController();
      
      // Add logging for debugging
      const startTime = Date.now();
      aiLogger.debug('Request start:', {
        timestamp: new Date().toISOString(),
        userMessage: userMessage.substring(0, 50) + '...',
        historyLength: this.buildChatHistory().length,
        contextPalettes: context.palettes.length,
        contextCollections: context.collections.length,
        systemPromptLength: systemPrompt.length,
      });

      // Prepare chat with function declarations
      const chat = this.model.startChat({
        history: this.buildChatHistory(),
        tools: [{ functionDeclarations: AI_FUNCTION_DEFINITIONS }],
      });

      // Build a simplified message with minimal context
      const messageToSend = userMessage;
      
      aiLogger.debug(`Sending message to Gemini using model: ${this.currentModelName}...`);
      
      // Send with retry logic and 30 second timeout
      let result;
      try {
        result = await retryWithBackoff(
          () => this.withTimeout(
            chat.sendMessage(messageToSend),
            30000,
            'AI request took too long. Please try a simpler request or check your connection.'
          ),
          {
            maxRetries: 2,
            onRetry: (attempt, error) => {
              aiLogger.warn(`Retrying Gemini request (attempt ${attempt})`, error.message);
            },
          }
        );
      } catch (error: any) {
        // Check if it's a model not found error (404)
        const errorMessage = error?.message || error?.toString() || '';
        if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('is not found')) {
          aiLogger.error(`Model ${this.currentModelName} not found. Attempting fallback...`);
          
          // Try fallback model
          if (this.tryFallbackModel()) {
            // Retry with fallback model
            const fallbackChat = this.model.startChat({
              history: this.buildChatHistory(),
              tools: [{ functionDeclarations: AI_FUNCTION_DEFINITIONS }],
            });
            
            result = await retryWithBackoff(
              () => this.withTimeout(
                fallbackChat.sendMessage(messageToSend),
                30000,
                'AI request took too long. Please try a simpler request or check your connection.'
              ),
              {
                maxRetries: 1,
                onRetry: (attempt, error) => {
                  aiLogger.warn(`Retrying with fallback model (attempt ${attempt})`, error.message);
                },
              }
            );
          } else {
            throw new Error(`All Gemini models failed. Please check your API key and try again. Original error: ${errorMessage}`);
          }
        } else {
          // Re-throw other errors
          throw error;
        }
      }
      
      const duration = Date.now() - startTime;
      aiLogger.debug('Response received:', { duration: `${duration}ms` });
      
      const response = (result as any).response;
      
      // Parse response
      const aiMessage: AIMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'success',
        functionCalls: [],
      };

      // Check if AI wants to call functions
      const functionCalls: AIFunctionCall[] = [];
      
      try {
        // Check for function calls in the response
        const functionCallResult = response.functionCalls();
        if (functionCallResult && functionCallResult.length > 0) {
          for (const call of functionCallResult) {
            functionCalls.push({
              name: call.name,
              arguments: call.args || {},
              status: 'pending',
            });
          }
        }
      } catch (e) {
        // No function calls - this is normal for text-only responses
        aiLogger.debug('No function calls in response');
      }
      
      aiMessage.functionCalls = functionCalls;

      // Get text response
      let text = '';
      try {
        text = response.text();
      } catch (e) {
        aiLogger.warn('No text in response:', e);
        text = functionCalls.length > 0 ? 'I processed your request.' : 'I received your message.';
      }
      aiMessage.content = text;

      // Add to history
      this.conversationHistory.push(aiMessage);
      this.saveHistory();

      // Track response tokens
      trackTokenUsage(aiMessage.content, 'response');

      return {
        message: aiMessage,
        functionCalls,
      };
    } catch (error: any) {
      // Clean up abort controller
      this.abortController = null;
      
      aiLogger.error('Error:', {
        error,
        message: error?.message,
        status: error?.status,
        statusText: error?.statusText,
        stack: error?.stack,
      });
      
      // Provide more specific error messages
      let errorMsg = 'I encountered an error processing your request. Please try again.';
      
      if (error?.message) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes('timeout') || errorText.includes('too long')) {
          errorMsg = error.message; // Use our custom timeout message
        } else if (errorText.includes('abort') || errorText.includes('cancelled')) {
          errorMsg = 'Request cancelled.';
        } else if (errorText.includes('404') || errorText.includes('not found') || errorText.includes('is not found')) {
          errorMsg = `Model not available: ${this.currentModelName}. Please check your API key or try again later.`;
        } else if (errorText.includes('api key') || errorText.includes('invalid') || errorText.includes('unauthorized') || errorText.includes('403')) {
          errorMsg = 'Invalid API key. Please check your settings and ensure you have a valid Google AI API key.';
        } else if (errorText.includes('quota') || errorText.includes('429') || errorText.includes('rate limit')) {
          errorMsg = 'Rate limit exceeded. Please wait a moment and try again, or add your own API key in settings.';
        } else if (errorText.includes('400') || errorText.includes('bad request')) {
          errorMsg = 'Invalid request. Your message may be too complex. Try simplifying it or breaking it into smaller parts.';
        } else if (errorText.includes('network') || errorText.includes('fetch') || errorText.includes('connection')) {
          errorMsg = 'Network error. Please check your internet connection and try again.';
        } else if (errorText.includes('500') || errorText.includes('502') || errorText.includes('503')) {
          errorMsg = 'Google AI service is temporarily unavailable. Please try again in a moment.';
        } else if (errorText.includes('all gemini models failed')) {
          errorMsg = error.message; // Use the detailed message from fallback failure
        } else {
          errorMsg = `AI Error: ${error.message}`;
        }
      }
      
      const errorMessage: AIMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: errorMsg,
        timestamp: Date.now(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Continue conversation after function execution
   */
  async continueAfterFunctionCall(
    functionResults: AIFunctionCall[]
  ): Promise<AIResponse> {
    try {
      aiLogger.debug('Continuing after function call...');
      const startTime = Date.now();
      
      // Build function response parts correctly
      const functionResponseParts = functionResults.map(fr => ({
        functionResponse: {
          name: fr.name,
          response: fr.result || { error: fr.error },
        },
      }));

      const chat = this.model.startChat({
        history: this.buildChatHistory(),
        tools: [{ functionDeclarations: AI_FUNCTION_DEFINITIONS }],
      });

      // Send function results back to AI with retry and timeout
      const result = await retryWithBackoff(
        () => this.withTimeout(
          chat.sendMessage({
            parts: functionResponseParts,
          }),
          30000,
          'AI follow-up request timeout.'
        ),
        {
          maxRetries: 2,
          onRetry: (attempt, error) => {
            aiLogger.warn(`Retrying follow-up request (attempt ${attempt})`, error.message);
          },
        }
      );
      
      const duration = Date.now() - startTime;
      aiLogger.debug('Follow-up response received:', { duration: `${duration}ms` });
      
      const response = (result as any).response;

      const aiMessage: AIMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: response.text(),
        timestamp: Date.now(),
        status: 'success',
      };

      this.conversationHistory.push(aiMessage);
      this.saveHistory();

      // Track response tokens
      trackTokenUsage(aiMessage.content, 'response');

      return {
        message: aiMessage,
      };
    } catch (error) {
      aiLogger.error('Gemini continuation error:', error);
      
      return {
        message: {
          id: `msg_${Date.now()}_error`,
          role: 'assistant',
          content: 'I encountered an error processing the results. Please try again.',
          timestamp: Date.now(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build system prompt with context (optimized for minimal tokens)
   */
  private buildSystemPrompt(context: AIContext): string {
    let prompt = 'You organize design tokens. Available:\n\n';
    
    // Add palette information (concise)
    if (context.palettes.length === 0) {
      prompt += 'Palettes: None (create palettes first)\n';
    } else {
      prompt += `Palettes (${context.palettes.length}):\n`;
      context.palettes.forEach(palette => {
        const colorNames = palette.colors.map(c => c.name).join(', ');
        prompt += `- ${palette.name}: ${colorNames}\n`;
      });
    }
    
    prompt += '\n';
    
    // Add collection information (concise)
    if (context.totalCollections === 0) {
      prompt += 'Collections: None\n';
    } else {
      prompt += `Collections (${context.totalCollections}):\n`;
      context.collections.forEach(coll => {
        const tags = [];
        if (coll.isParent) tags.push('PARENT');
        if (coll.layer) tags.push(coll.layer);
        const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
        prompt += `- ${coll.name}${tagStr}: ${coll.variableCount} vars\n`;
      });
    }
    
    prompt += '\nUse functions to organize the system.';
    
    return prompt;
  }

  /**
   * Build chat history for API
   */
  private buildChatHistory(): any[] {
    const history: any[] = [];
    
    // Only add actual conversation history, not system prompt
    this.conversationHistory.forEach(msg => {
      if (msg.role === 'user') {
        history.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        history.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      }
    });
    
    return history;
  }

  /**
   * Get conversation history
   */
  getHistory(): AIMessage[] {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      aiLogger.debug('Cleared conversation history');
    }
  }

  /**
   * Test API key validity
   */
  static async testApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key is empty');
    }

    try {
      aiLogger.debug('Testing API key...');
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Try with the configured model
      const model = genAI.getGenerativeModel({ 
        model: AI_CONFIG.model,
        generationConfig: {
          maxOutputTokens: 10,
        },
      });
      
      // Try a very simple generation request with 5 second timeout
      const testPromise = model.generateContent('hi');
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('API key validation timeout')), 5000);
      });
      
      const result = await Promise.race([testPromise, timeoutPromise]);
      
      // If we get a response, the key is valid
      await (result as any).response;
      aiLogger.debug('API key valid');
      return true;
    } catch (error: any) {
      aiLogger.error('API key validation error:', error);
      
      // Provide more specific error messages
      if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('invalid')) {
        throw new Error('Invalid API key format');
      } else if (error?.message?.includes('403') || error?.message?.includes('permission')) {
        throw new Error('API key does not have permission to use Gemini API');
      } else if (error?.message?.includes('404')) {
        throw new Error('Gemini API model not found. Your key might not have access.');
      } else if (error?.message?.includes('429')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Validation failed: ${error?.message || 'Unknown error'}`);
      }
    }
  }
}

/**
 * Gemini AI Service
 * Handles communication with Google Gemini API and function calling
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG } from '@/config/ai-config';
import { AI_FUNCTION_DEFINITIONS } from './function-definitions';
import type { AIMessage, AIResponse, AIFunctionCall, AIContext } from '@/types/ai';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversationHistory: AIMessage[] = [];
  private abortController: AbortController | null = null;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: AI_CONFIG.model,
      generationConfig: {
        temperature: AI_CONFIG.temperature,
        topP: AI_CONFIG.topP,
        topK: AI_CONFIG.topK,
        maxOutputTokens: AI_CONFIG.maxTokens,
      },
    });
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

      // Create new abort controller for this request
      this.abortController = new AbortController();
      
      // Add logging for debugging
      const startTime = Date.now();
      console.log('[AI] Request start:', {
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
      
      console.log('[AI] Sending message to Gemini...');
      
      // Send with 30 second timeout
      const result = await this.withTimeout(
        chat.sendMessage(messageToSend),
        30000,
        'AI request took too long. Please try a simpler request or check your connection.'
      );
      
      const duration = Date.now() - startTime;
      console.log('[AI] Response received:', { duration: `${duration}ms` });
      
      const response = result.response;
      
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
        console.debug('No function calls in response');
      }
      
      aiMessage.functionCalls = functionCalls;

      // Get text response
      let text = '';
      try {
        text = response.text();
      } catch (e) {
        console.warn('No text in response:', e);
        text = functionCalls.length > 0 ? 'I processed your request.' : 'I received your message.';
      }
      aiMessage.content = text;

      // Add to history
      this.conversationHistory.push(aiMessage);

      return {
        message: aiMessage,
        functionCalls,
      };
    } catch (error: any) {
      // Clean up abort controller
      this.abortController = null;
      
      console.error('[AI] Error:', {
        error,
        message: error?.message,
        status: error?.status,
        statusText: error?.statusText,
        stack: error?.stack,
      });
      
      // Provide more specific error messages
      let errorMsg = 'I encountered an error processing your request. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('timeout') || error.message.includes('too long')) {
          errorMsg = error.message; // Use our custom timeout message
        } else if (error.message.includes('abort')) {
          errorMsg = 'Request cancelled.';
        } else if (error.message.includes('API key') || error.message.includes('invalid')) {
          errorMsg = 'Invalid API key. Please check your settings.';
        } else if (error.message.includes('quota') || error.message.includes('429')) {
          errorMsg = 'Rate limit exceeded. Please try again later.';
        } else if (error.message.includes('404')) {
          errorMsg = 'AI model not available. Please check your configuration.';
        } else if (error.message.includes('400')) {
          errorMsg = 'Invalid request. Your message may be too complex. Try simplifying it.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMsg = 'Network error. Please check your internet connection.';
        } else {
          errorMsg = `Error: ${error.message}`;
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
      console.log('[AI] Continuing after function call...');
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

      // Send function results back to AI with timeout
      const result = await this.withTimeout(
        chat.sendMessage({
          parts: functionResponseParts,
        }),
        30000,
        'AI follow-up request timeout.'
      );
      
      const duration = Date.now() - startTime;
      console.log('[AI] Follow-up response received:', { duration: `${duration}ms` });
      
      const response = result.response;

      const aiMessage: AIMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: response.text(),
        timestamp: Date.now(),
        status: 'success',
      };

      this.conversationHistory.push(aiMessage);

      return {
        message: aiMessage,
      };
    } catch (error) {
      console.error('Gemini continuation error:', error);
      
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
  }

  /**
   * Test API key validity
   */
  static async testApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key is empty');
    }

    try {
      console.log('[AI] Testing API key...');
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
      await result.response;
      console.log('[AI] API key valid');
      return true;
    } catch (error: any) {
      console.error('API key validation error:', error);
      
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

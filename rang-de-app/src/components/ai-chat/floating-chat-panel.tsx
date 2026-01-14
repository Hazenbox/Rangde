/**
 * Floating AI Chat Panel
 * Main UI for AI assistant interaction
 */

"use client";

import * as React from 'react';
import { Sparkles, X, Minimize2, Maximize2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAIConfig } from '@/hooks/use-ai-config';
import { GeminiService } from '@/lib/ai/gemini-service';
import { FunctionExecutor } from '@/lib/ai/executors/function-executor';
import { buildAIContext } from '@/lib/ai/context-builder';
import { AI_CONFIG } from '@/config/ai-config';
import type { AIMessage, AIFunctionCall } from '@/types/ai';

export function FloatingChatPanel() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [messages, setMessages] = React.useState<AIMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionLatency, setConnectionLatency] = React.useState<number | null>(null);
  
  const { config, usage, incrementUsage, hasApiKey, shouldUseProxy, isRateLimited, getResetTimeMinutes } = useAIConfig();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const geminiServiceRef = React.useRef<GeminiService | null>(null);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    // Check rate limit for proxy users
    if (shouldUseProxy() && isRateLimited()) {
      const resetMinutes = getResetTimeMinutes();
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Rate limit exceeded. Please wait ${resetMinutes} minutes or add your own API key in settings.`,
        timestamp: Date.now(),
        status: 'error',
      }]);
      return;
    }

    const userMessage = input;
    setInput('');
    setIsProcessing(true);

    // Add user message
    const userMsg: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
      status: 'success',
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      let response;
      
      if (shouldUseProxy()) {
        // Use backend proxy
        response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            context: buildAIContext(),
          }),
        });

        if (!response.ok) {
          throw new Error('API request failed');
        }

        const data = await response.json();
        
        // Update usage stats
        incrementUsage();

        // Handle response
        await handleAIResponse(data);
      } else {
        // Use user's API key directly
        const geminiService = new GeminiService(config.apiKey!);
        geminiServiceRef.current = geminiService;
        
        const aiResponse = await geminiService.sendMessage(userMessage, buildAIContext());
        
        await handleAIResponse(aiResponse);
      }
    } catch (error) {
      console.error('Chat error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
      });
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: Date.now(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIResponse = async (response: any) => {
    // Add AI message
    setMessages(prev => [...prev, response.message]);

    // Execute function calls if any
    if (response.functionCalls && response.functionCalls.length > 0) {
      setIsProcessing(true);
      
      // Execute all function calls
      const executedCalls = await FunctionExecutor.executeBatch(response.functionCalls);
      
      // Update message with execution results
      setMessages(prev => prev.map(msg => 
        msg.id === response.message.id 
          ? { ...msg, functionCalls: executedCalls }
          : msg
      ));
      
      // Send results back to AI for natural response (optional)
      // For now, we'll just show the function results
      
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (geminiServiceRef.current) {
      geminiServiceRef.current.abort();
      geminiServiceRef.current = null;
    }
    setIsProcessing(false);
    setMessages(prev => [...prev, {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: 'Request cancelled.',
      timestamp: Date.now(),
      status: 'error',
    }]);
  };

  const handleTestConnection = async () => {
    if (!config.apiKey && !shouldUseProxy()) {
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('testing');
    setConnectionLatency(null);
    
    try {
      const startTime = Date.now();
      
      if (shouldUseProxy()) {
        // Test proxy endpoint
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'hi',
            context: { palettes: [], collections: [], totalCollections: 0, hasParent: false },
          }),
        });
        
        if (!response.ok) throw new Error('Proxy test failed');
        await response.json();
      } else {
        // Test direct API key
        const geminiService = new GeminiService(config.apiKey!);
        await geminiService.sendMessage('hi', {
          palettes: [],
          collections: [],
          totalCollections: 0,
          hasParent: false,
        });
      }
      
      const latency = Date.now() - startTime;
      setConnectionLatency(latency);
      setConnectionStatus('success');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setConnectionStatus('idle');
        setConnectionLatency(null);
      }, 3000);
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setConnectionStatus('idle');
      }, 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full shadow-lg gap-2"
        >
          <Sparkles className="h-5 w-5" />
          AI Assistant
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`flex flex-col shadow-2xl ${isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">AI Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Connection Status */}
            {connectionStatus !== 'idle' && (
              <div className="text-xs mr-2 flex items-center gap-1">
                {connectionStatus === 'testing' && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-muted-foreground">Testing...</span>
                  </>
                )}
                {connectionStatus === 'success' && (
                  <>
                    <span className="text-green-600">✓</span>
                    <span className="text-green-600">{connectionLatency}ms</span>
                  </>
                )}
                {connectionStatus === 'error' && (
                  <span className="text-destructive">✗ Failed</span>
                )}
              </div>
            )}
            
            {/* Usage Stats */}
            {shouldUseProxy() && (
              <span className="text-xs text-muted-foreground mr-2">
                {usage.remainingRequests}/{usage.rateLimit}
              </span>
            )}
            
            {/* Test Connection Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleTestConnection}
              disabled={connectionStatus === 'testing'}
              title="Test AI connection"
            >
              Test
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Hi! I can help you organize your design system. Try:
                  </p>
                  <div className="space-y-2">
                    {AI_CONFIG.examplePrompts.map((prompt, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="w-full text-left h-auto py-2 px-3 text-xs justify-start"
                        onClick={() => setInput(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${message.role === 'user' ? 'ml-auto max-w-[80%]' : 'mr-auto max-w-[90%]'}`}
                >
                  <div
                    className={`rounded-lg p-3 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.status === 'error'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted'
                    }`}
                  >
                    {message.content}
                  </div>

                  {/* Function calls */}
                  {message.functionCalls && message.functionCalls.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.functionCalls.map((call, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          <span className="font-mono">{call.name}()</span>
                          {call.status === 'success' && ' ✓'}
                          {call.status === 'error' && ` ✗ ${call.error}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isProcessing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you want to create..."
                  className="min-h-[60px] max-h-[120px] resize-none"
                  disabled={isProcessing}
                />
                {isProcessing ? (
                  <Button
                    onClick={handleCancel}
                    variant="destructive"
                    size="sm"
                    className="self-end"
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    size="sm"
                    className="self-end"
                  >
                    Send
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

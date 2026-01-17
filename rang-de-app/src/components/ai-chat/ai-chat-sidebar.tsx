/**
 * AI Chat Sidebar
 * Full-height left sidebar for AI assistant interaction
 */

"use client";

import * as React from 'react';
import { Sparkles, X, Loader2, Settings, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sidebar, SidebarHeader, SidebarActionButton } from '@/components/ui/sidebar';
import { useAIConfig } from '@/hooks/use-ai-config';
import { GeminiService } from '@/lib/ai/gemini-service';
import { FunctionExecutor } from '@/lib/ai/executors/function-executor';
import { buildAIContext } from '@/lib/ai/context-builder';
import { retryFetch } from '@/lib/ai/retry-utility';
import { AI_CONFIG } from '@/config/ai-config';
import { AISettingsPanel } from '@/components/settings/ai-settings-panel';
import { usePaletteStore } from '@/store/palette-store';
import { DESIGN_TOKENS } from '@/lib/design-tokens';
import type { AIMessage } from '@/types/ai';

// Helper function to get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning!';
  if (hour < 18) return 'Good afternoon!';
  return 'Good evening!';
}

export function AIChatSidebar() {
  const { isAIChatOpen, setAIChatOpen } = usePaletteStore();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<AIMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const { config, usage, incrementUsage, shouldUseProxy, isRateLimited, getResetTimeMinutes } = useAIConfig();
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
        // Use backend proxy with rate limit headers and retry logic
        response = await retryFetch(
          '/api/ai/chat',
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Client-Rate-Remaining': usage.remainingRequests.toString(),
              'X-Client-Rate-Reset': (usage.lastReset + AI_CONFIG.rateLimitWindow).toString(),
            },
            body: JSON.stringify({
              message: userMessage,
              context: buildAIContext(),
            }),
          },
          {
            maxRetries: 2,
            onRetry: (attempt) => {
              setMessages(prev => [...prev, {
                id: `msg_${Date.now()}_retry`,
                role: 'assistant',
                content: `Request failed. Retrying (attempt ${attempt}/3)...`,
                timestamp: Date.now(),
                status: 'pending',
              }]);
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Create detailed error with response data
          const error: any = new Error(errorData.message || 'API request failed');
          error.status = response.status;
          error.errorData = errorData;
          throw error;
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

      // Check if this is a 503 error (Backend API key not configured)
      let errorMessage = 'I encountered an error processing your request. Please try again.';
      
      if (error && typeof error === 'object' && 'status' in error) {
        const err = error as any;
        if (err.status === 503 && err.errorData?.setupInstructions) {
          // Backend API key is not configured - provide helpful instructions
          errorMessage = `🔑 AI Assistant Setup Required\n\n` +
            `The free tier is currently unavailable. To use the AI assistant:\n\n` +
            `1. Get a free API key from https://makersuite.google.com/app/apikey\n` +
            `2. Click the Settings icon (⚙️) above\n` +
            `3. Paste your API key and save\n\n` +
            `This only takes a minute and gives you full access!`;
        } else if (err.status === 503) {
          // Generic 503 error
          errorMessage = `The AI service is temporarily unavailable. You can add your own API key in settings to continue using the assistant.`;
        }
      }

      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: errorMessage,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sidebar width="chat" className="animate-in fade-in slide-in-from-left zoom-in-95 duration-500">
        <SidebarHeader
          title="Design Assistant"
          actions={
            <>
              <SidebarActionButton
                icon={<Settings className={DESIGN_TOKENS.sidebar.button.iconSize} />}
                onClick={() => setSettingsOpen(true)}
                tooltip="Settings"
              />
              <SidebarActionButton
                icon={<X className={DESIGN_TOKENS.sidebar.button.iconSize} />}
                onClick={() => setAIChatOpen(false)}
                tooltip="Close"
              />
            </>
          }
        />

        {/* Messages */}
        <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
              <div className="flex flex-col items-center justify-center space-y-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center animate-in fade-in zoom-in duration-500">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              
              {/* Greeting */}
              <div className="text-center space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <h3 className="text-base font-semibold">{getGreeting()}</h3>
                <p className="text-xs text-muted-foreground">
                  What would you like to create today?
                </p>
              </div>
              
              {/* Example prompts */}
              <div className="w-full space-y-1.5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                {AI_CONFIG.examplePrompts.slice(0, 3).map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="w-full text-left h-auto py-1.5 px-2.5 text-xs justify-start hover:bg-muted/50 rounded-lg border-border/50 transition-all hover:border-border hover:shadow-sm"
                    onClick={() => setInput(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          ) : (
            <>
              {messages.map((message, idx) => (
                <div
                  key={message.id}
                  className={`mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                    message.role === 'user' ? 'ml-auto max-w-[85%]' : 'mr-auto max-w-[90%]'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div
                    className={`rounded-xl p-2 text-xs leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-secondary/50 backdrop-blur-sm border border-border/50 text-foreground'
                        : message.status === 'error'
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-muted/40 backdrop-blur-sm'
                    }`}
                  >
                    {message.content}
                  </div>

                  {/* Function calls */}
                  {message.functionCalls && message.functionCalls.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {message.functionCalls.map((call, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground bg-muted/30 backdrop-blur-sm p-1.5 rounded-lg border border-border/30">
                          <span className="font-mono">{call.name}()</span>
                          {call.status === 'success' && ' ✓'}
                          {call.status === 'error' && ` ✗ ${call.error}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in duration-300">
              <div className="flex items-center gap-2 bg-muted/30 backdrop-blur-sm px-3 py-2 rounded-full border border-border/30">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="px-3 pb-3">
          <div className="flex flex-col gap-2 bg-background/80 backdrop-blur-md border border-border/50 rounded-lg p-3 shadow-sm transition-all focus-within:border-primary/50 focus-within:shadow-md">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="min-h-[80px] max-h-[120px] resize-none text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-0"
              disabled={isProcessing}
            />
            <div className="flex justify-end">
              {isProcessing ? (
                <Button
                  onClick={handleCancel}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-full hover:bg-destructive/10 text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">AI Settings</DialogTitle>
          </DialogHeader>
          <AISettingsPanel />
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}

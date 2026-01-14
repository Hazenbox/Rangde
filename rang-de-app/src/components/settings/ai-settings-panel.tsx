/**
 * AI Settings Panel
 * Configure API keys and usage preferences
 */

"use client";

import * as React from 'react';
import { ExternalLink, Key, Sparkles, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAIConfig } from '@/hooks/use-ai-config';
import { AI_CONFIG } from '@/config/ai-config';

export function AISettingsPanel() {
  const { config, usage, updateConfig, hasApiKey, shouldUseProxy, getResetTimeMinutes } = useAIConfig();
  
  const [apiKey, setApiKey] = React.useState(config.apiKey || '');
  const [showKey, setShowKey] = React.useState(false);

  // Sync local state with config when it changes
  React.useEffect(() => {
    setApiKey(config.apiKey || '');
  }, [config.apiKey]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      // Clear API key
      console.log('Clearing API key');
      updateConfig({ apiKey: '', useBackendProxy: true });
      return;
    }

    // Save API key directly without validation
    console.log('Saving API key:', { 
      keyLength: apiKey.trim().length,
      keyPrefix: apiKey.trim().substring(0, 10) + '...',
      useBackendProxy: false 
    });
    updateConfig({ 
      apiKey: apiKey.trim(),
      useBackendProxy: false,
    });
  };

  const handleClear = () => {
    setApiKey('');
    updateConfig({ apiKey: '', useBackendProxy: true });
  };

  const toggleProxy = () => {
    updateConfig({ useBackendProxy: !config.useBackendProxy });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>AI Assistant Settings</CardTitle>
        </div>
        <CardDescription>
          Configure your Google Gemini API access
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Usage */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current Usage</h4>
          
          {shouldUseProxy() ? (
            <div className="p-3 rounded-md bg-muted space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>Free tier requests</span>
                <span className="font-medium">
                  {usage.remainingRequests}/{usage.rateLimit}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Resets in {getResetTimeMinutes()} minutes
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Using your API key (unlimited)</span>
            </div>
          )}
        </div>

        {/* API Key Input */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="api-key" className="flex items-center gap-2">
              <Key className="h-3.5 w-3.5" />
              Your Gemini API Key (Optional)
            </Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? 'Hide' : 'Show'}
              </Button>
            </div>
            
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Get your free key at{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Google AI Studio
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <div className="text-[10px] text-muted-foreground/80 space-y-0.5">
                <p>• Make sure to create a new API key (not an OAuth 2.0 Client ID)</p>
                <p>• The key should start with "AIza..."</p>
                <p>• Enable "Generative Language API" if prompted</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSave}
              size="sm"
            >
              Save API Key
            </Button>
            
            {hasApiKey() && (
              <Button
                onClick={handleClear}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Proxy Toggle */}
        {hasApiKey() && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Usage Mode</h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.useBackendProxy}
                onChange={toggleProxy}
                className="rounded border-gray-300"
              />
              <span className="text-sm">
                Use free backend proxy (save your API key for later)
              </span>
            </label>
          </div>
        )}

        {/* Info */}
        <div className="p-3 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 space-y-2">
          <div className="text-sm font-medium">How it works</div>
          <ul className="text-xs space-y-1 list-disc list-inside">
            <li>Free tier: 30 requests per hour via backend proxy</li>
            <li>Own API key: Unlimited requests, costs ~$0.001 per chat</li>
            <li>Your API key is stored locally and never sent to our servers</li>
          </ul>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">What can the AI do?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Create collections from your palettes</li>
            <li>• Map colors between collections with aliases</li>
            <li>• Auto-layout your design system hierarchically</li>
            <li>• Organize complete multi-layer design systems</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

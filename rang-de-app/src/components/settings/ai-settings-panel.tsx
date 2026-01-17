/**
 * AI Settings Panel
 * Configure API keys
 */

"use client";

import * as React from 'react';
import { ExternalLink, Key, Loader2, CheckCircle, XCircle, BarChart3, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAIConfig } from '@/hooks/use-ai-config';
import { GeminiService } from '@/lib/ai/gemini-service';
import { getUsageStats, isApproachingLimit, resetTokenUsage } from '@/lib/ai/token-tracker';

export function AISettingsPanel() {
  const { config, updateConfig, hasApiKey } = useAIConfig();
  
  const [apiKey, setApiKey] = React.useState(config.apiKey || '');
  const [showKey, setShowKey] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationStatus, setValidationStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [validationError, setValidationError] = React.useState<string>('');
  const [tokenStats, setTokenStats] = React.useState(getUsageStats());

  // Sync local state with config when it changes
  React.useEffect(() => {
    setApiKey(config.apiKey || '');
  }, [config.apiKey]);

  // Update token stats periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTokenStats(getUsageStats());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Reset validation status when key changes
  React.useEffect(() => {
    setValidationStatus('idle');
    setValidationError('');
  }, [apiKey]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      // Clear API key
      updateConfig({ apiKey: '', useBackendProxy: true });
      setValidationStatus('idle');
      setValidationError('');
      return;
    }

    // Validate API key before saving
    setIsValidating(true);
    setValidationStatus('idle');
    setValidationError('');

    try {
      await GeminiService.testApiKey(apiKey.trim());
      
      // Validation successful
      setValidationStatus('success');
      
      // Save API key
      updateConfig({ 
        apiKey: apiKey.trim(),
        useBackendProxy: false,
      });

      // Reset success message after 3 seconds
      setTimeout(() => {
        setValidationStatus('idle');
      }, 3000);
    } catch (error) {
      // Validation failed
      setValidationStatus('error');
      setValidationError(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClear = () => {
    setApiKey('');
    updateConfig({ apiKey: '', useBackendProxy: true });
    setValidationStatus('idle');
    setValidationError('');
  };

  const handleResetTokens = () => {
    resetTokenUsage();
    setTokenStats(getUsageStats());
  };

  return (
    <div className="space-y-4">
      {/* API Key Input */}
      <div className="space-y-2">
        <Label htmlFor="api-key" className="flex items-center gap-1.5 text-sm">
          <Key className="h-3.5 w-3.5" />
          Gemini API Key
        </Label>
        <div className="flex gap-2">
          <Input
            id="api-key"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="flex-1 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKey(!showKey)}
            className="text-xs"
          >
            {showKey ? 'Hide' : 'Show'}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Get your free API key at{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            Google AI Studio
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>

        {/* Validation Status */}
        {validationStatus === 'success' && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>API key validated successfully!</span>
          </div>
        )}
        
        {validationStatus === 'error' && (
          <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
            <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          onClick={handleSave}
          size="sm"
          className="text-xs"
          disabled={isValidating || !apiKey.trim()}
        >
          {isValidating ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Validating...
            </>
          ) : (
            'Save & Validate'
          )}
        </Button>
        
        {hasApiKey() && (
          <Button
            onClick={handleClear}
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={isValidating}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Token Usage Stats */}
      <div className="space-y-2 pt-4 border-t">
        <Label className="flex items-center gap-1.5 text-sm">
          <BarChart3 className="h-3.5 w-3.5" />
          Token Usage
        </Label>
        
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Tokens:</span>
            <span className="font-medium">{tokenStats.totalTokens.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Requests:</span>
            <span className="font-medium">{tokenStats.requestCount}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg per Request:</span>
            <span className="font-medium">{tokenStats.averageTokensPerRequest.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tracked:</span>
            <span className="font-medium">{tokenStats.daysTracked} day{tokenStats.daysTracked !== 1 ? 's' : ''}</span>
          </div>
          
          {tokenStats.estimatedCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Cost:</span>
              <span className="font-medium">${tokenStats.estimatedCost.toFixed(4)}</span>
            </div>
          )}
        </div>

        {isApproachingLimit() && (
          <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>High token usage detected. Consider using your own API key for unlimited access.</span>
          </div>
        )}

        <Button
          onClick={handleResetTokens}
          variant="ghost"
          size="sm"
          className="text-xs w-full mt-2"
        >
          Reset Statistics
        </Button>

        <p className="text-xs text-muted-foreground mt-2">
          Token estimates are approximate. Actual usage may vary.
        </p>
      </div>
    </div>
  );
}

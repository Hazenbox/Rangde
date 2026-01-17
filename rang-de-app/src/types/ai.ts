/**
 * AI Chat System Types
 * Types for Google Gemini integration and function calling
 */

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  functionCalls?: AIFunctionCall[];
  status?: 'pending' | 'streaming' | 'success' | 'error';
  error?: string;
}

export interface AIFunctionCall {
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  status?: 'pending' | 'executing' | 'success' | 'error';
}

export interface AIServiceConfig {
  apiKey?: string;
  useBackendProxy: boolean;
  rateLimit: number;
  requestsUsed?: number;
  resetTime?: number;
}

export interface DesignSystemConfig {
  collections: DesignSystemCollection[];
  autoLayout?: boolean;
}

export interface DesignSystemCollection {
  name: string;
  isParent?: boolean;
  palette?: string;
  swatches?: string[];
  layer?: 'Primitive' | 'Semantic' | 'Theme' | 'Component';
}

export interface AliasMapping {
  sourceCollection: string;
  targetCollection: string;
  mappings: Array<{
    source: string;
    target: string;
    transformation?: 'none' | 'lighten' | 'darken';
  }>;
}

export interface PaletteContext {
  name: string;
  colors: Array<{
    name: string;
    hex: string;
  }>;
}

export interface CollectionContext {
  id: string;
  name: string;
  layer?: string;
  isParent?: boolean;
  variableCount: number;
  variables: Array<{
    name: string;
    type: string;
    value?: string;
  }>;
}

export interface AIContext {
  palettes: PaletteContext[];
  collections: CollectionContext[];
  totalCollections: number;
  hasParent: boolean;
}

export interface AIResponse {
  message: AIMessage;
  functionCalls?: AIFunctionCall[];
  error?: string;
}

export interface AIStreamChunk {
  content?: string;
  functionCall?: AIFunctionCall;
  done: boolean;
}

// Function definition types for Gemini
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, GeminiParameter>;
    required?: string[];
  };
}

export interface GeminiParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: GeminiParameter;
  properties?: Record<string, GeminiParameter>;
  default?: any;
}

export interface AIUsageStats {
  requestCount: number;
  lastReset: number;
  rateLimit: number;
  remainingRequests: number;
}

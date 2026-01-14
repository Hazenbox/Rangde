/**
 * AI Configuration
 * Settings for Google Gemini AI integration
 */

export const AI_CONFIG = {
  provider: 'gemini' as const,
  model: 'gemini-1.5-flash',
  
  // Rate limiting
  freeRateLimit: 30, // requests per hour via proxy
  rateLimitWindow: 3600000, // 1 hour in milliseconds
  
  // Generation parameters
  maxTokens: 8192,
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  
  // System prompt
  systemPrompt: `You are an expert design system assistant helping users organize their design tokens and color palettes.

Your capabilities:
- Create collections (primitives, semantic, theme, etc.)
- Add colors from existing palettes to collections
- Create alias mappings between collections
- Auto-layout collections hierarchically
- Set parent relationships

Important rules:
- You can ONLY use colors that exist in the user's palettes
- Do NOT generate new colors - only organize existing ones
- When creating aliases, ensure source variables exist
- Collection names should be clear and semantic
- Always confirm what you're doing before executing

Available palettes and their swatches will be provided in the context. Use them wisely.`,

  // Error messages
  errors: {
    rateLimitExceeded: 'Rate limit exceeded. Please wait or add your own API key in settings.',
    invalidApiKey: 'Invalid API key. Please check your settings.',
    networkError: 'Network error. Please check your connection and try again.',
    functionError: 'Error executing function. Please try again or rephrase your request.',
  },

  // Example prompts for UI
  examplePrompts: [
    "Create primitives collection with Sand palette",
    "Map Sand/900 to interactions idle",
    "Set up complete design system with 3 layers",
    "Add all Blue colors to semantic collection",
  ],
};

export type AIProvider = typeof AI_CONFIG.provider;
export type AIModel = typeof AI_CONFIG.model;

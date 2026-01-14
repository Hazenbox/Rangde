/**
 * AI Function Definitions
 * Defines all functions that Gemini AI can call
 */

import { GeminiFunctionDeclaration } from '@/types/ai';

export const AI_FUNCTION_DEFINITIONS: GeminiFunctionDeclaration[] = [
  {
    name: 'listAvailablePalettes',
    description: 'List all available color palettes and their swatches. Use this to see what colors the user has before creating collections.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  
  {
    name: 'createCollection',
    description: 'Create a new empty collection with a name and optional layer designation.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the collection (e.g., "primitives", "interactions", "theme-1")',
        },
        layer: {
          type: 'string',
          description: 'Semantic layer for the collection',
          enum: ['Primitive', 'Semantic', 'Theme', 'Component'],
        },
        isParent: {
          type: 'boolean',
          description: 'Whether this collection should be marked as the parent collection',
          default: false,
        },
      },
      required: ['name'],
    },
  },
  
  {
    name: 'addPaletteSwatchesToCollection',
    description: 'Add specific color swatches from an existing palette to a collection. The swatches must exist in the palette.',
    parameters: {
      type: 'object',
      properties: {
        collectionName: {
          type: 'string',
          description: 'Name of the target collection',
        },
        palette: {
          type: 'string',
          description: 'Name of the source palette (e.g., "Sand", "Blue")',
        },
        swatches: {
          type: 'array',
          description: 'Array of swatch names to add (e.g., ["900", "300", "500"]). Use "all" to add all swatches from the palette.',
          items: {
            type: 'string',
            description: 'Swatch name (e.g., "900", "300") or "all"',
          },
        },
        namePrefix: {
          type: 'string',
          description: 'Optional prefix for variable names (e.g., "sand" would create "sand-900", "sand-300")',
        },
      },
      required: ['collectionName', 'palette', 'swatches'],
    },
  },
  
  {
    name: 'createAliasMapping',
    description: 'Create alias variables in a target collection that reference variables from a source collection.',
    parameters: {
      type: 'object',
      properties: {
        sourceCollection: {
          type: 'string',
          description: 'Name of the source collection containing the original variables',
        },
        targetCollection: {
          type: 'string',
          description: 'Name of the target collection where aliases will be created',
        },
        mappings: {
          type: 'array',
          description: 'Array of source-to-target variable mappings',
          items: {
            type: 'object',
            properties: {
              source: {
                type: 'string',
                description: 'Name of the source variable (e.g., "Sand-900")',
              },
              target: {
                type: 'string',
                description: 'Name for the alias variable (e.g., "idle", "primary")',
              },
            },
          },
        },
      },
      required: ['sourceCollection', 'targetCollection', 'mappings'],
    },
  },
  
  {
    name: 'autoLayoutCollections',
    description: 'Automatically position all collections on the canvas in a hierarchical layout with parent at the top.',
    parameters: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          description: 'Layout direction',
          enum: ['vertical', 'horizontal'],
          default: 'vertical',
        },
      },
    },
  },
  
  {
    name: 'organizeDesignSystem',
    description: 'High-level function to organize a complete design system. Creates multiple collections, adds colors from palettes, creates alias mappings, and auto-layouts.',
    parameters: {
      type: 'object',
      properties: {
        collections: {
          type: 'array',
          description: 'Array of collections to create with their configurations',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Collection name',
              },
              isParent: {
                type: 'boolean',
                description: 'Is this the parent collection',
              },
              palette: {
                type: 'string',
                description: 'Palette to pull colors from',
              },
              swatches: {
                type: 'array',
                items: { type: 'string' },
                description: 'Swatches to add from palette',
              },
              layer: {
                type: 'string',
                enum: ['Primitive', 'Semantic', 'Theme', 'Component'],
              },
            },
          },
        },
        aliasMappings: {
          type: 'array',
          description: 'Alias mappings between collections',
          items: {
            type: 'object',
            properties: {
              sourceCollection: { type: 'string' },
              targetCollection: { type: 'string' },
              mappings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source: { type: 'string' },
                    target: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        autoLayout: {
          type: 'boolean',
          description: 'Automatically layout collections after creation',
          default: true,
        },
      },
      required: ['collections'],
    },
  },
];

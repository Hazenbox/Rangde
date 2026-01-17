/**
 * AI Context Builder
 * Builds context information for the AI about current palettes and collections
 */

import { usePaletteStore } from '@/store/palette-store';
import { useCollectionsStore } from '@/store/collections-store';
import type { AIContext, PaletteContext, CollectionContext } from '@/types/ai';

/**
 * Build complete context for AI
 * Includes limited palettes and collections to avoid token overflow
 */
export function buildAIContext(): AIContext {
  const { palettes } = usePaletteStore.getState();
  const { collectionNodes } = useCollectionsStore.getState();

  // Limit palettes to 5 most recent, with max 8 colors each
  const MAX_PALETTES = 5;
  const MAX_COLORS_PER_PALETTE = 8;
  
  const paletteContexts: PaletteContext[] = palettes
    .slice(0, MAX_PALETTES)
    .map(palette => {
      const colorEntries = Object.entries(palette.steps);
      const limitedColors = colorEntries.slice(0, MAX_COLORS_PER_PALETTE);
      
      return {
        name: palette.name,
        colors: limitedColors.map(([step, hex]) => ({
          name: step,
          hex: hex,
        })),
      };
    });

  // Limit collections to 10 most recent, with summary instead of all variables
  const MAX_COLLECTIONS = 10;
  const MAX_VARIABLES_PER_COLLECTION = 5;
  
  const collectionContexts: CollectionContext[] = collectionNodes
    .slice(0, MAX_COLLECTIONS)
    .map(collection => {
      const firstMode = collection.modes[0];
      const limitedVariables = collection.variables.slice(0, MAX_VARIABLES_PER_COLLECTION);
      
      return {
        id: collection.id,
        name: collection.name,
        layer: collection.layer,
        isParent: collection.isParent,
        variableCount: collection.variables.length,
        variables: limitedVariables.map(variable => {
          const value = variable.valuesByMode[firstMode.id];
          return {
            name: variable.name,
            type: value.type,
            value: value.type === 'color' ? value.hex : 
                   value.type === 'alias' ? `@${value.variableId}` : 
                   undefined,
          };
        }),
      };
    });

  const hasParent = collectionNodes.some(c => c.isParent);

  return {
    palettes: paletteContexts,
    collections: collectionContexts,
    totalCollections: collectionNodes.length,
    hasParent,
  };
}

/**
 * Get summary of available palettes for display
 */
export function getPaletteSummary(): string {
  const context = buildAIContext();
  
  if (context.palettes.length === 0) {
    return 'No palettes available. Create some color palettes first.';
  }

  let summary = 'Available Palettes:\n';
  context.palettes.forEach(palette => {
    summary += `\n${palette.name} (${palette.colors.length} colors):\n`;
    palette.colors.forEach(color => {
      summary += `  - ${color.name}: ${color.hex}\n`;
    });
  });

  return summary;
}

/**
 * Get summary of existing collections
 */
export function getCollectionsSummary(): string {
  const context = buildAIContext();
  
  if (context.collections.length === 0) {
    return 'No collections created yet.';
  }

  let summary = `Collections (${context.totalCollections}):\n`;
  context.collections.forEach(coll => {
    summary += `\n${coll.name}`;
    if (coll.isParent) summary += ' (PARENT)';
    if (coll.layer) summary += ` [${coll.layer}]`;
    summary += `\n  ${coll.variableCount} variables\n`;
  });

  return summary;
}

/**
 * Find a palette by name (case-insensitive)
 */
export function findPalette(name: string): PaletteContext | null {
  const context = buildAIContext();
  const normalizedName = name.toLowerCase().trim();
  
  return context.palettes.find(p => 
    p.name.toLowerCase() === normalizedName
  ) || null;
}

/**
 * Find a collection by name (case-insensitive)
 */
export function findCollection(name: string): CollectionContext | null {
  const context = buildAIContext();
  const normalizedName = name.toLowerCase().trim();
  
  return context.collections.find(c => 
    c.name.toLowerCase() === normalizedName
  ) || null;
}

/**
 * Check if a palette swatch exists
 */
export function paletteSwatchExists(paletteName: string, swatchName: string): boolean {
  const palette = findPalette(paletteName);
  if (!palette) return false;
  
  return palette.colors.some(c => 
    c.name.toLowerCase() === swatchName.toLowerCase()
  );
}

/**
 * Get color hex from palette swatch
 */
export function getPaletteSwatchHex(paletteName: string, swatchName: string): string | null {
  const palette = findPalette(paletteName);
  if (!palette) return null;
  
  const color = palette.colors.find(c => 
    c.name.toLowerCase() === swatchName.toLowerCase()
  );
  
  return color?.hex || null;
}

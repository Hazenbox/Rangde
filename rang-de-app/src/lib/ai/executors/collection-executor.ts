/**
 * Collection Executor
 * Executes collection-related AI function calls
 */

import { useCollectionsStore } from '@/store/collections-store';
import { usePaletteStore } from '@/store/palette-store';
import { findPalette, getPaletteSwatchHex } from '../context-builder';
import { aiLogger } from '../logger';
import type { CollectionLayer } from '@/types/collections';

export class CollectionExecutor {
  /**
   * Create a new collection
   */
  static createCollection(args: {
    name: string;
    layer?: CollectionLayer;
    isParent?: boolean;
  }): { success: boolean; collectionId?: string; error?: string } {
    try {
      const { createCollection, setParentCollection } = useCollectionsStore.getState();
      
      // Create collection at a default position
      const position = { x: 100, y: 100 };
      const collection = createCollection(
        args.name,
        position,
        args.layer,
        undefined,
        undefined
      );

      // Set as parent if requested
      if (args.isParent) {
        setParentCollection(collection.id);
      }

      return {
        success: true,
        collectionId: collection.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create collection',
      };
    }
  }

  /**
   * Add palette swatches to a collection
   */
  static addPaletteSwatchesToCollection(args: {
    collectionName: string;
    palette: string;
    swatches: string[];
    namePrefix?: string;
  }): { success: boolean; variablesAdded?: number; error?: string } {
    try {
      const { collectionNodes, addVariable } = useCollectionsStore.getState();
      
      // Find the collection
      const collection = collectionNodes.find(
        c => c.name.toLowerCase() === args.collectionName.toLowerCase()
      );
      
      if (!collection) {
        return {
          success: false,
          error: `Collection "${args.collectionName}" not found`,
        };
      }

      // Find the palette
      const palette = findPalette(args.palette);
      if (!palette) {
        return {
          success: false,
          error: `Palette "${args.palette}" not found`,
        };
      }

      // Determine which swatches to add
      let swatchesToAdd: string[];
      if (args.swatches.includes('all')) {
        swatchesToAdd = palette.colors.map(c => c.name);
      } else {
        swatchesToAdd = args.swatches;
      }

      // Add each swatch as a variable
      let addedCount = 0;
      for (const swatchName of swatchesToAdd) {
        const color = palette.colors.find(
          c => c.name.toLowerCase() === swatchName.toLowerCase()
        );
        
        if (!color) {
          aiLogger.warn(`Swatch "${swatchName}" not found in palette "${args.palette}"`);
          continue;
        }

        // Create variable name
        const prefix = args.namePrefix || args.palette;
        const variableName = `${prefix}-${color.name}`;
        
        // Add variable to collection
        addVariable(collection.id, variableName, `From ${args.palette} palette`, color.hex);
        addedCount++;
      }

      return {
        success: true,
        variablesAdded: addedCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add palette swatches',
      };
    }
  }

  /**
   * List available palettes
   */
  static listAvailablePalettes(): { 
    success: boolean; 
    palettes?: Array<{ name: string; colorCount: number; colors: Array<{ name: string; hex: string }> }>;
    error?: string;
  } {
    try {
      const { palettes } = usePaletteStore.getState();
      
      return {
        success: true,
        palettes: palettes.map(p => ({
          name: p.name,
          colorCount: Object.keys(p.steps).length,
          colors: Object.entries(p.steps).map(([step, hex]) => ({ 
            name: step, 
            hex: hex 
          })),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list palettes',
      };
    }
  }
}

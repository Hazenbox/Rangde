/**
 * Function Executor Registry
 * Routes AI function calls to appropriate executors
 */

import type { AIFunctionCall } from '@/types/ai';
import { CollectionExecutor } from './collection-executor';
import { AliasExecutor } from './alias-executor';
import { LayoutExecutor } from './layout-executor';

export class FunctionExecutor {
  /**
   * Execute an AI function call
   */
  static async execute(functionCall: AIFunctionCall): Promise<AIFunctionCall> {
    const { name, arguments: args } = functionCall;
    
    try {
      let result: any;

      switch (name) {
        case 'listAvailablePalettes':
          result = CollectionExecutor.listAvailablePalettes();
          break;

        case 'createCollection':
          result = CollectionExecutor.createCollection(args);
          break;

        case 'addPaletteSwatchesToCollection':
          result = CollectionExecutor.addPaletteSwatchesToCollection(args);
          break;

        case 'createAliasMapping':
          result = AliasExecutor.createAliasMapping(args);
          break;

        case 'autoLayoutCollections':
          result = LayoutExecutor.autoLayoutCollections(args);
          break;

        case 'organizeDesignSystem':
          result = await this.executeOrganizeDesignSystem(args);
          break;

        default:
          result = {
            success: false,
            error: `Unknown function: ${name}`,
          };
      }

      return {
        ...functionCall,
        result,
        status: result.success ? 'success' : 'error',
        error: result.error,
      };
    } catch (error) {
      return {
        ...functionCall,
        result: null,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute batch of function calls
   */
  static async executeBatch(functionCalls: AIFunctionCall[]): Promise<AIFunctionCall[]> {
    const results: AIFunctionCall[] = [];
    
    for (const call of functionCalls) {
      const result = await this.execute(call);
      results.push(result);
      
      // If a function fails, stop execution
      if (result.status === 'error') {
        break;
      }
    }
    
    return results;
  }

  /**
   * Execute high-level organizeDesignSystem function
   * This orchestrates multiple lower-level function calls
   */
  private static async executeOrganizeDesignSystem(args: {
    collections: Array<{
      name: string;
      isParent?: boolean;
      palette?: string;
      swatches?: string[];
      layer?: string;
    }>;
    aliasMappings?: Array<{
      sourceCollection: string;
      targetCollection: string;
      mappings: Array<{ source: string; target: string }>;
    }>;
    autoLayout?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const errors: string[] = [];

      // Step 1: Create all collections
      for (const collConfig of args.collections) {
        const result = CollectionExecutor.createCollection({
          name: collConfig.name,
          isParent: collConfig.isParent,
          layer: collConfig.layer as any,
        });
        
        if (!result.success) {
          errors.push(`Failed to create collection ${collConfig.name}: ${result.error}`);
          continue;
        }

        // Step 2: Add palette swatches if specified
        if (collConfig.palette && collConfig.swatches) {
          const swatchResult = CollectionExecutor.addPaletteSwatchesToCollection({
            collectionName: collConfig.name,
            palette: collConfig.palette,
            swatches: collConfig.swatches,
          });
          
          if (!swatchResult.success) {
            errors.push(`Failed to add swatches to ${collConfig.name}: ${swatchResult.error}`);
          }
        }
      }

      // Step 3: Create alias mappings if specified
      if (args.aliasMappings) {
        for (const mapping of args.aliasMappings) {
          const result = AliasExecutor.createAliasMapping(mapping);
          
          if (!result.success) {
            errors.push(`Failed to create alias mapping: ${result.error}`);
          }
        }
      }

      // Step 4: Auto-layout if requested
      if (args.autoLayout !== false) {
        const layoutResult = LayoutExecutor.autoLayoutCollections();
        
        if (!layoutResult.success) {
          errors.push(`Failed to auto-layout: ${layoutResult.error}`);
        }
      }

      return {
        success: errors.length === 0,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to organize design system',
      };
    }
  }
}

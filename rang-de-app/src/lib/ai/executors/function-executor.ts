/**
 * Function Executor Registry
 * Routes AI function calls to appropriate executors
 */

import type { AIFunctionCall } from '@/types/ai';
import { CollectionExecutor } from './collection-executor';
import { AliasExecutor } from './alias-executor';
import { LayoutExecutor } from './layout-executor';
import { useCollectionsStore } from '@/store/collections-store';
import { aiLogger } from '../logger';

export class FunctionExecutor {
  /**
   * Capture current state for rollback
   */
  private static captureState() {
    const store = useCollectionsStore.getState();
    return {
      collectionNodes: JSON.parse(JSON.stringify(store.collectionNodes)),
      edges: JSON.parse(JSON.stringify(store.edges)),
    };
  }

  /**
   * Restore state from snapshot
   */
  private static restoreState(snapshot: any) {
    const store = useCollectionsStore.getState();
    // Use Zustand's setState to restore
    useCollectionsStore.setState({
      collectionNodes: snapshot.collectionNodes,
      edges: snapshot.edges,
    });
    aiLogger.info('State rolled back due to function execution failure');
  }

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
          result = CollectionExecutor.createCollection(args as any);
          break;

        case 'addPaletteSwatchesToCollection':
          result = CollectionExecutor.addPaletteSwatchesToCollection(args as any);
          break;

        case 'createAliasMapping':
          result = AliasExecutor.createAliasMapping(args as any);
          break;

        case 'autoLayoutCollections':
          result = LayoutExecutor.autoLayoutCollections(args);
          break;

        case 'organizeDesignSystem':
          result = await this.executeOrganizeDesignSystem(args as any);
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
   * Execute batch of function calls with transaction support
   */
  static async executeBatch(functionCalls: AIFunctionCall[]): Promise<AIFunctionCall[]> {
    // Capture state before execution
    const stateSnapshot = this.captureState();
    const results: AIFunctionCall[] = [];
    let hasError = false;
    
    try {
      for (const call of functionCalls) {
        const result = await this.execute(call);
        results.push(result);
        
        // If a function fails, mark error and stop execution
        if (result.status === 'error') {
          hasError = true;
          aiLogger.warn(`Function ${call.name} failed:`, result.error);
          break;
        }
      }
      
      // If any function failed, rollback all changes
      if (hasError) {
        aiLogger.warn('Rolling back changes due to function execution failure');
        this.restoreState(stateSnapshot);
      }
      
      return results;
    } catch (error) {
      // Unexpected error - rollback
      aiLogger.error('Unexpected error during batch execution, rolling back:', error);
      this.restoreState(stateSnapshot);
      throw error;
    }
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

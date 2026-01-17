/**
 * Alias Executor
 * Executes alias mapping AI function calls
 */

import { useCollectionsStore } from '@/store/collections-store';

export class AliasExecutor {
  /**
   * Create alias mappings between collections
   */
  static createAliasMapping(args: {
    sourceCollection: string;
    targetCollection: string;
    mappings: Array<{
      source: string;
      target: string;
    }>;
  }): { success: boolean; mappingsCreated?: number; errors?: string[]; error?: string } {
    try {
      const { collectionNodes, addVariable, setVariableValue } = useCollectionsStore.getState();
      
      // Find source collection
      const sourceCollection = collectionNodes.find(
        c => c.name.toLowerCase() === args.sourceCollection.toLowerCase()
      );
      
      if (!sourceCollection) {
        return {
          success: false,
          error: `Source collection "${args.sourceCollection}" not found`,
        };
      }

      // Find target collection
      const targetCollection = collectionNodes.find(
        c => c.name.toLowerCase() === args.targetCollection.toLowerCase()
      );
      
      if (!targetCollection) {
        return {
          success: false,
          error: `Target collection "${args.targetCollection}" not found`,
        };
      }

      let createdCount = 0;
      const errors: string[] = [];

      // Create each alias mapping
      for (const mapping of args.mappings) {
        try {
          // Find source variable
          const sourceVariable = sourceCollection.variables.find(
            v => v.name.toLowerCase() === mapping.source.toLowerCase()
          );

          if (!sourceVariable) {
            errors.push(`Source variable "${mapping.source}" not found in ${args.sourceCollection}`);
            continue;
          }

          // Add alias variable to target collection
          const newVariable = addVariable(
            targetCollection.id,
            mapping.target,
            `Alias to ${sourceCollection.name}/${sourceVariable.name}`
          );

          if (newVariable) {
            // Set alias value for all modes
            targetCollection.modes.forEach(mode => {
              setVariableValue(
                targetCollection.id,
                newVariable.id,
                mode.id,
                {
                  type: 'alias',
                  variableId: sourceVariable.id,
                  collectionId: sourceCollection.id,
                }
              );
            });
            createdCount++;
          }
        } catch (err) {
          errors.push(`Failed to create mapping ${mapping.source} → ${mapping.target}: ${err}`);
        }
      }

      return {
        success: createdCount > 0,
        mappingsCreated: createdCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create alias mappings',
      };
    }
  }
}

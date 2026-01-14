/**
 * Layout Executor
 * Executes auto-layout AI function calls
 */

import { useCollectionsStore } from '@/store/collections-store';
import { calculateHierarchicalPositions } from '@/lib/hierarchical-layout';

export class LayoutExecutor {
  /**
   * Auto-layout all collections hierarchically
   */
  static autoLayoutCollections(args?: {
    direction?: 'vertical' | 'horizontal';
  }): { success: boolean; error?: string } {
    try {
      const { collectionNodes, updateCollection } = useCollectionsStore.getState();
      
      if (collectionNodes.length === 0) {
        return {
          success: false,
          error: 'No collections to layout',
        };
      }

      // Calculate hierarchical positions
      const positions = calculateHierarchicalPositions(collectionNodes);
      
      // Update each collection's position
      positions.forEach((value, nodeId) => {
        updateCollection(nodeId, { position: value.collection });
      });

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to auto-layout collections',
      };
    }
  }
}

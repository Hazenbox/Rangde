import { CollectionNode, NodePosition } from "@/types/collections";
import { getColumnX } from "./column-layout";

/**
 * Calculate hierarchical positions for all collections
 * Variables are now rendered inside collections, so no separate positioning needed
 */
export function calculateHierarchicalPositions(
  collections: CollectionNode[]
): Map<string, { collection: NodePosition }> {
  const layout = new Map<string, { collection: NodePosition }>();
  
  // Group collections by layer
  const byLayer = new Map<string, CollectionNode[]>();
  
  collections.forEach(collection => {
    const layer = collection.layer || 'unassigned';
    if (!byLayer.has(layer)) {
      byLayer.set(layer, []);
    }
    byLayer.get(layer)!.push(collection);
  });
  
  // Layout each layer column
  const layers = ['primitive', 'semantic', 'theme', 'unassigned'];
  
  layers.forEach(layer => {
    const layerCollections = byLayer.get(layer) || [];
    const columnX = getColumnX(layer === 'unassigned' ? undefined : layer as any);
    
    let currentY = 100; // Start Y position
    const verticalSpacing = 250; // Spacing between collections
    
    layerCollections.forEach(collection => {
      const collectionPos: NodePosition = { x: columnX, y: currentY };
      
      layout.set(collection.id, {
        collection: collectionPos,
      });
      
      // Move Y down for next collection
      // Collections now expand internally based on variable count
      currentY += verticalSpacing;
    });
  });
  
  return layout;
}

import { CollectionNode, CollectionLayer, NodePosition } from "@/types/collections";

/**
 * Column layout configuration
 */
const COLUMN_WIDTH = 400; // Horizontal spacing between columns
const COLUMN_START_X = 100; // Starting X position
const NODE_VERTICAL_SPACING = 200; // Vertical spacing between nodes
const START_Y = 100; // Starting Y position

/**
 * Calculate column-based layout positions for collections based on their layer
 * 
 * Layout structure:
 * Column 0 (x=100): Primitives
 * Column 1 (x=500): Semantic
 * Column 2 (x=900): Theme
 * 
 * Collections without layers are placed at the bottom in a separate area
 */
export function calculateColumnLayout(collections: CollectionNode[]): Map<string, NodePosition> {
  const layout = new Map<string, NodePosition>();

  // Group collections by layer
  const primitives = collections.filter(c => c.layer === CollectionLayer.PRIMITIVE);
  const semantic = collections.filter(c => c.layer === CollectionLayer.SEMANTIC);
  const theme = collections.filter(c => c.layer === CollectionLayer.THEME);
  const unassigned = collections.filter(c => !c.layer);

  // Layout primitives in column 0
  primitives.forEach((collection, index) => {
    layout.set(collection.id, {
      x: COLUMN_START_X,
      y: START_Y + (index * NODE_VERTICAL_SPACING),
    });
  });

  // Layout semantic in column 1
  semantic.forEach((collection, index) => {
    layout.set(collection.id, {
      x: COLUMN_START_X + COLUMN_WIDTH,
      y: START_Y + (index * NODE_VERTICAL_SPACING),
    });
  });

  // Layout theme in column 2
  theme.forEach((collection, index) => {
    layout.set(collection.id, {
      x: COLUMN_START_X + (COLUMN_WIDTH * 2),
      y: START_Y + (index * NODE_VERTICAL_SPACING),
    });
  });

  // Layout unassigned in a grid below
  const unassignedStartY = START_Y + (Math.max(primitives.length, semantic.length, theme.length) * NODE_VERTICAL_SPACING) + 100;
  unassigned.forEach((collection, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    layout.set(collection.id, {
      x: COLUMN_START_X + (col * COLUMN_WIDTH),
      y: unassignedStartY + (row * NODE_VERTICAL_SPACING),
    });
  });

  return layout;
}

/**
 * Get the column index for a given layer
 */
export function getColumnIndex(layer?: CollectionLayer): number {
  switch (layer) {
    case CollectionLayer.PRIMITIVE:
      return 0;
    case CollectionLayer.SEMANTIC:
      return 1;
    case CollectionLayer.THEME:
      return 2;
    default:
      return -1; // Unassigned
  }
}

/**
 * Get the X position for a given layer
 */
export function getColumnX(layer?: CollectionLayer): number {
  const index = getColumnIndex(layer);
  if (index === -1) return COLUMN_START_X; // Default position for unassigned
  return COLUMN_START_X + (index * COLUMN_WIDTH);
}

/**
 * Auto-arrange collections by their layer
 */
export function autoArrangeCollections(collections: CollectionNode[]): CollectionNode[] {
  const layout = calculateColumnLayout(collections);
  
  return collections.map(collection => {
    const position = layout.get(collection.id);
    if (position) {
      return {
        ...collection,
        position,
        updatedAt: Date.now(),
      };
    }
    return collection;
  });
}

import { CollectionNode, Variable, NodePosition } from "@/types/collections";

export interface VariableWithLayout extends Variable {
  collectionId: string;
  collectionName: string;
  collectionIcon?: string;
  column: number;
  rowInColumn: number;
}

export interface LayoutResult {
  variables: VariableWithLayout[];
  columnCount: number;
}

const COLUMN_WIDTH = 320;
const NODE_HEIGHT = 160;
const NODE_VERTICAL_SPACING = 40;
const COLUMN_HORIZONTAL_SPACING = 150;
const START_X = 50;
const START_Y = 50;

/**
 * Build dependency graph for variables
 */
function buildDependencyGraph(collections: CollectionNode[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  
  // Initialize graph for all variables
  collections.forEach((collection) => {
    collection.variables.forEach((variable) => {
      const key = `${collection.id}:${variable.id}`;
      if (!graph.has(key)) {
        graph.set(key, new Set());
      }
    });
  });
  
  // Add edges for aliases
  collections.forEach((collection) => {
    collection.variables.forEach((variable) => {
      const varKey = `${collection.id}:${variable.id}`;
      
      Object.values(variable.valuesByMode).forEach((value) => {
        if (value.type === 'alias' && value.variableId) {
          const targetCollectionId = value.collectionId || collection.id;
          const targetKey = `${targetCollectionId}:${value.variableId}`;
          
          if (graph.has(targetKey)) {
            // varKey depends on targetKey
            graph.get(varKey)!.add(targetKey);
          }
        }
      });
    });
  });
  
  return graph;
}

/**
 * Topological sort with cycle detection
 * Returns array of variable keys in dependency order (primitives first)
 */
function topologicalSort(
  graph: Map<string, Set<string>>,
  collections: CollectionNode[]
): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>(); // For cycle detection
  
  function visit(key: string): boolean {
    if (visited.has(key)) return true;
    if (temp.has(key)) {
      console.warn(`Cycle detected involving ${key}`);
      return false; // Cycle detected
    }
    
    temp.add(key);
    
    const dependencies = graph.get(key);
    if (dependencies) {
      for (const dep of dependencies) {
        if (!visit(dep)) {
          return false;
        }
      }
    }
    
    temp.delete(key);
    visited.add(key);
    sorted.push(key);
    
    return true;
  }
  
  // Visit all variables
  for (const key of graph.keys()) {
    if (!visited.has(key)) {
      visit(key);
    }
  }
  
  return sorted;
}

/**
 * Assign column to each variable based on longest path from primitives
 */
function assignColumns(
  sortedKeys: string[],
  graph: Map<string, Set<string>>
): Map<string, number> {
  const columns = new Map<string, number>();
  
  // Initialize all to column 0
  sortedKeys.forEach((key) => columns.set(key, 0));
  
  // Calculate column based on dependencies
  sortedKeys.forEach((key) => {
    const dependencies = graph.get(key);
    if (dependencies && dependencies.size > 0) {
      // Column is one more than the max column of dependencies
      let maxDepColumn = -1;
      dependencies.forEach((dep) => {
        const depColumn = columns.get(dep) || 0;
        maxDepColumn = Math.max(maxDepColumn, depColumn);
      });
      columns.set(key, maxDepColumn + 1);
    }
  });
  
  return columns;
}

/**
 * Group variables by column and collection
 */
function groupByColumnAndCollection(
  collections: CollectionNode[],
  columns: Map<string, number>
): Map<number, Map<string, VariableWithLayout[]>> {
  const grouped = new Map<number, Map<string, VariableWithLayout[]>>();
  
  collections.forEach((collection) => {
    collection.variables.forEach((variable) => {
      const key = `${collection.id}:${variable.id}`;
      const column = columns.get(key) || 0;
      
      if (!grouped.has(column)) {
        grouped.set(column, new Map());
      }
      
      const collectionGroup = grouped.get(column)!;
      if (!collectionGroup.has(collection.id)) {
        collectionGroup.set(collection.id, []);
      }
      
      collectionGroup.get(collection.id)!.push({
        ...variable,
        collectionId: collection.id,
        collectionName: collection.name,
        collectionIcon: collection.icon,
        column,
        rowInColumn: 0, // Will be assigned later
      });
    });
  });
  
  return grouped;
}

/**
 * Calculate positions for all variables
 */
function calculatePositions(
  grouped: Map<number, Map<string, VariableWithLayout[]>>
): VariableWithLayout[] {
  const allVariables: VariableWithLayout[] = [];
  
  // Sort columns
  const sortedColumns = Array.from(grouped.keys()).sort((a, b) => a - b);
  
  sortedColumns.forEach((columnIndex) => {
    const collectionsInColumn = grouped.get(columnIndex)!;
    let yOffset = START_Y;
    
    // Sort collections by name for consistent positioning
    const sortedCollectionIds = Array.from(collectionsInColumn.keys()).sort();
    
    sortedCollectionIds.forEach((collectionId) => {
      const variables = collectionsInColumn.get(collectionId)!;
      
      // Sort variables by name within collection
      variables.sort((a, b) => a.name.localeCompare(b.name));
      
      variables.forEach((variable, index) => {
        variable.rowInColumn = index;
        variable.position = {
          x: START_X + (columnIndex * (COLUMN_WIDTH + COLUMN_HORIZONTAL_SPACING)),
          y: yOffset,
        };
        yOffset += NODE_HEIGHT + NODE_VERTICAL_SPACING;
        allVariables.push(variable);
      });
      
      // Add extra space between collections
      yOffset += NODE_VERTICAL_SPACING;
    });
  });
  
  return allVariables;
}

/**
 * Main auto-layout function
 * Takes collections and returns variables with calculated positions
 */
export function autoLayoutVariables(collections: CollectionNode[]): LayoutResult {
  // Handle empty case
  if (collections.length === 0 || collections.every(c => c.variables.length === 0)) {
    return {
      variables: [],
      columnCount: 0,
    };
  }
  
  // Build dependency graph
  const graph = buildDependencyGraph(collections);
  
  // Topological sort
  const sortedKeys = topologicalSort(graph, collections);
  
  // Assign columns
  const columns = assignColumns(sortedKeys, graph);
  
  // Group by column and collection
  const grouped = groupByColumnAndCollection(collections, columns);
  
  // Calculate positions
  const variables = calculatePositions(grouped);
  
  const columnCount = Math.max(...Array.from(columns.values()), 0) + 1;
  
  return {
    variables,
    columnCount,
  };
}

/**
 * Get all variables as flat list with collection info
 */
export function flattenCollectionsToVariables(
  collections: CollectionNode[]
): Array<{ variable: Variable; collectionId: string; collectionName: string; collectionIcon?: string }> {
  const flattened: Array<{
    variable: Variable;
    collectionId: string;
    collectionName: string;
    collectionIcon?: string;
  }> = [];
  
  collections.forEach((collection) => {
    collection.variables.forEach((variable) => {
      flattened.push({
        variable,
        collectionId: collection.id,
        collectionName: collection.name,
        collectionIcon: collection.icon,
      });
    });
  });
  
  return flattened;
}

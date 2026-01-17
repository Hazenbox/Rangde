import { CollectionNode, CollectionLayer, Variable, VariableValue } from "@/types/collections";

/**
 * Validation result for alias relationships
 */
export interface AliasValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Validate if an alias relationship is allowed based on collection layers
 * 
 * Rules:
 * - Primitives: Cannot have incoming aliases (they are the base layer)
 * - Semantic: Must alias primitives only
 * - Theme: Must alias semantic only
 */
export function validateAliasRelationship(
  sourceCollection: CollectionNode,
  targetCollection: CollectionNode
): AliasValidationResult {
  const sourceLayer = sourceCollection.layer;
  const targetLayer = targetCollection.layer;

  // If layers are not defined, allow the alias (backward compatibility)
  if (!sourceLayer || !targetLayer) {
    return { isValid: true };
  }

  // Rule 1: Cannot alias to yourself
  if (sourceCollection.id === targetCollection.id) {
    return {
      isValid: false,
      error: "Cannot create alias to the same collection"
    };
  }

  // Rule 2: Primitives cannot have aliases
  if (sourceLayer === CollectionLayer.PRIMITIVE) {
    return {
      isValid: false,
      error: "Primitive collections cannot have aliases - they must contain concrete values"
    };
  }

  // Rule 3: Semantic must alias primitives
  if (sourceLayer === CollectionLayer.SEMANTIC) {
    if (targetLayer !== CollectionLayer.PRIMITIVE) {
      return {
        isValid: false,
        error: `Semantic collections can only alias Primitive collections (target is ${targetLayer})`
      };
    }
  }

  // Rule 4: Theme must alias semantic
  if (sourceLayer === CollectionLayer.THEME) {
    if (targetLayer !== CollectionLayer.SEMANTIC) {
      return {
        isValid: false,
        error: `Theme collections can only alias Semantic collections (target is ${targetLayer})`
      };
    }
  }

  return { isValid: true };
}

/**
 * Check for circular dependencies in alias chain
 */
export function hasCircularDependency(
  variableId: string,
  collectionId: string,
  targetVariableId: string,
  targetCollectionId: string,
  allCollections: CollectionNode[],
  visited: Set<string> = new Set()
): boolean {
  const key = `${collectionId}:${variableId}`;
  
  // If we've already visited this variable, we have a cycle
  if (visited.has(key)) {
    return true;
  }

  // If we've reached the target, check if it leads back to source
  if (collectionId === targetCollectionId && variableId === targetVariableId) {
    return false;
  }

  visited.add(key);

  // Find the target variable and check if it has aliases
  const targetCollection = allCollections.find(c => c.id === targetCollectionId);
  if (!targetCollection) return false;

  const targetVariable = targetCollection.variables.find(v => v.id === targetVariableId);
  if (!targetVariable) return false;

  // Check all the target variable's values for aliases
  for (const value of Object.values(targetVariable.valuesByMode)) {
    if (value.type === 'alias' && value.collectionId && value.variableId) {
      if (hasCircularDependency(
        variableId,
        collectionId,
        value.variableId,
        value.collectionId,
        allCollections,
        new Set(visited)
      )) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get all collections by layer
 */
export function getCollectionsByLayer(
  collections: CollectionNode[],
  layer: CollectionLayer
): CollectionNode[] {
  return collections.filter(c => c.layer === layer);
}

/**
 * Get layer color for UI display
 */
export function getLayerColor(layer?: CollectionLayer): string {
  switch (layer) {
    case CollectionLayer.PRIMITIVE:
      return '#3b82f6'; // blue
    case CollectionLayer.SEMANTIC:
      return '#8b5cf6'; // purple
    case CollectionLayer.THEME:
      return '#ec4899'; // pink
    default:
      return '#6b7280'; // gray (no layer)
  }
}

/**
 * Get layer label for UI display
 */
export function getLayerLabel(layer?: CollectionLayer): string {
  switch (layer) {
    case CollectionLayer.PRIMITIVE:
      return 'Primitive';
    case CollectionLayer.SEMANTIC:
      return 'Semantic';
    case CollectionLayer.THEME:
      return 'Theme';
    default:
      return 'Unassigned';
  }
}

/**
 * Get layer description for UI tooltips
 */
export function getLayerDescription(layer?: CollectionLayer): string {
  switch (layer) {
    case CollectionLayer.PRIMITIVE:
      return 'Base color values - no aliases allowed';
    case CollectionLayer.SEMANTIC:
      return 'Intent-based tokens - alias primitives only';
    case CollectionLayer.THEME:
      return 'Brand-specific tokens - alias semantic only';
    default:
      return 'No layer assigned - any alias allowed';
  }
}

/**
 * Validate that a collection's variables follow layer rules
 */
export function validateCollectionVariables(
  collection: CollectionNode,
  allCollections: CollectionNode[]
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!collection.layer) {
    warnings.push('Collection has no layer assigned');
    return { errors, warnings };
  }

  // Check each variable
  for (const variable of collection.variables) {
    // Check if variable has any alias values
    const hasAliases = Object.values(variable.valuesByMode).some(v => v.type === 'alias');

    if (collection.layer === CollectionLayer.PRIMITIVE && hasAliases) {
      errors.push(`Variable "${variable.name}" has aliases, but primitive collections cannot have aliases`);
    }

    if (collection.layer === CollectionLayer.SEMANTIC && !hasAliases) {
      warnings.push(`Variable "${variable.name}" has no aliases - semantic variables should alias primitives`);
    }

    if (collection.layer === CollectionLayer.THEME && !hasAliases) {
      warnings.push(`Variable "${variable.name}" has no aliases - theme variables should alias semantic`);
    }

    // Validate each alias
    for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
      if (value.type === 'alias' && value.collectionId) {
        const targetCollection = allCollections.find(c => c.id === value.collectionId);
        if (targetCollection) {
          const validation = validateAliasRelationship(collection, targetCollection);
          if (!validation.isValid) {
            errors.push(`Variable "${variable.name}" (mode ${modeId}): ${validation.error}`);
          }
        }
      }
    }
  }

  return { errors, warnings };
}

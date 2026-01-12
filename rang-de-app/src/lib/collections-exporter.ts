import {
  CollectionNode,
  CollectionEdge,
  FigmaVariable,
  FigmaExport,
  FigmaVariableValue,
  FigmaVariableAlias,
  Variable,
} from "@/types/collections";
import { colord } from "colord";

/**
 * Convert hex color to Figma RGBA format
 */
function hexToFigmaRGBA(hex: string): FigmaVariableValue {
  const color = colord(hex);
  const rgb = color.toRgb();
  return {
    r: rgb.r / 255,
    g: rgb.g / 255,
    b: rgb.b / 255,
    a: rgb.a ?? 1,
  };
}

/**
 * Generate a consistent variable ID based on variable ID
 */
function generateVariableId(variableId: string, collectionId: string): string {
  const combined = `${collectionId}-${variableId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const absHash = Math.abs(hash);
  const variableNum = 1000 + (absHash % 9000);
  const subNum = absHash % 1000;
  return `VariableID:${variableNum}:${subNum}`;
}

/**
 * Generate CSS variable syntax from variable name
 */
function generateCodeSyntax(name: string): string {
  const variableName = name
    .replace(/^[🎨✦]+\/?/, '') // Remove emoji prefixes
    .replace(/\//g, '-')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return `var(--${variableName})`;
}

/**
 * Build global variable ID map across all collections
 */
function buildGlobalVariableIdMap(collections: CollectionNode[]): Map<string, string> {
  const globalMap = new Map<string, string>();
  
  collections.forEach((collection) => {
    collection.variables.forEach((variable) => {
      const key = `${collection.id}:${variable.id}`;
      globalMap.set(key, generateVariableId(variable.id, collection.id));
    });
  });
  
  return globalMap;
}

/**
 * Export a single collection to Figma-compatible JSON format
 */
export function exportCollectionToFigma(
  collection: CollectionNode,
  allCollections?: CollectionNode[]
): FigmaExport {
  const figmaVariables: FigmaVariable[] = [];

  // Create a map of variable IDs for alias resolution
  // If allCollections provided, build global map; otherwise local map
  const variableIdMap = allCollections 
    ? buildGlobalVariableIdMap(allCollections)
    : new Map<string, string>();
  
  if (!allCollections) {
    // Local map for same-collection references
    collection.variables.forEach((variable) => {
      variableIdMap.set(`${collection.id}:${variable.id}`, generateVariableId(variable.id, collection.id));
    });
  }

  // Process each variable
  for (const variable of collection.variables) {
    const figmaVarId = generateVariableId(variable.id, collection.id);
    
    // Build valuesByMode
    const valuesByMode: Record<string, FigmaVariableValue | FigmaVariableAlias> = {};
    const resolvedValuesByMode: Record<string, any> = {};

    for (const mode of collection.modes) {
      const value = variable.valuesByMode[mode.id];
      
      if (!value) {
        // If no value for this mode, use default black
        valuesByMode[mode.id] = hexToFigmaRGBA('#000000');
        resolvedValuesByMode[mode.id] = {
          resolvedValue: hexToFigmaRGBA('#000000'),
          alias: null,
        };
        continue;
      }

      if (value.type === 'color' && value.hex) {
        // Direct color value
        const figmaColor = hexToFigmaRGBA(value.hex);
        valuesByMode[mode.id] = figmaColor;
        resolvedValuesByMode[mode.id] = {
          resolvedValue: figmaColor,
          alias: null,
        };
      } else if (value.type === 'alias' && value.variableId) {
        // Alias to another variable (same-collection or cross-collection)
        const targetCollectionId = value.collectionId || collection.id;
        const targetCollection = allCollections 
          ? allCollections.find(c => c.id === targetCollectionId) 
          : (targetCollectionId === collection.id ? collection : null);
        
        const aliasedVariable = targetCollection?.variables.find(v => v.id === value.variableId);
        const aliasKey = `${targetCollectionId}:${value.variableId}`;
        const aliasedFigmaId = variableIdMap.get(aliasKey);
        
        if (aliasedVariable && aliasedFigmaId) {
          valuesByMode[mode.id] = {
            type: 'VARIABLE_ALIAS',
            id: aliasedFigmaId,
          };

          // Get the resolved color from the aliased variable
          const aliasedValue = aliasedVariable.valuesByMode[mode.id];
          let resolvedColor = hexToFigmaRGBA('#000000');
          
          if (aliasedValue?.type === 'color' && aliasedValue.hex) {
            resolvedColor = hexToFigmaRGBA(aliasedValue.hex);
          }

          resolvedValuesByMode[mode.id] = {
            resolvedValue: resolvedColor,
            alias: aliasedFigmaId,
            aliasName: aliasedVariable.name,
          };
        } else {
          // Fallback if alias not found
          console.warn(`Cross-collection alias not found: ${targetCollectionId}:${value.variableId}`);
          valuesByMode[mode.id] = hexToFigmaRGBA('#000000');
          resolvedValuesByMode[mode.id] = {
            resolvedValue: hexToFigmaRGBA('#000000'),
            alias: null,
          };
        }
      }
    }

    // Create Figma variable
    const figmaVariable: FigmaVariable = {
      id: figmaVarId,
      name: variable.name,
      description: variable.description || "",
      type: "COLOR",
      valuesByMode,
      resolvedValuesByMode,
      scopes: variable.scopes || ["ALL_SCOPES"],
      hiddenFromPublishing: false,
      codeSyntax: {
        WEB: variable.codeSyntax || generateCodeSyntax(variable.name),
      },
    };

    figmaVariables.push(figmaVariable);
  }

  // Build modes map
  const modesMap: Record<string, string> = {};
  collection.modes.forEach((mode) => {
    modesMap[mode.id] = mode.name;
  });

  return {
    id: `VariableCollectionId:${collection.id}`,
    name: collection.name,
    modes: modesMap,
    variableIds: figmaVariables.map(v => v.id),
    variables: figmaVariables,
  };
}

/**
 * Export multiple collections together maintaining cross-collection references
 */
export function exportMultipleCollections(
  collections: CollectionNode[]
): FigmaExport[] {
  return collections.map((collection) => exportCollectionToFigma(collection, collections));
}

/**
 * Download collection(s) as Figma JSON file
 */
export function downloadFigmaExport(
  collections: CollectionNode | CollectionNode[],
  filename?: string
): void {
  const isMultiple = Array.isArray(collections);
  
  let jsonData: any;
  let defaultFilename: string;
  
  if (isMultiple) {
    // Export multiple collections as array
    jsonData = exportMultipleCollections(collections);
    defaultFilename = 'collections.json';
  } else {
    // Export single collection
    jsonData = exportCollectionToFigma(collections);
    defaultFilename = `${collections.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  }
  
  const jsonString = JSON.stringify(jsonData, null, 2);
  
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

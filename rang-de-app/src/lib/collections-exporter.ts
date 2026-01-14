import {
  CollectionNode,
  CollectionEdge,
  FigmaVariable,
  FigmaExport,
  FigmaVariableValue,
  FigmaVariableAlias,
  Variable,
  ExportFormat,
} from "@/types/collections";
import { colord } from "colord";
import { downloadDTCGExport } from "./exporters/dtcg-exporter";
import { downloadTokensStudioExport } from "./exporters/tokens-studio-exporter";

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
 * Recursively resolve alias chain to get the final color value
 */
function resolveAliasChain(
  aliasValue: { type: 'alias'; variableId: string; collectionId?: string },
  allCollections: CollectionNode[],
  modeId: string,
  maxDepth: number = 10
): FigmaVariableValue {
  if (maxDepth <= 0) {
    console.warn('Max alias chain depth reached, returning black');
    return hexToFigmaRGBA('#000000');
  }

  const targetCollectionId = aliasValue.collectionId || '';
  const targetCollection = allCollections.find(c => c.id === targetCollectionId);
  const targetVariable = targetCollection?.variables.find(v => v.id === aliasValue.variableId);
  
  if (!targetVariable || !targetCollection) {
    return hexToFigmaRGBA('#000000');
  }

  // CRITICAL FIX: Use the target collection's mode, not the source mode
  // Each collection has its own mode IDs, so we need to use the first mode
  // from the target collection when resolving cross-collection aliases
  const targetModeId = targetCollection.modes[0]?.id || modeId;
  const targetValue = targetVariable.valuesByMode[targetModeId];
  
  if (!targetValue) {
    return hexToFigmaRGBA('#000000');
  }

  if (targetValue.type === 'color' && targetValue.hex) {
    return hexToFigmaRGBA(targetValue.hex);
  } else if (targetValue.type === 'alias' && targetValue.variableId) {
    // Recursively resolve using the target mode
    return resolveAliasChain(
      { type: 'alias', variableId: targetValue.variableId, collectionId: targetValue.collectionId },
      allCollections,
      targetModeId,
      maxDepth - 1
    );
  }

  return hexToFigmaRGBA('#000000');
}

/**
 * Export a single collection to Figma-compatible JSON format
 * @param collection - The collection to export
 * @param allCollections - All collections for resolving cross-collection aliases
 * @param resolveAliases - If true, converts aliases to actual color values
 */
export function exportCollectionToFigma(
  collection: CollectionNode,
  allCollections?: CollectionNode[],
  resolveAliases: boolean = false
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
        
        if (aliasedVariable && aliasedFigmaId && targetCollection) {
          // CRITICAL FIX: Use the target collection's mode ID, not the source mode ID
          // Each collection has its own mode IDs
          const targetModeId = targetCollection.modes[0]?.id || mode.id;
          const aliasedValue = aliasedVariable.valuesByMode[targetModeId];
          let resolvedColor = hexToFigmaRGBA('#000000');
          
          // Follow alias chain to get actual color
          if (aliasedValue?.type === 'color' && aliasedValue.hex) {
            resolvedColor = hexToFigmaRGBA(aliasedValue.hex);
          } else if (aliasedValue?.type === 'alias' && aliasedValue.variableId && allCollections) {
            // Recursively resolve nested aliases using the target mode
            resolvedColor = resolveAliasChain(
              { type: 'alias', variableId: aliasedValue.variableId, collectionId: aliasedValue.collectionId },
              allCollections,
              targetModeId
            );
          }

          if (resolveAliases) {
            // Convert alias to direct color value for better compatibility
            valuesByMode[mode.id] = resolvedColor;
            resolvedValuesByMode[mode.id] = {
              resolvedValue: resolvedColor,
              alias: null,
            };
          } else {
            // Keep as alias reference
            valuesByMode[mode.id] = {
              type: 'VARIABLE_ALIAS',
              id: aliasedFigmaId,
            };

          resolvedValuesByMode[mode.id] = {
            resolvedValue: resolvedColor,
            alias: aliasedFigmaId,
            aliasName: aliasedVariable.name,
          };
          }
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
 * @param collections - Collections to export
 * @param resolveAliases - If true, converts aliases to actual color values
 */
export function exportMultipleCollections(
  collections: CollectionNode[],
  resolveAliases: boolean = false
): FigmaExport[] {
  return collections.map((collection) => exportCollectionToFigma(collection, collections, resolveAliases));
}

/**
 * Download collection(s) in the specified format
 * Routes to appropriate exporter based on format
 * @param collections - Collection(s) to export
 * @param options - Export options including format, filename, and format-specific options
 */
export function downloadCollectionsExport(
  collections: CollectionNode | CollectionNode[],
  options: {
    format?: ExportFormat;
    filename?: string;
    resolveAliases?: boolean; // For FIGMA_API format only
    includeAllModes?: boolean; // For DTCG format
    includeThemes?: boolean; // For TOKENS_STUDIO format
  } = {}
): void {
  const format = options.format || ExportFormat.DTCG; // Default to DTCG
  
  switch (format) {
    case ExportFormat.DTCG:
      downloadDTCGExport(collections, {
        includeAllModes: options.includeAllModes,
        filename: options.filename,
      });
      break;
      
    case ExportFormat.TOKENS_STUDIO:
      downloadTokensStudioExport(collections, {
        includeThemes: options.includeThemes !== false,
        filename: options.filename,
      });
      break;
      
    case ExportFormat.FIGMA_API:
      // Use legacy Figma API format export
      downloadFigmaExport(collections, options.filename, options.resolveAliases);
      break;
      
    default:
      console.error(`Unknown export format: ${format}`);
      // Fallback to DTCG
      downloadDTCGExport(collections, {
        filename: options.filename,
      });
  }
}

/**
 * Helper function to download a file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export all collections flattened into a SINGLE collection with namespaced variable names
 * This ensures maximum compatibility with Figma's Import/Export Variables plugin
 * All cross-collection aliases become same-collection aliases
 * @param collections - All collections to merge
 * @param filename - Optional custom filename
 */
export function exportCollectionsFlattened(
  collections: CollectionNode[],
  filename?: string
): void {
  if (collections.length === 0) return;

  // Build global variable map with flattened names
  const globalVariableMap = new Map<string, {
    collection: CollectionNode;
    variable: Variable;
    flattenedName: string;
    figmaId: string;
  }>();

  // First pass: collect all variables and generate flattened IDs
  collections.forEach((collection) => {
    collection.variables.forEach((variable) => {
      const flattenedName = `${collection.name}/${variable.name}`;
      const figmaId = generateVariableId(variable.id, collection.id);
      const key = `${collection.id}:${variable.id}`;
      
      globalVariableMap.set(key, {
        collection,
        variable,
        flattenedName,
        figmaId,
      });
    });
  });

  // Second pass: create flattened variables with remapped aliases
  const flattenedVariables: FigmaVariable[] = [];
  
  // Use the first collection's first mode as the unified mode
  const unifiedMode = collections[0].modes[0];
  const unifiedModeId = unifiedMode.id;

  for (const [key, data] of globalVariableMap) {
    const { collection, variable, flattenedName, figmaId } = data;
    
    // Get the variable's mode (use first mode of its collection)
    const sourceMode = collection.modes[0];
    const value = variable.valuesByMode[sourceMode.id];
    
    if (!value) {
      console.warn(`No value found for variable ${variable.name} in collection ${collection.name}`);
      continue;
    }

    const valuesByMode: Record<string, FigmaVariableValue | FigmaVariableAlias> = {};
    const resolvedValuesByMode: Record<string, any> = {};

    if (value.type === 'color' && value.hex) {
      // Direct color value
      const figmaColor = hexToFigmaRGBA(value.hex);
      valuesByMode[unifiedModeId] = figmaColor;
      resolvedValuesByMode[unifiedModeId] = {
        resolvedValue: figmaColor,
        alias: null,
      };
    } else if (value.type === 'alias' && value.variableId) {
      // Remap alias to flattened variable ID
      const targetCollectionId = value.collectionId || collection.id;
      const targetKey = `${targetCollectionId}:${value.variableId}`;
      const targetData = globalVariableMap.get(targetKey);
      
      if (targetData) {
        // Create VARIABLE_ALIAS reference to flattened variable
        valuesByMode[unifiedModeId] = {
          type: 'VARIABLE_ALIAS',
          id: targetData.figmaId,
        };
        
        // Resolve the final color value by following the alias chain
        const resolvedColor = resolveAliasChainFlattened(
          { type: 'alias', variableId: value.variableId, collectionId: value.collectionId },
          collections,
          globalVariableMap
        );
        
        resolvedValuesByMode[unifiedModeId] = {
          resolvedValue: resolvedColor,
          alias: targetData.figmaId,
          aliasName: targetData.flattenedName,
        };
      } else {
        // Fallback if alias target not found
        console.warn(`Alias target not found for ${flattenedName} -> ${value.variableId}`);
        const black = hexToFigmaRGBA('#000000');
        valuesByMode[unifiedModeId] = black;
        resolvedValuesByMode[unifiedModeId] = {
          resolvedValue: black,
          alias: null,
        };
      }
    }

    flattenedVariables.push({
      id: figmaId,
      name: flattenedName,
      description: variable.description || "",
      type: "COLOR",
      valuesByMode,
      resolvedValuesByMode,
      scopes: variable.scopes || ["ALL_SCOPES"],
      hiddenFromPublishing: false,
      codeSyntax: {
        WEB: generateCodeSyntax(flattenedName),
      },
    });
  }

  // Create single merged collection
  const mergedCollection: FigmaExport = {
    id: `VariableCollectionId:merged_${Date.now()}`,
    name: "Design Tokens (All Collections)",
    modes: {
      [unifiedModeId]: unifiedMode.name,
    },
    variableIds: flattenedVariables.map(v => v.id),
    variables: flattenedVariables,
  };

  // Download the file
  const jsonString = JSON.stringify(mergedCollection, null, 2);
  const defaultFilename = filename || 'design-tokens-flattened.json';
  downloadFile(jsonString, defaultFilename, 'application/json');
}

/**
 * Resolve alias chain in flattened context
 */
function resolveAliasChainFlattened(
  aliasValue: { type: 'alias'; variableId: string; collectionId?: string },
  allCollections: CollectionNode[],
  globalMap: Map<string, any>,
  maxDepth: number = 10
): FigmaVariableValue {
  if (maxDepth <= 0) {
    console.warn('Max alias depth reached');
    return hexToFigmaRGBA('#000000');
  }

  const targetCollectionId = aliasValue.collectionId || '';
  const targetKey = `${targetCollectionId}:${aliasValue.variableId}`;
  const targetData = globalMap.get(targetKey);
  
  if (!targetData) {
    console.warn(`Alias target not found: ${targetKey}`);
    return hexToFigmaRGBA('#000000');
  }

  const targetCollection = targetData.collection;
  const targetVariable = targetData.variable;
  const targetMode = targetCollection.modes[0];
  const targetValue = targetVariable.valuesByMode[targetMode.id];

  if (!targetValue) {
    return hexToFigmaRGBA('#000000');
  }

  if (targetValue.type === 'color' && targetValue.hex) {
    return hexToFigmaRGBA(targetValue.hex);
  } else if (targetValue.type === 'alias' && targetValue.variableId) {
    // Recursively resolve
    return resolveAliasChainFlattened(
      { type: 'alias', variableId: targetValue.variableId, collectionId: targetValue.collectionId },
      allCollections,
      globalMap,
      maxDepth - 1
    );
  }

  return hexToFigmaRGBA('#000000');
}

/**
 * Download collection(s) as Figma API JSON file
 * For multiple collections, creates SEPARATE files for each (one collection per file)
 * This is because the Export/Import Variables plugin expects one collection per file
 * @param collections - Collection(s) to export
 * @param filename - Optional custom filename (only used for single collection)
 * @param resolveAliases - If true, converts aliases to actual color values for better compatibility
 */
export function downloadFigmaExport(
  collections: CollectionNode | CollectionNode[],
  filename?: string,
  resolveAliases: boolean = false
): void {
  const isMultiple = Array.isArray(collections);
  
  if (isMultiple && collections.length > 1) {
    // For multiple collections, use FLATTENED export for maximum compatibility
    // All collections are merged into one with namespaced variable names
    exportCollectionsFlattened(collections, filename);
  } else {
    // Single collection export
    const collection = Array.isArray(collections) ? collections[0] : collections;
    const jsonData = exportCollectionToFigma(collection, undefined, resolveAliases);
    const suffix = resolveAliases ? '-resolved' : '';
    const defaultFilename = `${collection.name.toLowerCase().replace(/\s+/g, '-')}${suffix}.json`;
    const jsonString = JSON.stringify(jsonData, null, 2);
    downloadFile(jsonString, filename || defaultFilename, 'application/json');
  }
}

/**
 * Download all collections as a single combined JSON array file
 * NOTE: Most plugins expect single collection per file, use exportCollectionsFlattened instead
 * @deprecated Use exportCollectionsFlattened for better compatibility
 */
export function downloadFigmaExportCombined(
  collections: CollectionNode[],
  filename?: string
): void {
  const jsonData = exportMultipleCollections(collections);
  const jsonString = JSON.stringify(jsonData, null, 2);
  downloadFile(jsonString, filename || 'collections-combined.json', 'application/json');
}

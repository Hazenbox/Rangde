import {
  CollectionNode,
  DTCGExport,
  DTCGToken,
  DTCGGroup,
  Variable,
  VariableValue,
} from "@/types/collections";

/**
 * Convert variable name to DTCG-compatible path
 * Removes emojis and special characters, creates dot-notation path
 */
function variableNameToPath(name: string): string[] {
  // Remove emoji prefixes like 🎨, ✦, etc.
  const cleanName = name.replace(/^[🎨✦]+\/?/, '');
  
  // Split by / or other separators
  const parts = cleanName.split(/[\/\s]+/).filter(Boolean);
  
  // Clean each part: lowercase, replace spaces/special chars with hyphens
  return parts.map(part =>
    part
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  ).filter(Boolean);
}

/**
 * Create reference string for alias in DTCG format
 * Format: {collectionName.path.to.variable}
 */
function createDTCGReference(
  targetCollectionName: string,
  targetVariableName: string
): string {
  const collectionPath = targetCollectionName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const variablePath = variableNameToPath(targetVariableName).join('.');
  
  return `{${collectionPath}.${variablePath}}`;
}

/**
 * Build a nested object structure from path array
 * e.g., ['colors', 'primary', 'black'] => { colors: { primary: { black: token } } }
 */
function buildNestedStructure(
  path: string[],
  token: DTCGToken,
  target: DTCGGroup = {}
): DTCGGroup {
  if (path.length === 0) {
    return target;
  }
  
  if (path.length === 1) {
    target[path[0]] = token;
    return target;
  }
  
  const [first, ...rest] = path;
  if (!target[first] || typeof target[first] === 'object' && '$type' in target[first]) {
    target[first] = {};
  }
  
  buildNestedStructure(rest, token, target[first] as DTCGGroup);
  return target;
}

/**
 * Merge two nested structures
 */
function mergeNestedStructures(target: DTCGGroup, source: DTCGGroup): DTCGGroup {
  for (const key in source) {
    const sourceValue = source[key];
    
    if ('$type' in sourceValue) {
      // It's a token
      target[key] = sourceValue;
    } else {
      // It's a group
      if (!target[key]) {
        target[key] = {};
      }
      mergeNestedStructures(target[key] as DTCGGroup, sourceValue as DTCGGroup);
    }
  }
  
  return target;
}

/**
 * Resolve variable value to DTCG format
 * Returns either hex color string or reference string
 */
function resolveVariableValue(
  value: VariableValue,
  allCollections: CollectionNode[],
  currentCollection: CollectionNode
): string {
  if (value.type === 'color' && value.hex) {
    // Direct color value
    return value.hex;
  } else if (value.type === 'alias' && value.variableId) {
    // Alias to another variable
    const targetCollectionId = value.collectionId || currentCollection.id;
    const targetCollection = allCollections.find(c => c.id === targetCollectionId);
    const targetVariable = targetCollection?.variables.find(v => v.id === value.variableId);
    
    if (targetVariable && targetCollection) {
      return createDTCGReference(targetCollection.name, targetVariable.name);
    }
    
    // Fallback if reference not found
    console.warn(`Alias reference not found: ${value.variableId} in collection ${targetCollectionId}`);
    return '#000000';
  }
  
  // Fallback
  return '#000000';
}

/**
 * Export a single collection to DTCG format
 * If modeId is provided, export only that mode. Otherwise, export default mode.
 */
export function exportCollectionToDTCG(
  collection: CollectionNode,
  allCollections: CollectionNode[],
  modeId?: string
): DTCGExport {
  const result: DTCGGroup = {};
  
  // Use first mode as default if no modeId specified
  const targetModeId = modeId || collection.modes[0]?.id;
  
  if (!targetModeId) {
    console.warn(`No mode found for collection ${collection.name}`);
    return result;
  }
  
  // Process each variable
  for (const variable of collection.variables) {
    const value = variable.valuesByMode[targetModeId];
    
    if (!value) {
      continue;
    }
    
    // Create the path for this variable
    const path = variableNameToPath(variable.name);
    
    // Create the token
    const token: DTCGToken = {
      $type: 'color',
      $value: resolveVariableValue(value, allCollections, collection),
    };
    
    if (variable.description) {
      token.$description = variable.description;
    }
    
    // Build nested structure and merge
    const nested = buildNestedStructure(path, token);
    mergeNestedStructures(result, nested);
  }
  
  return result;
}

/**
 * Export multiple collections to DTCG format
 * Each collection becomes a top-level group
 */
export function exportMultipleCollectionsToDTCG(
  collections: CollectionNode[],
  modeId?: string
): DTCGExport {
  const result: DTCGGroup = {};
  
  for (const collection of collections) {
    const collectionName = collection.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const collectionTokens = exportCollectionToDTCG(collection, collections, modeId);
    
    result[collectionName] = collectionTokens;
  }
  
  return result;
}

/**
 * Export collection(s) with all modes as separate files
 * Returns a map of filename -> DTCG content
 */
export function exportWithAllModes(
  collections: CollectionNode | CollectionNode[]
): Record<string, DTCGExport> {
  const collectionArray = Array.isArray(collections) ? collections : [collections];
  const result: Record<string, DTCGExport> = {};
  
  // Get all unique modes across collections
  const modeMap = new Map<string, string>();
  
  collectionArray.forEach(collection => {
    collection.modes.forEach(mode => {
      modeMap.set(mode.id, mode.name);
    });
  });
  
  // Export each mode as a separate file
  modeMap.forEach((modeName, modeId) => {
    const safeModeName = modeName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const filename = `tokens.${safeModeName}.json`;
    const content = collectionArray.length === 1
      ? exportCollectionToDTCG(collectionArray[0], collectionArray, modeId)
      : exportMultipleCollectionsToDTCG(collectionArray, modeId);
    
    result[filename] = content;
  });
  
  // Also export a default tokens.json with the first mode
  if (modeMap.size > 0) {
    const firstModeId = Array.from(modeMap.keys())[0];
    result['tokens.json'] = collectionArray.length === 1
      ? exportCollectionToDTCG(collectionArray[0], collectionArray, firstModeId)
      : exportMultipleCollectionsToDTCG(collectionArray, firstModeId);
  }
  
  return result;
}

/**
 * Download DTCG export as JSON file(s)
 */
export function downloadDTCGExport(
  collections: CollectionNode | CollectionNode[],
  options: {
    includeAllModes?: boolean;
    filename?: string;
  } = {}
): void {
  const collectionArray = Array.isArray(collections) ? collections : [collections];
  
  if (options.includeAllModes) {
    // Export multiple files (one per mode)
    const files = exportWithAllModes(collectionArray);
    
    Object.entries(files).forEach(([filename, content]) => {
      const jsonString = JSON.stringify(content, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  } else {
    // Export single file with first mode
    const content = collectionArray.length === 1
      ? exportCollectionToDTCG(collectionArray[0], collectionArray)
      : exportMultipleCollectionsToDTCG(collectionArray);
    
    const defaultFilename = options.filename || 'tokens.json';
    const jsonString = JSON.stringify(content, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

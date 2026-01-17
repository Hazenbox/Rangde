import {
  CollectionNode,
  TokensStudioExport,
  TokensStudioToken,
  TokensStudioTokenSet,
  TokensStudioTheme,
  Variable,
  VariableValue,
  CollectionLayer,
} from "@/types/collections";

/**
 * Convert variable name to Tokens Studio compatible token name
 * Uses dot notation for nested paths
 */
function variableNameToTokenPath(name: string): string[] {
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
 * Create reference string for alias in Tokens Studio format
 * Format: {setName.path.to.token}
 */
function createTokensStudioReference(
  targetCollectionName: string,
  targetVariableName: string
): string {
  const setName = targetCollectionName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const tokenPath = variableNameToTokenPath(targetVariableName).join('.');
  
  return `{${setName}.${tokenPath}}`;
}

/**
 * Build a nested token structure from path array
 */
function buildNestedTokenStructure(
  path: string[],
  token: TokensStudioToken,
  target: TokensStudioTokenSet = {}
): TokensStudioTokenSet {
  if (path.length === 0) {
    return target;
  }
  
  if (path.length === 1) {
    target[path[0]] = token;
    return target;
  }
  
  const [first, ...rest] = path;
  if (!target[first] || (typeof target[first] === 'object' && 'value' in target[first])) {
    target[first] = {};
  }
  
  buildNestedTokenStructure(rest, token, target[first] as TokensStudioTokenSet);
  return target;
}

/**
 * Merge two nested token structures
 */
function mergeTokenStructures(
  target: TokensStudioTokenSet,
  source: TokensStudioTokenSet
): TokensStudioTokenSet {
  for (const key in source) {
    const sourceValue = source[key];
    
    if (typeof sourceValue === 'object' && 'value' in sourceValue) {
      // It's a token
      target[key] = sourceValue;
    } else {
      // It's a nested set
      if (!target[key]) {
        target[key] = {};
      }
      mergeTokenStructures(
        target[key] as TokensStudioTokenSet,
        sourceValue as TokensStudioTokenSet
      );
    }
  }
  
  return target;
}

/**
 * Resolve variable value to Tokens Studio format
 * Returns either hex color string or reference string
 */
function resolveTokenValue(
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
      return createTokensStudioReference(targetCollection.name, targetVariable.name);
    }
    
    // Fallback if reference not found
    console.warn(`Alias reference not found: ${value.variableId} in collection ${targetCollectionId}`);
    return '#000000';
  }
  
  // Fallback
  return '#000000';
}

/**
 * Get token set name based on collection layer
 */
function getTokenSetName(collection: CollectionNode): string {
  // Use layer as prefix if available
  const layerPrefix = collection.layer 
    ? `${collection.layer}-`
    : '';
  
  const baseName = collection.name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${layerPrefix}${baseName}`;
}

/**
 * Export a single collection to Tokens Studio token set
 * If modeId is provided, export only that mode
 */
export function exportCollectionToTokenSet(
  collection: CollectionNode,
  allCollections: CollectionNode[],
  modeId?: string
): TokensStudioTokenSet {
  const result: TokensStudioTokenSet = {};
  
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
    
    // Create the path for this token
    const path = variableNameToTokenPath(variable.name);
    
    // Create the token
    const token: TokensStudioToken = {
      value: resolveTokenValue(value, allCollections, collection),
      type: 'color',
    };
    
    if (variable.description) {
      token.description = variable.description;
    }
    
    // Build nested structure and merge
    const nested = buildNestedTokenStructure(path, token);
    mergeTokenStructures(result, nested);
  }
  
  return result;
}

/**
 * Create themes from collection modes
 */
function createThemesFromModes(collections: CollectionNode[]): TokensStudioTheme[] {
  const themes: TokensStudioTheme[] = [];
  const modeMap = new Map<string, string>();
  
  // Collect all unique modes
  collections.forEach(collection => {
    collection.modes.forEach(mode => {
      modeMap.set(mode.id, mode.name);
    });
  });
  
  // Create a theme for each mode
  modeMap.forEach((modeName, modeId) => {
    const selectedTokenSets: Record<string, 'enabled' | 'disabled' | 'source'> = {};
    
    // Enable all collections for this theme
    collections.forEach(collection => {
      const setName = getTokenSetName(collection);
      // Check if collection has this mode
      const hasMode = collection.modes.some(m => m.id === modeId);
      selectedTokenSets[setName] = hasMode ? 'enabled' : 'disabled';
    });
    
    themes.push({
      id: modeId,
      name: modeName,
      selectedTokenSets,
    });
  });
  
  return themes;
}

/**
 * Export multiple collections to Tokens Studio format
 * Each collection becomes a token set, modes become themes
 */
export function exportToTokensStudio(
  collections: CollectionNode | CollectionNode[],
  options: {
    includeThemes?: boolean;
    modeId?: string;
  } = {}
): TokensStudioExport {
  const collectionArray = Array.isArray(collections) ? collections : [collections];
  const result: TokensStudioExport = {};
  
  // Create token sets for each collection
  const tokenSetOrder: string[] = [];
  
  collectionArray.forEach(collection => {
    const setName = getTokenSetName(collection);
    tokenSetOrder.push(setName);
    
    result[setName] = exportCollectionToTokenSet(
      collection,
      collectionArray,
      options.modeId
    );
  });
  
  // Add themes if requested
  if (options.includeThemes !== false) {
    result.$themes = createThemesFromModes(collectionArray);
  }
  
  // Add metadata
  result.$metadata = {
    tokenSetOrder,
  };
  
  return result;
}

/**
 * Export with all modes as separate token sets
 * Each mode gets its own token set with mode suffix
 */
export function exportWithAllModesAsTokenSets(
  collections: CollectionNode | CollectionNode[]
): TokensStudioExport {
  const collectionArray = Array.isArray(collections) ? collections : [collections];
  const result: TokensStudioExport = {};
  const tokenSetOrder: string[] = [];
  
  // Get all unique modes
  const modeMap = new Map<string, string>();
  collectionArray.forEach(collection => {
    collection.modes.forEach(mode => {
      modeMap.set(mode.id, mode.name);
    });
  });
  
  // Create token sets for each collection + mode combination
  modeMap.forEach((modeName, modeId) => {
    const safeModeNamemodeName = modeName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    collectionArray.forEach(collection => {
      const hasMode = collection.modes.some(m => m.id === modeId);
      if (!hasMode) return;
      
      const setName = `${getTokenSetName(collection)}-${safeModeNamemodeName}`;
      tokenSetOrder.push(setName);
      
      result[setName] = exportCollectionToTokenSet(collection, collectionArray, modeId);
    });
  });
  
  // Add themes
  result.$themes = createThemesFromModes(collectionArray);
  
  // Add metadata
  result.$metadata = {
    tokenSetOrder,
  };
  
  return result;
}

/**
 * Download Tokens Studio export as JSON file
 */
export function downloadTokensStudioExport(
  collections: CollectionNode | CollectionNode[],
  options: {
    includeThemes?: boolean;
    modeId?: string;
    filename?: string;
  } = {}
): void {
  const content = exportToTokensStudio(collections, {
    includeThemes: options.includeThemes,
    modeId: options.modeId,
  });
  
  const defaultFilename = options.filename || 'tokens-studio.json';
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

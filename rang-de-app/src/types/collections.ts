/**
 * Node type - only 'collection' now (no items)
 */
export type NodeType = 'collection';

/**
 * Collection Layer - Three-layer semantic token architecture
 */
export enum CollectionLayer {
  PRIMITIVE = 'primitive',
  SEMANTIC = 'semantic',
  THEME = 'theme'
}

/**
 * Position for React Flow nodes
 */
export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Dropped color info for visual display on nodes
 */
export interface DroppedColor {
  hex: string;
  paletteId: string;
  paletteName: string;
  step: number;
  scaleType?: string;
  timestamp: number;
}

/**
 * Metadata for collections (optional custom properties)
 */
export interface CollectionMetadata {
  scopes?: string[]; // Figma scopes like ["ALL_SCOPES"], ["FRAME_FILL"], etc.
  codeSyntax?: string; // CSS variable syntax
  description?: string;
  droppedColors?: DroppedColor[]; // Recently dropped colors for node display
  [key: string]: any; // Allow any additional custom properties
}

/**
 * Variable Mode - represents a mode like Light, Dark, etc.
 */
export interface VariableMode {
  id: string; // e.g., "1326:0"
  name: string; // e.g., "Light", "Dark"
}

/**
 * Variable Value - can be a direct color or an alias to another variable
 */
export interface VariableValue {
  type: 'color' | 'alias';
  // For direct colors
  hex?: string;
  // For aliases (reference to another variable)
  variableId?: string;
  // For cross-collection aliases (if provided, reference is cross-collection)
  collectionId?: string;
}

/**
 * Variable - has one value per mode
 */
export interface Variable {
  id: string;
  name: string; // e.g., "🎨/black/800" or "✦/text/default/default"
  description?: string;
  valuesByMode: Record<string, VariableValue>; // modeId → value
  scopes?: string[];
  codeSyntax?: string;
  position?: NodePosition; // Position for variable-level visualization
}

/**
 * Collection Node - contains modes and variables
 */
export interface CollectionNode {
  id: string;
  nodeType: 'collection';
  name: string;
  icon?: string;
  position: NodePosition;
  layer?: CollectionLayer; // NEW: Semantic layer (Primitive, Semantic, Theme)
  isParent?: boolean; // NEW: Mark this collection as parent (only one can be parent)
  
  // Collection-specific data
  modes: VariableMode[]; // List of modes (Light, Dark, etc.)
  variables: Variable[]; // List of variables
  
  metadata?: CollectionMetadata;
  createdAt: number;
  updatedAt: number;
}

/**
 * Edge style options
 */
export interface EdgeStyle {
  strokeWidth?: number;
  strokeDasharray?: string;
  animated?: boolean;
}

/**
 * Collection Edge - Connection between collection nodes (rarely used now)
 */
export interface CollectionEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  label?: string;
  style?: EdgeStyle;
  createdAt: number;
}

/**
 * Collections State - The complete state for the collections feature
 */
export interface CollectionsState {
  collectionNodes: CollectionNode[];
  edges: CollectionEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
}

/**
 * Figma Variable Mode Value
 */
export interface FigmaVariableValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Figma Variable Alias
 */
export interface FigmaVariableAlias {
  type: 'VARIABLE_ALIAS';
  id: string;
}

/**
 * Figma Variable Mode Values
 */
export type FigmaValuesByMode = Record<string, FigmaVariableValue | FigmaVariableAlias>;

/**
 * Figma Resolved Value
 */
export interface FigmaResolvedValue {
  resolvedValue: FigmaVariableValue;
  alias: string | null;
  aliasName?: string;
}

/**
 * Figma Variable
 */
export interface FigmaVariable {
  id: string;
  name: string;
  description?: string;
  type: 'COLOR';
  valuesByMode: FigmaValuesByMode;
  resolvedValuesByMode: Record<string, FigmaResolvedValue>;
  scopes: string[];
  hiddenFromPublishing: boolean;
  codeSyntax: Record<string, string>;
}

/**
 * Figma Export Format (Internal API format - NOT importable via plugins)
 */
export interface FigmaExport {
  id: string;
  name: string;
  modes: Record<string, string>; // modeId → modeName
  variableIds: string[];
  variables: FigmaVariable[];
}

/**
 * Export Format Types
 */
export enum ExportFormat {
  DTCG = 'dtcg', // Design Tokens Community Group format (W3C standard)
  TOKENS_STUDIO = 'tokens-studio', // Tokens Studio for Figma format
  FIGMA_API = 'figma-api' // Figma internal API format (legacy, not importable)
}

/**
 * DTCG (Design Tokens Community Group) Format Types
 * Standard format for design tokens - works with "Figma Design Token Importer" plugin
 */

export interface DTCGToken {
  $type: string; // e.g., "color", "dimension", "fontFamily"
  $value: string | DTCGReference; // Hex color or reference to another token
  $description?: string;
}

export interface DTCGReference {
  $ref: string; // e.g., "{colors.primary.black}"
}

export interface DTCGGroup {
  [key: string]: DTCGToken | DTCGGroup;
}

export interface DTCGExport {
  [key: string]: DTCGToken | DTCGGroup;
}

/**
 * Tokens Studio Format Types
 * Popular format used by Tokens Studio plugin for Figma
 */

export interface TokensStudioToken {
  value: string; // Hex color or reference like "{colors.primary}"
  type: string; // e.g., "color", "sizing", "fontFamily"
  description?: string;
}

export interface TokensStudioTokenSet {
  [key: string]: TokensStudioToken | TokensStudioTokenSet;
}

export interface TokensStudioTheme {
  id: string;
  name: string;
  selectedTokenSets: Record<string, 'enabled' | 'disabled' | 'source'>;
  $figmaStyleReferences?: Record<string, string>;
  $figmaVariableReferences?: Record<string, string>;
}

export interface TokensStudioExport {
  [setName: string]: TokensStudioTokenSet | TokensStudioTheme[];
  $themes?: TokensStudioTheme[];
  $metadata?: {
    tokenSetOrder?: string[];
  };
}

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  CollectionNode,
  CollectionEdge,
  CollectionsState,
  NodePosition,
  CollectionMetadata,
  EdgeStyle,
  VariableMode,
  Variable,
  VariableValue,
  DroppedColor,
  CollectionLayer,
} from "@/types/collections";

// Safe storage adapter that handles SSR
const safeStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(name, value);
    } catch {
      // Ignore errors
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore errors
    }
  },
};

interface CollectionsStore extends CollectionsState {
  // Collection CRUD
  createCollection: (name: string, position: NodePosition, layer?: CollectionLayer, icon?: string, metadata?: CollectionMetadata) => CollectionNode;
  updateCollection: (collectionId: string, updates: Partial<Omit<CollectionNode, 'id' | 'createdAt'>>) => void;
  deleteCollection: (collectionId: string) => void;
  getCollection: (collectionId: string) => CollectionNode | undefined;

  // Mode management
  addMode: (collectionId: string, modeName: string) => VariableMode | null;
  updateMode: (collectionId: string, modeId: string, name: string) => void;
  deleteMode: (collectionId: string, modeId: string) => void;

  // Variable management
  addVariable: (collectionId: string, name: string, description?: string, hex?: string) => Variable | null;
  updateVariable: (collectionId: string, variableId: string, updates: Partial<Omit<Variable, 'id' | 'valuesByMode'>>) => void;
  deleteVariable: (collectionId: string, variableId: string) => void;
  setVariableValue: (collectionId: string, variableId: string, modeId: string, value: VariableValue) => void;
  getVariable: (collectionId: string, variableId: string) => Variable | undefined;

  // Cross-collection helpers
  getVariableFromAnyCollection: (collectionId: string, variableId: string) => { collection: CollectionNode; variable: Variable } | null;
  getAllVariables: () => Array<{ collection: CollectionNode; variable: Variable }>;

  // Variable position management
  updateVariablePosition: (collectionId: string, variableId: string, position: NodePosition) => void;
  updateVariablePositions: (updates: Array<{ collectionId: string; variableId: string; position: NodePosition }>) => void;

  // Edges CRUD (rarely used now)
  createEdge: (sourceId: string, targetId: string, label?: string, style?: EdgeStyle) => CollectionEdge;
  deleteEdge: (edgeId: string) => void;

  // Dropped colors tracking
  addDroppedColor: (collectionId: string, droppedColor: DroppedColor) => void;
  getDroppedColors: (collectionId: string) => DroppedColor[];

  // Selection
  setSelectedNode: (nodeId: string | null) => void;

  // Parent collection management
  setParentCollection: (collectionId: string | null) => void;
  getParentCollection: () => CollectionNode | null;

  // Utility
  clearAll: () => void;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Default color for collection nodes
const DEFAULT_COLLECTION_COLOR = '#3B82F6';

export const useCollectionsStore = create<CollectionsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      collectionNodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,

      // Collection CRUD
      createCollection: (name, position, layer, icon, metadata) => {
        const newCollection: CollectionNode = {
          id: generateId('collection'),
          nodeType: 'collection',
          name,
          icon,
          position,
          layer, // NEW: Add layer support
          modes: [], // Start with no modes - skeleton collection
          variables: [],
          metadata,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          collectionNodes: [...state.collectionNodes, newCollection],
        }));

        return newCollection;
      },

      updateCollection: (collectionId, updates) => {
        set((state) => ({
          collectionNodes: state.collectionNodes.map((node) =>
            node.id === collectionId ? { ...node, ...updates, updatedAt: Date.now() } : node
          ),
        }));
      },

      deleteCollection: (collectionId) => {
        set((state) => ({
          collectionNodes: state.collectionNodes.filter((node) => node.id !== collectionId),
          edges: state.edges.filter((edge) => edge.source !== collectionId && edge.target !== collectionId),
          selectedNodeId: state.selectedNodeId === collectionId ? null : state.selectedNodeId,
        }));
      },

      getCollection: (collectionId) => {
        return get().collectionNodes.find((node) => node.id === collectionId);
      },

      // Mode management
      addMode: (collectionId, modeName) => {
        const collection = get().getCollection(collectionId);
        if (!collection) return null;

        const newMode: VariableMode = {
          id: generateId('mode'),
          name: modeName,
        };

        // Add mode to collection and initialize empty values for all variables
        set((state) => ({
          collectionNodes: state.collectionNodes.map((node) => {
            if (node.id !== collectionId) return node;
            
            return {
              ...node,
              modes: [...node.modes, newMode],
              variables: node.variables.map((variable) => ({
                ...variable,
                valuesByMode: {
                  ...variable.valuesByMode,
                  [newMode.id]: { type: 'color' as const, hex: '#000000' },
                },
              })),
              updatedAt: Date.now(),
            };
          }),
        }));

        return newMode;
      },

      updateMode: (collectionId, modeId, name) => {
        set((state) => ({
          collectionNodes: state.collectionNodes.map((node) => {
            if (node.id !== collectionId) return node;
            
            return {
              ...node,
              modes: node.modes.map((mode) =>
                mode.id === modeId ? { ...mode, name } : mode
              ),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteMode: (collectionId, modeId) => {
        set((state) => ({
          collectionNodes: state.collectionNodes.map((node) => {
            if (node.id !== collectionId) return node;
            
            // Remove mode and its values from all variables
            const updatedVariables = node.variables.map((variable) => {
              const { [modeId]: removed, ...remainingValues } = variable.valuesByMode;
              return {
                ...variable,
                valuesByMode: remainingValues,
              };
            });

            return {
              ...node,
              modes: node.modes.filter((mode) => mode.id !== modeId),
              variables: updatedVariables,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      // Variable management
      addVariable: (collectionId, name, description, hex) => {
        const collection = get().getCollection(collectionId);
        if (!collection) return null;

        // Initialize valuesByMode with provided color or default black
        const defaultHex = hex || '#000000';
        const valuesByMode: Record<string, VariableValue> = {};
        collection.modes.forEach((mode) => {
          valuesByMode[mode.id] = { type: 'color', hex: defaultHex };
        });

        const newVariable: Variable = {
          id: generateId('variable'),
          name,
          description,
          valuesByMode,
          scopes: ['ALL_SCOPES'],
        };

        set((state) => ({
          collectionNodes: state.collectionNodes.map((node) => {
            if (node.id !== collectionId) return node;
            
            return {
              ...node,
              variables: [...node.variables, newVariable],
              updatedAt: Date.now(),
            };
          }),
        }));

        return newVariable;
      },

      updateVariable: (collectionId, variableId, updates) => {
        set((state) => ({
          collectionNodes: state.collectionNodes.map((node) => {
            if (node.id !== collectionId) return node;
            
            return {
              ...node,
              variables: node.variables.map((variable) =>
                variable.id === variableId ? { ...variable, ...updates } : variable
              ),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteVariable: (collectionId, variableId) => {
        set((state) => ({
          collectionNodes: state.collectionNodes.map((node) => {
            if (node.id !== collectionId) return node;
            
            return {
              ...node,
              variables: node.variables.filter((variable) => variable.id !== variableId),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      setVariableValue: (collectionId, variableId, modeId, value) => {
        // Validate cross-collection references if it's an alias
        if (value.type === 'alias' && value.collectionId && value.variableId) {
          const targetVar = get().getVariableFromAnyCollection(value.collectionId, value.variableId);
          if (!targetVar) {
            console.warn(`Cross-collection reference not found: collection=${value.collectionId}, variable=${value.variableId}`);
            return;
          }
        }

        set((state) => ({
          collectionNodes: state.collectionNodes.map((node) => {
            if (node.id !== collectionId) return node;
            
            return {
              ...node,
              variables: node.variables.map((variable) => {
                if (variable.id !== variableId) return variable;
                
                return {
                  ...variable,
                  valuesByMode: {
                    ...variable.valuesByMode,
                    [modeId]: value,
                  },
                };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      getVariable: (collectionId, variableId) => {
        const collection = get().getCollection(collectionId);
        return collection?.variables.find((v) => v.id === variableId);
      },

      // Cross-collection helpers
      getVariableFromAnyCollection: (collectionId, variableId) => {
        const collection = get().getCollection(collectionId);
        if (!collection) return null;
        
        const variable = collection.variables.find((v) => v.id === variableId);
        if (!variable) return null;
        
        return { collection, variable };
      },

      getAllVariables: () => {
        const allVariables: Array<{ collection: CollectionNode; variable: Variable }> = [];
        
        get().collectionNodes.forEach((collection) => {
          collection.variables.forEach((variable) => {
            allVariables.push({ collection, variable });
          });
        });
        
        return allVariables;
      },

      // Variable position management
      updateVariablePosition: (collectionId, variableId, position) => {
        set((state) => ({
          collectionNodes: state.collectionNodes.map((node) => {
            if (node.id !== collectionId) return node;
            
            return {
              ...node,
              variables: node.variables.map((variable) =>
                variable.id === variableId
                  ? { ...variable, position }
                  : variable
              ),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      updateVariablePositions: (updates) => {
        set((state) => {
          const updatesMap = new Map(
            updates.map(u => [`${u.collectionId}:${u.variableId}`, u.position])
          );
          
          return {
            collectionNodes: state.collectionNodes.map((node) => ({
              ...node,
              variables: node.variables.map((variable) => {
                const key = `${node.id}:${variable.id}`;
                const newPosition = updatesMap.get(key);
                return newPosition ? { ...variable, position: newPosition } : variable;
              }),
              updatedAt: Date.now(),
            })),
          };
        });
      },

      // Edges CRUD
      createEdge: (sourceId, targetId, label, style) => {
        const newEdge: CollectionEdge = {
          id: generateId('edge'),
          source: sourceId,
          target: targetId,
          label,
          style,
          createdAt: Date.now(),
        };
        set((state) => ({
          edges: [...state.edges, newEdge],
        }));
        return newEdge;
      },

      deleteEdge: (edgeId) => {
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== edgeId),
          selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
        }));
      },

      // Dropped colors tracking
      addDroppedColor: (collectionId, droppedColor) => {
        set((state) => ({
          collectionNodes: state.collectionNodes.map((node) => {
            if (node.id !== collectionId) return node;

            const currentDropped = node.metadata?.droppedColors || [];
            // Keep only last 10 dropped colors
            const updatedDropped = [droppedColor, ...currentDropped].slice(0, 10);

            return {
              ...node,
              metadata: {
                ...node.metadata,
                droppedColors: updatedDropped,
              },
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      getDroppedColors: (collectionId) => {
        const collection = get().getCollection(collectionId);
        return collection?.metadata?.droppedColors || [];
      },

      // Selection
      setSelectedNode: (nodeId) => {
        set({ selectedNodeId: nodeId, selectedEdgeId: null });
      },

      // Parent collection management
      setParentCollection: (collectionId) => {
        set((state) => ({
          collectionNodes: state.collectionNodes.map((node) => ({
            ...node,
            isParent: node.id === collectionId ? true : false,
            updatedAt: node.id === collectionId ? Date.now() : node.updatedAt,
          })),
        }));
      },

      getParentCollection: () => {
        return get().collectionNodes.find((node) => node.isParent) || null;
      },

      // Utility
      clearAll: () => {
        set({
          collectionNodes: [],
          edges: [],
          selectedNodeId: null,
          selectedEdgeId: null,
        });
      },
    }),
    {
      name: "rangule-collections",
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        collectionNodes: state.collectionNodes,
        edges: state.edges,
      }),
      version: 4,
      migrate: (persistedState: any, version: number) => {
        // Clear old data structure entirely and start fresh
        // The new structure is too different from the old one
        if (version < 4) {
          return {
            collectionNodes: [],
            edges: [],
            selectedNodeId: null,
            selectedEdgeId: null,
          };
        }
        return persistedState;
      },
    }
  )
);

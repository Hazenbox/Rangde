"use client";

import * as React from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Connection,
  ReactFlowProvider,
  MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";
import { Download, Maximize2, Minimize2, LayoutGrid, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCollectionsStore } from "@/store/collections-store";
import { usePaletteStore } from "@/store/palette-store";
import { CollectionNode } from "@/components/collections/collection-node";
import { VariableNode } from "@/components/collections/variable-node";
import { CollectionNodeDialog } from "@/components/collections/collection-node-dialog";
import { CollectionDetailsPanel } from "@/components/collections/collection-details-panel";
import { downloadFigmaExport } from "@/lib/collections-exporter";
import { autoArrangeCollections } from "@/lib/column-layout";
import { validateAliasRelationship, validateCollectionVariables } from "@/lib/collection-validator";
import { CollectionsEmptyState } from "@/components/collections/empty-state";
import { ExportPreviewDialog } from "@/components/collections/export-preview-dialog";
import { calculateHierarchicalPositions } from "@/lib/hierarchical-layout";
import { cn } from "@/lib/utils";

type ViewMode = 'collections' | 'variables' | 'both';

function CollectionsUnifiedViewContent() {
  const {
    collectionNodes,
    edges: storeEdges,
    selectedNodeId,
    createEdge,
    deleteEdge,
    updateCollection,
    setSelectedNode,
    getCollection,
    deleteVariable,
  } = useCollectionsStore();

  const { isFullscreen, toggleFullscreen } = usePaletteStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesState] = useEdgesState([]);
  const [nodeDialogOpen, setNodeDialogOpen] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>('collections');

  // Memoize nodeTypes to prevent React Flow warning about recreating objects
  const nodeTypes = React.useMemo(() => ({
    collection: CollectionNode,
    variable: VariableNode,
  }), []);

  // Auto-arrange handler
  const handleAutoArrange = React.useCallback(() => {
    const arranged = autoArrangeCollections(collectionNodes);
    arranged.forEach(collection => {
      updateCollection(collection.id, { position: collection.position });
    });
  }, [collectionNodes, updateCollection]);

  // Sync React Flow nodes with store - only create collection nodes
  React.useEffect(() => {
    const flowNodes: Node[] = [];

    collectionNodes.forEach((collection) => {
      // Add validation state to collection node
      const validation = validateCollectionVariables(collection, collectionNodes);
      const validationState = validation.errors.length > 0 ? 'error' 
        : validation.warnings.length > 0 ? 'warning' 
        : 'valid';

      // Add collection node (variables are rendered inside it)
      flowNodes.push({
        id: collection.id,
        type: 'collection',
        position: collection.position,
        data: {
          ...collection,
          validationState,
          validationErrors: validation.errors,
          validationWarnings: validation.warnings,
        },
        selected: collection.id === selectedNodeId,
      });
    });

    setNodes(flowNodes);
  }, [collectionNodes, selectedNodeId]);

  // No longer need parent-child edges since variables are inside collections

  // Generate alias edges (variable to variable using handle IDs)
  const getAliasEdges = React.useCallback((): Edge[] => {
    const edges: Edge[] = [];
    const seenEdgeIds = new Set<string>();
    
    collectionNodes.forEach((targetCollection) => {
      targetCollection.variables.forEach((variable) => {
        // Track unique alias relationships (not per mode)
        const aliasRelationships = new Map<string, { sourceCollectionId: string; variableId: string }>();
        
        // Check if this variable has an alias in any mode
        Object.values(variable.valuesByMode).forEach((value) => {
          if (value.type === 'alias' && value.variableId) {
            const sourceCollectionId = value.collectionId || targetCollection.id;
            const relationshipKey = `${sourceCollectionId}:${value.variableId}`;
            
            // Only track unique relationships (one per source variable, not per mode)
            if (!aliasRelationships.has(relationshipKey)) {
              aliasRelationships.set(relationshipKey, {
                sourceCollectionId,
                variableId: value.variableId,
              });
            }
          }
        });
        
        // Create one edge per unique alias relationship
        aliasRelationships.forEach(({ sourceCollectionId, variableId }) => {
          const edgeId = `alias-${targetCollection.id}:${variable.id}-${sourceCollectionId}:${variableId}`;
          
          // Skip if we've already created this edge
          if (seenEdgeIds.has(edgeId)) {
            return;
          }
          seenEdgeIds.add(edgeId);
          
          // Use handle IDs: collectionId-var-variableId-source/target
          const sourceHandleId = `${sourceCollectionId}-var-${variableId}-source`;
          const targetHandleId = `${targetCollection.id}-var-${variable.id}-target`;
          
          // Validate the relationship
          const sourceCollection = getCollection(sourceCollectionId);
          const validation = sourceCollection && targetCollection 
            ? validateAliasRelationship(targetCollection, sourceCollection)
            : { isValid: true };
          
          const isCrossCollection = sourceCollectionId !== targetCollection.id;
          const edgeColor = validation.isValid ? (isCrossCollection ? '#8b5cf6' : '#6b7280') : '#ef4444';
          
          edges.push({
            id: edgeId,
            source: sourceCollectionId,
            target: targetCollection.id,
            sourceHandle: sourceHandleId,
            targetHandle: targetHandleId,
            type: 'smoothstep',
            animated: isCrossCollection,
            style: { 
              stroke: edgeColor,
              strokeWidth: isCrossCollection ? 2 : 1,
            },
          });
        });
      });
    });
    
    return edges;
  }, [collectionNodes, getCollection]);

  // Sync React Flow edges
  React.useEffect(() => {
    const manualEdges: Edge[] = storeEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'default',
      animated: edge.style?.animated || false,
    }));

    const aliasEdges = getAliasEdges();
    
    // Combine and deduplicate edges by ID to prevent React key conflicts
    const allEdges = [...manualEdges, ...aliasEdges];
    const uniqueEdgesMap = new Map<string, Edge>();
    
    allEdges.forEach((edge) => {
      if (!uniqueEdgesMap.has(edge.id)) {
        uniqueEdgesMap.set(edge.id, edge);
      }
    });
    
    setEdges(Array.from(uniqueEdgesMap.values()));
  }, [storeEdges, collectionNodes, getAliasEdges]);

  // Handle node position changes
  const handleNodeDragStop = React.useCallback(
    (_event: any, node: Node) => {
      updateCollection(node.id, { position: node.position });
    },
    [updateCollection]
  );

  // Handle edge creation with layer validation (now works with variable handles)
  const handleConnect = React.useCallback(
    (connection: Connection) => {
      const { source, target, sourceHandle, targetHandle } = connection;
      
      if (!source || !target) return;
      
      // Check if connecting variable handles or collection handles
      const sourceIsVariable = sourceHandle?.includes('-var-');
      const targetIsVariable = targetHandle?.includes('-var-');
      const targetIsCollection = targetHandle?.includes('-collection-');
      
      // Case 1: Variable → Variable (using handles)
      if (sourceIsVariable && targetIsVariable) {
        // Parse handle IDs: collectionId-var-variableId-source/target
        const sourceVarId = sourceHandle?.split('-var-')[1]?.replace('-source', '');
        const targetVarId = targetHandle?.split('-var-')[1]?.replace('-target', '');
        
        if (!sourceVarId || !targetVarId) return;
        
        const sourceCollection = getCollection(source);
        const targetCollection = getCollection(target);
        
        if (!sourceCollection || !targetCollection) return;
        
        // Validate
        const validation = validateAliasRelationship(targetCollection, sourceCollection);
        
        if (!validation.isValid) {
          alert(`Cannot create alias: ${validation.error}`);
          return;
        }
        
        const targetVar = targetCollection.variables.find(v => v.id === targetVarId);
        const sourceVar = sourceCollection.variables.find(v => v.id === sourceVarId);
        
        if (!targetVar || !sourceVar) return;
        
        // Confirm
        const confirmed = confirm(
          `Create alias:\n\n"${targetVar.name}"\nwill reference\n"${sourceVar.name}"`
        );
        
        if (!confirmed) return;
        
        // Set alias for all modes
        const { setVariableValue } = useCollectionsStore.getState();
        targetCollection.modes.forEach(mode => {
          const aliasValue = source === target
            ? { type: 'alias' as const, variableId: sourceVarId }
            : { type: 'alias' as const, variableId: sourceVarId, collectionId: source };
          
          setVariableValue(target, targetVarId, mode.id, aliasValue);
        });
      }
      
      // Case 1.5: Variable → Collection (auto-create aliased variable)
      else if (sourceIsVariable && targetIsCollection) {
        // Parse handle ID to get source variable
        const sourceVarId = sourceHandle?.split('-var-')[1]?.replace('-source', '');
        
        if (!sourceVarId) return;
        
        const sourceCollection = getCollection(source);
        const targetCollection = getCollection(target);
        
        if (!sourceCollection || !targetCollection) return;
        
        const sourceVar = sourceCollection.variables.find(v => v.id === sourceVarId);
        
        if (!sourceVar) return;
        
        // Validate
        const validation = validateAliasRelationship(targetCollection, sourceCollection);
        
        if (!validation.isValid) {
          alert(`Cannot create alias: ${validation.error}`);
          return;
        }
        
        // Ensure target collection has at least one mode
        if (targetCollection.modes.length === 0) {
          alert('Target collection must have at least one mode');
          return;
        }
        
        // Auto-create new variable with alias
        const { addVariable, setVariableValue } = useCollectionsStore.getState();
        const newVar = addVariable(target, sourceVar.name);
        
        if (!newVar) return;
        
        // Set alias for all modes in target collection
        targetCollection.modes.forEach(mode => {
          const aliasValue = source === target
            ? { type: 'alias' as const, variableId: sourceVarId }
            : { type: 'alias' as const, variableId: sourceVarId, collectionId: source };
          
          setVariableValue(target, newVar.id, mode.id, aliasValue);
        });
        
        // Trigger edit mode for the new variable (will be handled in the next step)
        // For now, we just create the variable and the user can click to edit
      }
      
      // Case 2: Collection → Collection (legacy behavior, create edge)
      else if (!sourceIsVariable && targetIsCollection) {
        const sourceCollection = getCollection(source);
        const targetCollection = getCollection(target);
        
        if (sourceCollection && targetCollection) {
          const validation = validateAliasRelationship(targetCollection, sourceCollection);
          
          if (!validation.isValid) {
            alert(`Cannot create connection: ${validation.error}`);
            return;
          }
          
          if (validation.warning) {
            const confirmed = window.confirm(`Warning: ${validation.warning}\n\nContinue anyway?`);
            if (!confirmed) return;
          }
        }
        
        createEdge(source, target);
      }
    },
    [createEdge, getCollection]
  );

  // Handle edge deletion
  const handleEdgeContextMenu = React.useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      const confirmed = window.confirm(`Delete connection?`);
      if (confirmed) {
        deleteEdge(edge.id);
      }
    },
    [deleteEdge]
  );

  // Handle node selection
  const handleNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  // Handle pane click (deselect)
  const handlePaneClick = React.useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // No longer need handleNodesDelete since variables are deleted via button in collection node

  // Export to Figma JSON
  const handleExport = React.useCallback(() => {
    if (collectionNodes.length === 0) {
      alert('Please create a collection first');
      return;
    }
    setExportDialogOpen(true);
  }, [collectionNodes]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setNodeDialogOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (collectionNodes.length > 0) {
          handleExport();
        }
      }
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          toggleFullscreen();
        }
      }
      if (e.key === 'Escape' && selectedNodeId) {
        setSelectedNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, collectionNodes, handleExport, toggleFullscreen, setSelectedNode]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main Canvas */}
      <div className="flex-1 relative">
        {/* Toolbar */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-background/95 backdrop-blur-sm border rounded-full px-1.5 py-1 shadow-lg">
          <TooltipProvider delayDuration={300}>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full"
                  onClick={handleAutoArrange}
                  disabled={collectionNodes.length === 0}
                >
                  <LayoutGrid className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-[10px]">Auto-arrange by layer</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3 w-3" />
                  ) : (
                    <Maximize2 className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-[10px]">{isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full"
                  onClick={handleExport}
                  disabled={collectionNodes.length === 0}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-[10px]">Export JSON (Ctrl+E)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* React Flow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesState}
          onConnect={handleConnect}
          onNodeDragStop={handleNodeDragStop}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onEdgeContextMenu={handleEdgeContextMenu}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'default',
            animated: false,
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as any;
              if (data.validationState === 'error') return '#ef4444';
              if (data.validationState === 'warning') return '#f59e0b';
              return '#3B82F6';
            }}
            className="bg-background/80 backdrop-blur-sm border"
          />
        </ReactFlow>

        {/* Empty state */}
        {collectionNodes.length === 0 && (
          <CollectionsEmptyState onCreateCollection={() => setNodeDialogOpen(true)} />
        )}
      </div>

      {/* Right: Details Panel */}
      {selectedNodeId && !selectedNodeId.includes(':') && (
        <CollectionDetailsPanel
          collectionId={selectedNodeId}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Dialogs */}
      <CollectionNodeDialog
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
      />
      <ExportPreviewDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        collections={collectionNodes}
      />
    </div>
  );
}

export function CollectionsUnifiedView() {
  return (
    <ReactFlowProvider>
      <CollectionsUnifiedViewContent />
    </ReactFlowProvider>
  );
}

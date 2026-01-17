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
import { Plus, Download, Maximize2, Minimize2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCollectionsStore } from "@/store/collections-store";
import { usePaletteStore } from "@/store/palette-store";
import { CollectionNode } from "@/components/collections/collection-node";
import { CollectionNodeDialog } from "@/components/collections/collection-node-dialog";
import { CollectionDetailsPanel } from "@/components/collections/collection-details-panel";
import { downloadFigmaExport } from "@/lib/collections-exporter";
import { autoArrangeCollections } from "@/lib/column-layout";
import { validateAliasRelationship } from "@/lib/collection-validator";
import { cn } from "@/lib/utils";

function CollectionsViewContent() {
  const {
    collectionNodes,
    edges: storeEdges,
    selectedNodeId,
    createEdge,
    deleteEdge,
    updateCollection,
    setSelectedNode,
    getCollection,
  } = useCollectionsStore();

  const { isFullscreen, toggleFullscreen } = usePaletteStore();

  // Memoize nodeTypes to prevent React Flow warning about recreating objects
  const nodeTypes = React.useMemo(() => ({
    collection: CollectionNode,
  }), []);

  // Auto-arrange handler
  const handleAutoArrange = React.useCallback(() => {
    const arranged = autoArrangeCollections(collectionNodes);
    arranged.forEach(collection => {
      updateCollection(collection.id, { position: collection.position });
    });
  }, [collectionNodes, updateCollection]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesState] = useEdgesState([]);

  const [nodeDialogOpen, setNodeDialogOpen] = React.useState(false);

  // Sync React Flow nodes with store
  React.useEffect(() => {
    const flowNodes: Node[] = collectionNodes.map((node) => ({
      id: node.id,
      type: 'collection',
      position: node.position,
      data: node,
      selected: node.id === selectedNodeId,
    }));
    setNodes(flowNodes);
  }, [collectionNodes, selectedNodeId]);

  // Generate cross-collection reference edges
  const getCrossCollectionEdges = React.useCallback((): Edge[] => {
    const crossCollectionEdges: Edge[] = [];
    const edgeMap = new Map<string, number>(); // Track edge counts between collections

    collectionNodes.forEach((sourceCollection) => {
      sourceCollection.variables.forEach((variable) => {
        Object.values(variable.valuesByMode).forEach((value) => {
          if (value.type === 'alias' && value.collectionId && value.collectionId !== sourceCollection.id) {
            // This is a cross-collection reference
            const edgeKey = `${sourceCollection.id}-${value.collectionId}`;
            const count = edgeMap.get(edgeKey) || 0;
            edgeMap.set(edgeKey, count + 1);
          }
        });
      });
    });

    // Create edges with counts
    edgeMap.forEach((count, edgeKey) => {
      const [sourceId, targetId] = edgeKey.split('-');
      crossCollectionEdges.push({
        id: `cross-ref-${edgeKey}`,
        source: sourceId,
        target: targetId,
        label: `${count} ref${count > 1 ? 's' : ''}`,
        type: 'default',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        labelStyle: { fontSize: 10, fill: '#8b5cf6' },
        labelBgStyle: { fill: '#1f2937', opacity: 0.8 },
      });
    });

    return crossCollectionEdges;
  }, [collectionNodes]);

  // Sync React Flow edges with store + cross-collection edges
  React.useEffect(() => {
    const manualEdges: Edge[] = storeEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'default',
      animated: edge.style?.animated || false,
    }));

    const crossCollectionEdges = getCrossCollectionEdges();
    setEdges([...manualEdges, ...crossCollectionEdges]);
  }, [storeEdges, collectionNodes, getCrossCollectionEdges]);

  // Handle node position changes
  const handleNodeDragStop = React.useCallback(
    (_event: any, node: Node) => {
      updateCollection(node.id, { position: node.position });
    },
    [updateCollection]
  );

  // Handle edge creation with layer validation
  const handleConnect = React.useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        // Validate layer relationship
        const sourceCollection = getCollection(connection.source);
        const targetCollection = getCollection(connection.target);
        
        if (sourceCollection && targetCollection) {
          const validation = validateAliasRelationship(sourceCollection, targetCollection);
          
          if (!validation.isValid) {
            alert(`Cannot create connection: ${validation.error}`);
            return;
          }
          
          if (validation.warning) {
            const confirmed = window.confirm(`Warning: ${validation.warning}\n\nContinue anyway?`);
            if (!confirmed) return;
          }
        }
        
        createEdge(connection.source, connection.target);
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

  // Export to Figma JSON
  const handleExport = React.useCallback(() => {
    if (selectedNodeId) {
      const collection = getCollection(selectedNodeId);
      if (collection) {
        // Ask user if they want to export with dependencies (other collections)
        const hasCrossCollectionRefs = collection.variables.some(v =>
          Object.values(v.valuesByMode).some(val =>
            val.type === 'alias' && val.collectionId && val.collectionId !== collection.id
          )
        );

        if (hasCrossCollectionRefs && collectionNodes.length > 1) {
          const exportAll = confirm(
            `This collection has cross-collection references.\n\nExport all collections together to maintain references?`
          );
          if (exportAll) {
            downloadFigmaExport(collectionNodes);
          } else {
            downloadFigmaExport(collection);
          }
        } else {
          downloadFigmaExport(collection);
        }
      }
    } else if (collectionNodes.length === 1) {
      downloadFigmaExport(collectionNodes[0]);
    } else if (collectionNodes.length > 1) {
      // Export all collections
      downloadFigmaExport(collectionNodes);
    } else {
      alert('Please create a collection first');
    }
  }, [selectedNodeId, collectionNodes, getCollection]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N: New collection
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setNodeDialogOpen(true);
      }
      // Ctrl/Cmd + E: Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (collectionNodes.length > 0) {
          handleExport();
        }
      }
      // F: Toggle fullscreen
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        const target = e.target as HTMLElement;
        // Only if not in an input field
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          toggleFullscreen();
        }
      }
      // Delete/Backspace: Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        const target = e.target as HTMLElement;
        // Only if not in an input field
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const confirmed = window.confirm('Delete this collection?');
          if (confirmed) {
            // We'll need to add a delete function to the store
          }
        }
      }
      // Escape: Deselect
      if (e.key === 'Escape' && selectedNodeId) {
        setSelectedNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    collectionNodes,
    handleExport,
    toggleFullscreen,
    setSelectedNode,
  ]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Center: Main Canvas */}
      <div className="flex-1 relative">
        {/* Toolbar - compact */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-background/95 backdrop-blur-sm border rounded-md p-1.5 shadow-lg">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] px-2"
                  onClick={() => setNodeDialogOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  New
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-[10px]">Create collection (Ctrl+N)</p>
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-border" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
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
                  className="h-7 w-7 p-0"
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
                  className="h-7 w-7 p-0"
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
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              return '#3B82F6';
            }}
            className="bg-background/80 backdrop-blur-sm border"
          />
        </ReactFlow>

        {/* Empty state */}
        {collectionNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-2 max-w-md px-4">
              <h3 className="text-base font-semibold">Create Your First Collection</h3>
              <p className="text-[12px] text-muted-foreground">
                Collections contain modes (Light, Dark, etc.) and variables.
                Click a collection to see its details.
              </p>
              <div className="flex gap-2 justify-center pt-3 pointer-events-auto">
                <Button size="sm" className="h-7 text-[11px]" onClick={() => setNodeDialogOpen(true)}>
                  <Plus className="h-3 w-3 mr-1.5" />
                  Create Collection
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Details Panel */}
      {selectedNodeId && (
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
    </div>
  );
}

export function CollectionsView() {
  return (
    <ReactFlowProvider>
      <CollectionsViewContent />
    </ReactFlowProvider>
  );
}

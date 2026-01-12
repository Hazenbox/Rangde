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
import { Plus, Download, X, LayoutGrid, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCollectionsStore } from "@/store/collections-store";
import { usePaletteStore } from "@/store/palette-store";
import { VariableNodeVisualizer } from "@/components/collections/variable-node-visualizer";
import { CollectionNodeDialog } from "@/components/collections/collection-node-dialog";
import { CollectionSidebar } from "@/components/collections/collection-sidebar";
import { ModeSelector } from "@/components/collections/mode-selector";
import { downloadFigmaExport } from "@/lib/collections-exporter";
import { autoLayoutVariables } from "@/lib/auto-layout";
import { cn } from "@/lib/utils";

const nodeTypes = {
  variable: VariableNodeVisualizer,
};

function CollectionsViewVisualizerContent() {
  const {
    collectionNodes,
    selectedNodeId,
    setSelectedNode,
    updateVariablePositions,
  } = useCollectionsStore();

  const { setViewMode, isFullscreen, toggleFullscreen } = usePaletteStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesState] = useEdgesState([]);
  const [nodeDialogOpen, setNodeDialogOpen] = React.useState(false);
  const [visibleModes, setVisibleModes] = React.useState<string[]>([]);
  const [autoLayoutEnabled, setAutoLayoutEnabled] = React.useState(true);
  const [selectedCollectionFilter, setSelectedCollectionFilter] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Get all unique modes across collections
  const allModes = React.useMemo(() => {
    const modesMap = new Map<string, { id: string; name: string }>();
    collectionNodes.forEach(c => {
      c.modes.forEach(m => modesMap.set(m.id, m));
    });
    return Array.from(modesMap.values());
  }, [collectionNodes]);

  // Initialize visible modes
  React.useEffect(() => {
    if (visibleModes.length === 0 && allModes.length > 0) {
      setVisibleModes(allModes.map(m => m.id));
    }
  }, [allModes, visibleModes.length]);

  // Apply auto-layout
  const applyAutoLayout = React.useCallback(() => {
    const layoutResult = autoLayoutVariables(collectionNodes);
    
    // Update positions in store
    const positionUpdates = layoutResult.variables.map((v) => ({
      collectionId: v.collectionId,
      variableId: v.id,
      position: v.position!,
    }));
    updateVariablePositions(positionUpdates);
  }, [collectionNodes, updateVariablePositions]);

  // Auto-layout on first load or when collections change (if enabled)
  React.useEffect(() => {
    if (autoLayoutEnabled && collectionNodes.length > 0) {
      // Check if any variables don't have positions
      const needsLayout = collectionNodes.some(c =>
        c.variables.some(v => !v.position)
      );
      
      if (needsLayout) {
        applyAutoLayout();
      }
    }
  }, [collectionNodes, autoLayoutEnabled, applyAutoLayout]);

  // Sync React Flow nodes with variables from store
  React.useEffect(() => {
    const flowNodes: Node[] = [];
    
    collectionNodes.forEach((collection) => {
      collection.variables.forEach((variable) => {
        const nodeId = `${collection.id}:${variable.id}`;
        
        flowNodes.push({
          id: nodeId,
          type: 'variable',
          position: variable.position || { x: 0, y: 0 },
          data: {
            variable,
            collectionId: collection.id,
            collectionName: collection.name,
            collectionIcon: collection.icon,
            modes: collection.modes,
            visibleModes: visibleModes.length > 0 ? visibleModes : collection.modes.map(m => m.id),
          },
          selected: nodeId === selectedNodeId,
        });
      });
    });
    
    setNodes(flowNodes);
  }, [collectionNodes, selectedNodeId, visibleModes]);

  // Generate variable-to-variable edges
  const generateVariableEdges = React.useCallback((): Edge[] => {
    const edges: Edge[] = [];
    
    collectionNodes.forEach((collection) => {
      collection.variables.forEach((variable) => {
        const sourceId = `${collection.id}:${variable.id}`;
        
        Object.values(variable.valuesByMode).forEach((value) => {
          if (value.type === 'alias' && value.variableId) {
            const targetCollectionId = value.collectionId || collection.id;
            const targetId = `${targetCollectionId}:${value.variableId}`;
            
            const isCrossCollection = !!(value.collectionId && value.collectionId !== collection.id);
            
            edges.push({
              id: `${sourceId}-${targetId}`,
              source: targetId, // Note: reversed because alias points FROM source TO target
              target: sourceId,
              type: 'default',
              animated: isCrossCollection,
              style: {
                stroke: isCrossCollection ? '#8b5cf6' : '#6b7280',
                strokeWidth: isCrossCollection ? 2 : 1,
              },
            });
          }
        });
      });
    });
    
    return edges;
  }, [collectionNodes]);

  // Sync edges
  React.useEffect(() => {
    const variableEdges = generateVariableEdges();
    setEdges(variableEdges);
  }, [collectionNodes, generateVariableEdges]);

  // Handle node position changes (manual drag)
  const handleNodeDragStop = React.useCallback(
    (_event: any, node: Node) => {
      const [collectionId, variableId] = node.id.split(':');
      updateVariablePositions([{
        collectionId,
        variableId,
        position: node.position,
      }]);
    },
    [updateVariablePositions]
  );

  // Handle edge creation (drag to create alias)
  const handleConnect = React.useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      
      // Parse node IDs
      const [sourceCollectionId, sourceVariableId] = connection.source.split(':');
      const [targetCollectionId, targetVariableId] = connection.target.split(':');
      
      // Confirm the action
      const sourceCollection = collectionNodes.find(c => c.id === sourceCollectionId);
      const targetCollection = collectionNodes.find(c => c.id === targetCollectionId);
      const sourceVar = sourceCollection?.variables.find(v => v.id === sourceVariableId);
      const targetVar = targetCollection?.variables.find(v => v.id === targetVariableId);
      
      if (!sourceVar || !targetVar || !sourceCollection || !targetCollection) return;
      
      const confirmed = confirm(
        `Create alias:\n\n"${targetVar.name}"\nwill reference\n"${sourceVar.name}"\n\nThis will update all modes.`
      );
      
      if (!confirmed) return;
      
      // Create alias for all modes in the target variable
      targetCollection.modes.forEach((mode) => {
        const value = sourceCollectionId === targetCollectionId
          ? { type: 'alias' as const, variableId: sourceVariableId }
          : { type: 'alias' as const, variableId: sourceVariableId, collectionId: sourceCollectionId };
        
        // Use the store's setVariableValue function
        const { setVariableValue } = useCollectionsStore.getState();
        setVariableValue(targetCollectionId, targetVariableId, mode.id, value);
      });
    },
    [collectionNodes]
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
    if (collectionNodes.length === 1) {
      downloadFigmaExport(collectionNodes[0]);
    } else if (collectionNodes.length > 1) {
      downloadFigmaExport(collectionNodes);
    } else {
      alert('Please create a collection first');
    }
  }, [collectionNodes]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N: New collection
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setNodeDialogOpen(true);
      }
      // Ctrl/Cmd + L: Re-layout
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        applyAutoLayout();
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
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          toggleFullscreen();
        }
      }
      // Escape: Close collections view (if nothing selected) or deselect
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          if (!selectedNodeId) {
            e.preventDefault();
            setViewMode('palette');
          }
        }
      }
      // Escape: Deselect (if something is selected)
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
    setViewMode,
    setSelectedNode,
    applyAutoLayout,
  ]);

  // Calculate total variables count
  const totalVariables = React.useMemo(() => {
    return collectionNodes.reduce((sum, c) => sum + c.variables.length, 0);
  }, [collectionNodes]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Collection Sidebar */}
      {sidebarOpen && (
        <CollectionSidebar
          collections={collectionNodes}
          selectedCollectionId={selectedCollectionFilter}
          onSelectCollection={setSelectedCollectionFilter}
          onCreateCollection={() => setNodeDialogOpen(true)}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 flex-shrink-0">
          {/* Left: Title & Toolbar */}
          <div className="flex items-center gap-4">
            <h2 className="font-semibold">Collections</h2>
            
            <div className="flex items-center gap-1.5">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <LayoutGrid className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Toggle collections sidebar</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setNodeDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5 opacity-50" />
                  Collection
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Create collection (Ctrl+N)</p>
              </TooltipContent>
            </Tooltip>

            <ModeSelector
              modes={allModes}
              visibleModes={visibleModes}
              onVisibleModesChange={setVisibleModes}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={applyAutoLayout}
                  disabled={totalVariables === 0}
                >
                  <RefreshCw className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Re-layout (Ctrl+L)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
            </div>
          </div>

          {/* Right: Stats & Actions */}
          <div className="flex items-center gap-1.5">
            <div className="text-xs text-muted-foreground mr-1.5">
              <span className="font-medium">{collectionNodes.length}</span> collections •{' '}
              <span className="font-medium">{totalVariables}</span> variables
            </div>
            
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleExport}
                    disabled={collectionNodes.length === 0}
                  >
                    <Download className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Export JSON (Ctrl+E)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-3.5 w-3.5 opacity-50" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5 opacity-50" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setViewMode('palette')}
                  >
                    <X className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Close (Esc)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesState}
          onConnect={handleConnect}
          onNodeDragStop={handleNodeDragStop}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
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
            nodeColor={(node) => '#3B82F6'}
            className="bg-background/80 backdrop-blur-sm border"
          />
        </ReactFlow>

        {/* Empty state */}
        {collectionNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center space-y-2 max-w-md px-4">
              <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-base font-semibold">Variable Visualizer</h3>
              <p className="text-[12px] text-muted-foreground">
                Create a collection to start building your color system.
                Variables will be displayed as nodes and auto-arranged by dependencies.
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
        
        {/* No variables state */}
        {collectionNodes.length > 0 && totalVariables === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center space-y-2 max-w-md px-4">
              <p className="text-[12px] text-muted-foreground">
                Add variables to your collections to see them visualized here.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Dialogs */}
      <CollectionNodeDialog
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
      />
    </div>
  );
}

export function CollectionsViewVisualizer() {
  return (
    <ReactFlowProvider>
      <CollectionsViewVisualizerContent />
    </ReactFlowProvider>
  );
}

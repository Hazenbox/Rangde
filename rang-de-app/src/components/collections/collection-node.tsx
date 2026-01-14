"use client";

import * as React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { MoreVertical, Trash2, ArrowRight, Star } from "lucide-react";
import { CollectionNode as CollectionNodeType } from "@/types/collections";
import { useCollectionsStore } from "@/store/collections-store";
import { usePaletteStore } from "@/store/palette-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuickVariableDialog } from "@/components/collections/quick-variable-dialog";
import { getLayerLabel, getLayerColor, getLayerDescription } from "@/lib/collection-validator";
import { cn } from "@/lib/utils";

interface CollectionNodeData extends CollectionNodeType {
  // Additional data passed from React Flow
  validationState?: 'valid' | 'warning' | 'error';
  validationErrors?: string[];
  validationWarnings?: string[];
}

export function CollectionNode({ data, id, selected }: NodeProps<CollectionNodeData>) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [quickDialogOpen, setQuickDialogOpen] = React.useState(false);
  const [droppedColorData, setDroppedColorData] = React.useState<{
    hex: string;
    label: string;
    paletteId: string;
    paletteName: string;
    step: number;
    scaleType?: string;
  } | null>(null);
  const [editingVariableId, setEditingVariableId] = React.useState<string | null>(null);
  const [editingVariableName, setEditingVariableName] = React.useState("");
  const [editingCollectionName, setEditingCollectionName] = React.useState(false);
  const [tempCollectionName, setTempCollectionName] = React.useState(data.name);

  const { 
    deleteCollection,
    setSelectedNode,
    addVariable,
    addDroppedColor,
    addMode,
    deleteVariable,
    setParentCollection,
    updateVariable,
    updateCollection,
  } = useCollectionsStore();

  const { palettes } = usePaletteStore();

  const handleDelete = () => {
    if (confirm(`Delete collection "${data.name}"? This will remove all modes and variables.`)) {
      deleteCollection(id);
    }
    setMenuOpen(false);
  };

  const handleSelect = () => {
    setSelectedNode(id);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'color' && data.hex) {
        const palette = palettes.find(p => p.id === data.paletteId);
        const label = data.scaleType 
          ? `${palette?.name || 'palette'}/${data.step}/${data.scaleType}`
          : `${palette?.name || 'palette'}/${data.step}`;

        setDroppedColorData({
          hex: data.hex,
          label,
          paletteId: data.paletteId,
          paletteName: palette?.name || 'palette',
          step: data.step,
          scaleType: data.scaleType,
        });
        setQuickDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error);
    }
  };

  const handleVariableConfirm = (variableName: string) => {
    if (!droppedColorData) return;

    // Ensure collection has at least one mode
    if (data.modes.length === 0) {
      addMode(id, 'Default');
    }

    // Add the variable with the hex color
    addVariable(id, variableName, '', droppedColorData.hex);

    // Track dropped color for display
    addDroppedColor(id, {
      hex: droppedColorData.hex,
      paletteId: droppedColorData.paletteId,
      paletteName: droppedColorData.paletteName,
      step: droppedColorData.step,
      scaleType: droppedColorData.scaleType,
      timestamp: Date.now(),
    });

    setDroppedColorData(null);
  };

  const handleDeleteVariable = (variableId: string, variableName: string) => {
    if (confirm(`Delete variable "${variableName}"?`)) {
      deleteVariable(id, variableId);
    }
  };

  const handleToggleParent = () => {
    if (data.isParent) {
      setParentCollection(null);
    } else {
      setParentCollection(id);
    }
    setMenuOpen(false);
  };

  const handleStartEdit = (variableId: string, currentName: string) => {
    setEditingVariableId(variableId);
    setEditingVariableName(currentName);
  };

  const handleSaveEdit = (variableId: string) => {
    if (editingVariableName.trim() && editingVariableName !== data.variables.find(v => v.id === variableId)?.name) {
      updateVariable(id, variableId, { name: editingVariableName.trim() });
    }
    setEditingVariableId(null);
    setEditingVariableName("");
  };

  const handleCancelEdit = () => {
    setEditingVariableId(null);
    setEditingVariableName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, variableId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(variableId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleStartCollectionNameEdit = () => {
    setEditingCollectionName(true);
    setTempCollectionName(data.name);
  };

  const handleSaveCollectionName = () => {
    if (tempCollectionName.trim() && tempCollectionName !== data.name) {
      updateCollection(id, { name: tempCollectionName.trim() });
    }
    setEditingCollectionName(false);
  };

  const handleCancelCollectionNameEdit = () => {
    setTempCollectionName(data.name);
    setEditingCollectionName(false);
  };

  const handleCollectionNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCollectionName();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelCollectionNameEdit();
    }
  };

  return (
    <>
      <div
        className={cn(
          "rounded-lg border-2 bg-background shadow-lg transition-all min-w-[280px] cursor-pointer",
          selected ? "border-primary shadow-xl ring-2 ring-primary/20" : "border-border hover:border-primary/50",
          dragOver && "border-primary bg-primary/5 ring-4 ring-primary/40 shadow-2xl scale-[1.02]"
        )}
        onClick={handleSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        id={`${id}-collection-target`}
        className="w-3 h-3 !bg-primary"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id={`${id}-collection-source`}
        className="w-3 h-3 !bg-primary"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-primary/10 rounded-t-lg relative">
        {/* Validation indicator */}
        {data.validationState && (
          <div 
            className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{
              backgroundColor: data.validationState === 'error' ? '#ef4444' 
                : data.validationState === 'warning' ? '#f59e0b' 
                : '#10b981'
            }}
            title={
              data.validationState === 'error' 
                ? `${data.validationErrors?.length || 0} error(s)`
                : data.validationState === 'warning'
                ? `${data.validationWarnings?.length || 0} warning(s)`
                : 'All valid'
            }
          />
        )}
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {data.icon && (
            <span className="text-lg flex-shrink-0">{data.icon}</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {editingCollectionName ? (
                <input
                  type="text"
                  value={tempCollectionName}
                  onChange={(e) => setTempCollectionName(e.target.value)}
                  onBlur={handleSaveCollectionName}
                  onKeyDown={handleCollectionNameKeyDown}
                  className="text-sm font-bold bg-background border border-primary rounded px-2 py-0.5 min-w-0 flex-1"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div 
                  className="text-sm font-bold truncate cursor-text hover:text-primary"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartCollectionNameEdit();
                  }}
                >
                  {data.name}
                </div>
              )}
              {data.isParent && (
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" title="Parent Collection" />
              )}
              {data.layer && (
                <span
                  className="px-1.5 py-0.5 text-[9px] font-semibold rounded border"
                  style={{
                    borderColor: getLayerColor(data.layer),
                    color: getLayerColor(data.layer),
                    backgroundColor: `${getLayerColor(data.layer)}15`,
                  }}
                  title={getLayerDescription(data.layer)}
                >
                  {getLayerLabel(data.layer).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Menu */}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(true);
              }}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="end">
            <div className="flex flex-col">
              <button
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-accent text-left cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleParent();
                }}
              >
                <Star className={cn("h-3 w-3", data.isParent && "fill-yellow-500 text-yellow-500")} />
                {data.isParent ? 'Unset Parent' : 'Set as Parent'}
              </button>
              <button
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-destructive/10 text-destructive text-left cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Content - Variables List */}
      <div className="py-2">
        {data.variables.length === 0 ? (
          // Empty state
          <div className="text-center py-4 px-4">
            <div className="text-xs text-muted-foreground">No variables</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Drag colors here or click to edit
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-0.5 px-2">
              {data.variables.map((variable) => {
                // Get first mode value for display
                const firstMode = data.modes[0];
                const firstValue = firstMode ? variable.valuesByMode[firstMode.id] : null;
                const isAliased = firstValue?.type === 'alias';
                const displayColor = firstValue?.type === 'color' && firstValue.hex 
                  ? firstValue.hex 
                  : '#6b7280';

                return (
                  <div
                    key={variable.id}
                    className="group relative flex items-center gap-2 py-2 px-2 rounded hover:bg-accent/50 transition-colors"
                  >
                    {/* Connection handles for this variable */}
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={`${id}-var-${variable.id}-target`}
                      className="!w-2 !h-2 !bg-primary !left-0"
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={`${id}-var-${variable.id}-source`}
                      className="!w-2 !h-2 !bg-primary !right-0"
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                    />

                    {/* Color swatch or alias indicator */}
                    {isAliased ? (
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <div
                        className="w-3 h-3 rounded border border-border/50 flex-shrink-0"
                        style={{ backgroundColor: displayColor }}
                      />
                    )}
                    
                    {/* Variable name */}
                      <div className="flex-1 min-w-0">
                      {editingVariableId === variable.id ? (
                        <input
                          type="text"
                          value={editingVariableName}
                          onChange={(e) => setEditingVariableName(e.target.value)}
                          onBlur={() => handleSaveEdit(variable.id)}
                          onKeyDown={(e) => handleKeyDown(e, variable.id)}
                          className="text-[10px] font-medium w-full bg-background border border-primary rounded px-1 py-0.5"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div 
                          className="text-[10px] font-medium truncate cursor-text hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(variable.id, variable.name);
                          }}
                        >
                          {variable.name}
                        </div>
                      )}
                    </div>

                    {/* Mode count badge */}
                    {data.modes.length > 1 && (
                      <div className="px-1 py-0.5 text-[8px] bg-muted rounded font-medium flex-shrink-0">
                        {data.modes.length}
                    </div>
                  )}

                    {/* Delete button */}
                    <button
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded p-0.5 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVariable(variable.id, variable.name);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                </div>
                );
              })}
              </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      <div className={cn(
        "px-4 py-2 border-t rounded-b-lg transition-colors",
        dragOver ? "bg-primary/20" : "bg-muted/30"
      )}>
        <div className={cn(
          "text-[10px] text-center transition-colors",
          dragOver ? "text-primary font-medium" : "text-muted-foreground"
        )}>
          {dragOver ? "✨ Drop to create aliased variable" : `${data.modes.length} modes · ${data.variables.length} variables`}
        </div>
      </div>
    </div>

    {/* Quick Variable Dialog */}
    <QuickVariableDialog
      open={quickDialogOpen}
      onOpenChange={setQuickDialogOpen}
      colorHex={droppedColorData?.hex || '#000000'}
      colorLabel={droppedColorData?.label}
      onConfirm={handleVariableConfirm}
    />
  </>
  );
}

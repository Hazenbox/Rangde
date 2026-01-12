"use client";

import * as React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { MoreVertical, Trash2 } from "lucide-react";
import { CollectionNode as CollectionNodeType } from "@/types/collections";
import { useCollectionsStore } from "@/store/collections-store";
import { usePaletteStore } from "@/store/palette-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { QuickVariableDialog } from "@/components/collections/quick-variable-dialog";
import { cn } from "@/lib/utils";

interface CollectionNodeData extends CollectionNodeType {
  // Additional data passed from React Flow
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

  const { 
    deleteCollection,
    setSelectedNode,
    addVariable,
    addDroppedColor,
    addMode,
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

    // Add the variable
    addVariable(id, variableName);

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

  return (
    <>
      <div
        className={cn(
          "rounded-lg border-2 bg-background shadow-lg transition-all min-w-[280px] cursor-pointer",
          selected ? "border-primary shadow-xl ring-2 ring-primary/20" : "border-border hover:border-primary/50",
          dragOver && "border-primary bg-primary/5 ring-2 ring-primary/30"
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
        className="w-3 h-3 !bg-primary"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-primary/10 rounded-t-lg">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {data.icon && (
            <span className="text-lg flex-shrink-0">{data.icon}</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{data.name}</div>
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

      {/* Content */}
      <div className="px-4 py-3 space-y-2">
        {data.modes.length === 0 && data.variables.length === 0 && !data.metadata?.droppedColors?.length ? (
          // Empty state
          <div className="text-center py-4">
            <div className="text-xs text-muted-foreground">Empty collection</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Drag colors here or click to edit
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{data.modes.length} modes</span>
              <span>{data.variables.length} variables</span>
            </div>

            {/* Dropped Colors List */}
            {data.metadata?.droppedColors && data.metadata.droppedColors.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Recent Colors</div>
                <div className="space-y-1">
                  {data.metadata.droppedColors.slice(0, 6).map((color, idx) => (
                    <div
                      key={`${color.hex}-${idx}`}
                      className="flex items-center gap-2 py-0.5"
                    >
                      <div
                        className="w-4 h-4 rounded border flex-shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono truncate">
                          {color.scaleType
                            ? `${color.paletteName}/${color.step}/${color.scaleType}`
                            : `${color.paletteName}/${color.step}`}
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.metadata.droppedColors.length > 6 && (
                    <div className="text-[9px] text-muted-foreground text-center">
                      +{data.metadata.droppedColors.length - 6} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t bg-muted/30 rounded-b-lg">
        <div className="text-[10px] text-muted-foreground text-center">
          {dragOver ? "Drop to add variable" : "Click to view details"}
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

"use client";

import * as React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { MoreVertical, Trash2, Edit2 } from "lucide-react";
import { Variable, VariableValue } from "@/types/collections";
import { useCollectionsStore } from "@/store/collections-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface VariableNodeData {
  variable: Variable;
  collectionId: string;
  collectionName: string;
  collectionIcon?: string;
  modes: Array<{ id: string; name: string }>;
  visibleModes?: string[]; // Which modes to show (filtered)
}

export function VariableNodeVisualizer({ data, id, selected }: NodeProps<VariableNodeData>) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [tempName, setTempName] = React.useState(data.variable.name);
  const [dragOver, setDragOver] = React.useState(false);

  const {
    deleteVariable,
    updateVariable,
    setVariableValue,
    collectionNodes,
  } = useCollectionsStore();

  const handleDelete = () => {
    if (confirm(`Delete variable "${data.variable.name}"?`)) {
      deleteVariable(data.collectionId, data.variable.id);
    }
    setMenuOpen(false);
  };

  const handleNameSave = () => {
    if (tempName.trim() && tempName !== data.variable.name) {
      updateVariable(data.collectionId, data.variable.id, { name: tempName.trim() });
    }
    setEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setTempName(data.variable.name);
      setEditingName(false);
    }
  };

  // Handle drag and drop for colors
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
      const dropData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (dropData.type === 'color' && dropData.hex) {
        // Update all modes with the dropped color
        data.modes.forEach((mode) => {
          setVariableValue(data.collectionId, data.variable.id, mode.id, {
            type: 'color',
            hex: dropData.hex,
          });
        });
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error);
    }
  };

  // Determine if this variable is a primitive (has color values) or alias
  const isPrimitive = React.useMemo(() => {
    return Object.values(data.variable.valuesByMode).some(
      (value) => value.type === 'color' && value.hex
    );
  }, [data.variable.valuesByMode]);

  // Get modes to display (filtered or all)
  const displayModes = React.useMemo(() => {
    if (data.visibleModes && data.visibleModes.length > 0) {
      return data.modes.filter((mode) => data.visibleModes!.includes(mode.id));
    }
    return data.modes;
  }, [data.modes, data.visibleModes]);

  // Resolve alias display names
  const getAliasDisplay = (value: VariableValue): string => {
    if (value.type !== 'alias' || !value.variableId) return '';
    
    const targetCollectionId = value.collectionId || data.collectionId;
    const targetCollection = collectionNodes.find(c => c.id === targetCollectionId);
    const targetVariable = targetCollection?.variables.find(v => v.id === value.variableId);
    
    if (!targetVariable) return 'Unknown';
    
    if (value.collectionId && value.collectionId !== data.collectionId) {
      return `${targetCollection?.name}/${targetVariable.name}`;
    }
    
    return targetVariable.name;
  };

  return (
    <>
      <div
        className={cn(
          "rounded-lg border-2 bg-background shadow-md transition-all min-w-[200px] max-w-[280px]",
          selected ? "border-primary shadow-xl ring-2 ring-primary/20" : "border-border hover:border-primary/50",
          dragOver && "border-primary bg-primary/5 ring-2 ring-primary/30",
          isPrimitive ? "bg-gradient-to-br from-background to-primary/5" : "bg-background"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Connection handles */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-primary"
          id={`${id}-input`}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-primary"
          id={`${id}-output`}
        />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 border-b">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {data.collectionIcon && (
              <span className="text-xs flex-shrink-0">{data.collectionIcon}</span>
            )}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={handleNameKeyDown}
                  className="h-5 text-[10px] px-1 py-0"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className="text-[10px] font-medium truncate cursor-pointer hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingName(true);
                  }}
                  title={data.variable.name}
                >
                  {data.variable.name}
                </div>
              )}
              <div className="text-[8px] text-muted-foreground truncate">
                {data.collectionName}
              </div>
            </div>
          </div>

          {/* Menu */}
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(true);
                }}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="end">
              <div className="flex flex-col">
                <button
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingName(true);
                    setMenuOpen(false);
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                  Rename
                </button>
                <button
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-destructive/10 text-destructive text-left"
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

        {/* Color swatches or alias info */}
        <div className="px-3 py-2 space-y-1.5">
          {displayModes.length > 0 ? (
            displayModes.map((mode) => {
              const value = data.variable.valuesByMode[mode.id];
              
              return (
                <div key={mode.id} className="flex items-center gap-2">
                  <div className="text-[9px] text-muted-foreground w-12 truncate" title={mode.name}>
                    {mode.name}
                  </div>
                  {value?.type === 'color' && value.hex ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <div
                        className="w-4 h-4 rounded border border-border flex-shrink-0"
                        style={{ backgroundColor: value.hex }}
                      />
                      <span className="text-[9px] font-mono">{value.hex}</span>
                    </div>
                  ) : value?.type === 'alias' ? (
                    <div className="text-[9px] text-primary/80 truncate flex-1" title={getAliasDisplay(value)}>
                      → {getAliasDisplay(value)}
                    </div>
                  ) : (
                    <span className="text-[8px] text-muted-foreground">No value</span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-[9px] text-muted-foreground text-center py-2">
              No modes
            </div>
          )}
        </div>

        {/* Footer indicator */}
        <div className="px-3 py-1.5 border-t bg-muted/20 text-center">
          <div className="text-[8px] text-muted-foreground">
            {isPrimitive ? 'Primitive' : 'Alias'} • {displayModes.length} mode{displayModes.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </>
  );
}

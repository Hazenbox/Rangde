"use client";

import * as React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { ArrowRight, MoreVertical, Trash2 } from "lucide-react";
import { Variable, CollectionLayer } from "@/types/collections";
import { useCollectionsStore } from "@/store/collections-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VariableNodeData {
  variable: Variable;
  collectionId: string;
  collectionName: string;
  collectionLayer?: CollectionLayer;
  modes: Array<{ id: string; name: string }>;
}

export function VariableNode({ data, selected }: NodeProps<VariableNodeData>) {
  const { variable, collectionLayer, modes, collectionId } = data;
  const [menuOpen, setMenuOpen] = React.useState(false);

  const { deleteVariable } = useCollectionsStore();

  // Get first mode value for display
  const firstMode = modes[0];
  const firstValue = firstMode ? variable.valuesByMode[firstMode.id] : null;

  // Check if this variable has an alias
  const isAliased = firstValue?.type === 'alias';
  
  // Get resolved color for display
  const displayColor = firstValue?.type === 'color' && firstValue.hex 
    ? firstValue.hex 
    : '#6b7280';

  // Determine which handles to show based on layer
  const showLeftHandle = collectionLayer !== CollectionLayer.PRIMITIVE;
  const showRightHandle = collectionLayer !== CollectionLayer.THEME;

  const handleDelete = () => {
    if (confirm(`Delete variable "${variable.name}"?`)) {
      deleteVariable(collectionId, variable.id);
    }
    setMenuOpen(false);
  };

  return (
    <>
      {/* Connection handles */}
      {showLeftHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-2 h-2 !bg-primary"
        />
      )}
      {showRightHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-2 h-2 !bg-primary"
        />
      )}

      <div
        className={cn(
          "rounded-md border bg-background shadow-sm transition-all min-w-[180px] max-w-[220px]",
          selected ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border hover:border-primary/50"
        )}
      >
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            {/* Color swatch or alias indicator */}
            {isAliased ? (
              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            ) : (
              <div
                className="w-4 h-4 rounded border border-border/50 flex-shrink-0"
                style={{ backgroundColor: displayColor }}
              />
            )}
            
            {/* Variable name */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{variable.name}</div>
              
              {/* Value display */}
              <div className="text-[10px] text-muted-foreground truncate">
                {isAliased && firstValue.type === 'alias' ? (
                  <span>→ {firstValue.variableId?.split(':').pop() || 'alias'}</span>
                ) : firstValue?.type === 'color' && firstValue.hex ? (
                  <span className="font-mono">{firstValue.hex.toUpperCase()}</span>
                ) : (
                  <span>No value</span>
                )}
              </div>
            </div>

            {/* Mode count badge */}
            {modes.length > 1 && (
              <div className="px-1 py-0.5 text-[9px] bg-muted rounded font-medium flex-shrink-0">
                {modes.length}
              </div>
            )}

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
        </div>
      </div>
    </>
  );
}

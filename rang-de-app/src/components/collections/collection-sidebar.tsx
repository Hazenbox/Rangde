"use client";

import * as React from "react";
import { Plus, MoreVertical, Edit2, Trash2, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CollectionNode } from "@/types/collections";
import { useCollectionsStore } from "@/store/collections-store";
import { cn } from "@/lib/utils";

interface CollectionSidebarProps {
  collections: CollectionNode[];
  selectedCollectionId: string | null;
  onSelectCollection: (collectionId: string | null) => void;
  onCreateCollection: () => void;
  onClose?: () => void;
  className?: string;
}

export function CollectionSidebar({
  collections,
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
  onClose,
  className,
}: CollectionSidebarProps) {
  const { deleteCollection } = useCollectionsStore();
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

  const handleDelete = (collectionId: string, collectionName: string) => {
    if (confirm(`Delete collection "${collectionName}"? This will remove all variables in it.`)) {
      deleteCollection(collectionId);
      if (selectedCollectionId === collectionId) {
        onSelectCollection(null);
      }
    }
    setMenuOpenId(null);
  };

  return (
    <div className={cn("w-64 bg-background flex flex-col", className)}>
      {/* Header */}
      <div className="border-b px-3 py-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Collections</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCreateCollection}
            title="Add Collection"
          >
            <Plus className="h-3 w-3" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Collections List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* All Collections Option */}
          <button
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
              selectedCollectionId === null
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
            onClick={() => onSelectCollection(null)}
          >
            <Eye className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">All Collections</div>
              <div className="text-[10px] opacity-80">
                {collections.length} total
              </div>
            </div>
          </button>

          {/* Individual Collections */}
          {collections.map((collection) => {
            const isSelected = selectedCollectionId === collection.id;
            const variableCount = collection.variables.length;
            const modeCount = collection.modes.length;

            return (
              <div
                key={collection.id}
                className={cn(
                  "group relative rounded-lg transition-colors",
                  isSelected ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-accent"
                )}
              >
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left"
                  onClick={() => onSelectCollection(isSelected ? null : collection.id)}
                >
                  {collection.icon && (
                    <span className="text-base flex-shrink-0">{collection.icon}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" title={collection.name}>
                      {collection.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {variableCount} var{variableCount !== 1 ? 's' : ''} · {modeCount} mode{modeCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {isSelected ? (
                    <Eye className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  )}
                </button>

                {/* Menu */}
                <div className="absolute top-2 right-2">
                  <Popover open={menuOpenId === collection.id} onOpenChange={(open) => setMenuOpenId(open ? collection.id : null)}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(collection.id);
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
                            handleDelete(collection.id, collection.name);
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
            );
          })}

          {/* Empty State */}
          {collections.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="text-xs text-muted-foreground">
                No collections yet
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-7 text-[11px]"
                onClick={onCreateCollection}
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Create First Collection
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Info */}
      <div className="border-t px-3 py-2">
        <div className="text-[9px] text-muted-foreground">
          Click a collection to highlight its variables
        </div>
      </div>
    </div>
  );
}

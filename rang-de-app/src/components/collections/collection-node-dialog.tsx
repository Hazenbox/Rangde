"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpCircle } from "lucide-react";
import { useCollectionsStore } from "@/store/collections-store";
import { CollectionLayer } from "@/types/collections";
import { getLayerLabel, getLayerDescription, getLayerColor } from "@/lib/collection-validator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CollectionNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId?: string; // If provided, edit mode
  initialPosition?: { x: number; y: number };
}

export function CollectionNodeDialog({ open, onOpenChange, collectionId, initialPosition }: CollectionNodeDialogProps) {
  const {
    createCollection,
    updateCollection,
    getCollection,
    collectionNodes,
  } = useCollectionsStore();

  const existingCollection = collectionId ? getCollection(collectionId) : null;

  const [name, setName] = React.useState(existingCollection?.name || "");
  const [icon, setIcon] = React.useState(existingCollection?.icon || "");
  const [layer, setLayer] = React.useState<CollectionLayer | undefined>(existingCollection?.layer);

  React.useEffect(() => {
    if (open) {
      if (existingCollection) {
        setName(existingCollection.name);
        setIcon(existingCollection.icon || "");
        setLayer(existingCollection.layer);
      } else {
        setName("");
        setIcon("");
        setLayer(undefined);
      }
    }
  }, [open, existingCollection]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    if (collectionId) {
      // Update existing collection
      updateCollection(collectionId, {
        name: name.trim(),
        icon: icon || undefined,
        layer,
      });
    } else {
      // Create new collection
      let position = initialPosition;
      
      if (!position) {
        const nodeCount = collectionNodes.length;
        const gridSize = 350;
        const nodesPerRow = 3;
        
        const row = Math.floor(nodeCount / nodesPerRow);
        const col = nodeCount % nodesPerRow;
        
        position = {
          x: 100 + (col * gridSize),
          y: 100 + (row * gridSize),
        };
      }
      
      createCollection(name.trim(), position, layer, icon || undefined);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-base">{collectionId ? 'Edit' : 'Create'} Collection</DialogTitle>
          <DialogDescription className="text-[11px]">
            {collectionId
              ? 'Update the collection details.'
              : 'Create a new variable collection.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-3">
          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="collection-name" className="text-[11px]">Name *</Label>
            <Input
              id="collection-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Colors, Theme Variables"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              className="h-8 text-[12px]"
              autoFocus
            />
          </div>

          {/* Icon (optional) */}
          <div className="grid gap-1.5">
            <Label htmlFor="collection-icon" className="text-[11px]">Icon (optional)</Label>
            <Input
              id="collection-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Enter emoji"
              maxLength={2}
              className="h-8 text-[12px]"
            />
          </div>

          {/* Layer Selector */}
          <div className="grid gap-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-[11px]">Layer (optional)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-2 text-[10px]">
                      <p className="font-semibold">Three-Layer Architecture:</p>
                      <p><span className="text-blue-500">Primitive:</span> Base colors (#FF0000)</p>
                      <p><span className="text-purple-500">Semantic:</span> Intent tokens (danger → red)</p>
                      <p><span className="text-pink-500">Theme:</span> Brand tokens (button → danger)</p>
                      <p className="pt-1 border-t">Aliases flow: Primitive → Semantic → Theme</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: CollectionLayer.PRIMITIVE, label: 'Primitive' },
                { value: CollectionLayer.SEMANTIC, label: 'Semantic' },
                { value: CollectionLayer.THEME, label: 'Theme' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLayer(layer === option.value ? undefined : option.value)}
                  className={`h-8 px-2 text-[11px] rounded-md border transition-colors ${
                    layer === option.value
                      ? 'border-2 font-medium'
                      : 'border hover:bg-accent'
                  }`}
                  style={{
                    borderColor: layer === option.value ? getLayerColor(option.value) : undefined,
                    color: layer === option.value ? getLayerColor(option.value) : undefined,
                  }}
                  title={getLayerDescription(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {layer ? getLayerDescription(layer) : 'No layer - flexible aliasing'}
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground">
            💡 Double-click the collection to open editor
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="h-7 text-[11px]" onClick={handleSubmit} disabled={!name.trim()}>
            {collectionId ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

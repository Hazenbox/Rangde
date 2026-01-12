"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollectionsStore } from "@/store/collections-store";

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

  React.useEffect(() => {
    if (open) {
      if (existingCollection) {
        setName(existingCollection.name);
        setIcon(existingCollection.icon || "");
      } else {
        setName("");
        setIcon("");
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
      
      createCollection(name.trim(), position, icon || undefined);
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

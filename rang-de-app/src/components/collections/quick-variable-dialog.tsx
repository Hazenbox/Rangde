"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuickVariableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colorHex: string;
  colorLabel?: string; // e.g., "indigo/500" or "500"
  onConfirm: (variableName: string) => void;
}

export function QuickVariableDialog({
  open,
  onOpenChange,
  colorHex,
  colorLabel,
  onConfirm,
}: QuickVariableDialogProps) {
  const [variableName, setVariableName] = React.useState("");

  React.useEffect(() => {
    if (open) {
      // Pre-fill with color label if available
      setVariableName(colorLabel || "");
    }
  }, [open, colorLabel]);

  const handleConfirm = () => {
    if (variableName.trim()) {
      onConfirm(variableName.trim());
      setVariableName("");
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-base">Add Variable</DialogTitle>
          <DialogDescription className="text-[11px]">
            Name this variable for your collection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {/* Color preview */}
          <div className="flex items-center gap-2 p-2 bg-muted rounded">
            <div
              className="w-8 h-8 rounded border-2 border-border"
              style={{ backgroundColor: colorHex }}
            />
            <div className="flex-1">
              <div className="text-[10px] text-muted-foreground">Color</div>
              <div className="text-[11px] font-mono">{colorHex}</div>
              {colorLabel && (
                <div className="text-[10px] text-muted-foreground">{colorLabel}</div>
              )}
            </div>
          </div>

          {/* Variable name input */}
          <div className="space-y-1.5">
            <Label htmlFor="variable-name" className="text-[11px]">
              Variable Name
            </Label>
            <Input
              id="variable-name"
              value={variableName}
              onChange={(e) => setVariableName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., primary/500, text/default"
              className="h-8 text-[12px]"
              autoFocus
            />
            <p className="text-[9px] text-muted-foreground">
              Tip: Use / for hierarchy (e.g., colors/primary/500)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px]"
            onClick={handleConfirm}
            disabled={!variableName.trim()}
          >
            Add Variable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

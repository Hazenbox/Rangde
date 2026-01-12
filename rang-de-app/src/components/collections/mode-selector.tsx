"use client";

import * as React from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { VariableMode } from "@/types/collections";

interface ModeSelectorProps {
  modes: VariableMode[];
  visibleModes: string[];
  onVisibleModesChange: (modeIds: string[]) => void;
  className?: string;
}

export function ModeSelector({
  modes,
  visibleModes,
  onVisibleModesChange,
  className,
}: ModeSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const toggleMode = (modeId: string) => {
    if (visibleModes.includes(modeId)) {
      // Remove if already visible
      onVisibleModesChange(visibleModes.filter(id => id !== modeId));
    } else {
      // Add if not visible
      onVisibleModesChange([...visibleModes, modeId]);
    }
  };

  const toggleAll = () => {
    if (visibleModes.length === modes.length) {
      // Hide all
      onVisibleModesChange([]);
    } else {
      // Show all
      onVisibleModesChange(modes.map(m => m.id));
    }
  };

  const allVisible = visibleModes.length === modes.length;
  const someVisible = visibleModes.length > 0 && visibleModes.length < modes.length;

  if (modes.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-7 text-[11px] px-2", className)}
        >
          {allVisible ? (
            <Eye className="h-3 w-3 mr-1.5" />
          ) : (
            <EyeOff className="h-3 w-3 mr-1.5" />
          )}
          Modes ({visibleModes.length}/{modes.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b pb-2">
            <Label className="text-[11px] font-medium">Visible Modes</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={toggleAll}
            >
              {allVisible ? 'Hide All' : 'Show All'}
            </Button>
          </div>
          
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {modes.map((mode) => {
              const isVisible = visibleModes.includes(mode.id);
              
              return (
                <div
                  key={mode.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                  onClick={() => toggleMode(mode.id)}
                >
                  <Checkbox
                    id={`mode-${mode.id}`}
                    checked={isVisible}
                    onCheckedChange={() => toggleMode(mode.id)}
                    className="h-3 w-3"
                  />
                  <Label
                    htmlFor={`mode-${mode.id}`}
                    className="text-[11px] flex-1 cursor-pointer"
                  >
                    {mode.name}
                  </Label>
                  {isVisible ? (
                    <Eye className="h-3 w-3 text-primary" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="text-[9px] text-muted-foreground px-2 pt-1 border-t">
            Toggle modes to control what's shown on variable nodes
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

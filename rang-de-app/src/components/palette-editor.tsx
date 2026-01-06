"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePaletteStore } from "@/store/palette-store";
import { STEPS, Step, isValidHex, normalizeHex, getReadableTextColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";

interface ColorInputProps {
  step: Step;
  value: string;
  onChange: (hex: string) => void;
}

function ColorInput({ step, value, onChange }: ColorInputProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const [isValid, setIsValid] = React.useState(true);

  React.useEffect(() => {
    setLocalValue(value);
    setIsValid(isValidHex(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (isValidHex(newValue)) {
      setIsValid(true);
      onChange(normalizeHex(newValue));
    } else {
      setIsValid(newValue.length === 0 || newValue === "#");
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setLocalValue(hex);
    setIsValid(true);
    onChange(hex);
  };

  const textColor = isValid && isValidHex(localValue) ? getReadableTextColor(localValue) : "#000";
  const bgColor = isValid && isValidHex(localValue) ? localValue : "#ffffff";

  return (
    <div className="flex items-center gap-2">
      <Label className="w-12 text-right text-xs font-mono">{step}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "h-8 w-8 rounded-md border transition-all hover:scale-105",
              !isValid && "ring-2 ring-destructive"
            )}
            style={{ backgroundColor: bgColor }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <input
            type="color"
            value={isValidHex(localValue) ? normalizeHex(localValue) : "#ffffff"}
            onChange={handleColorPickerChange}
            className="h-32 w-32 cursor-pointer border-0"
          />
        </PopoverContent>
      </Popover>
      <Input
        value={localValue}
        onChange={handleChange}
        className={cn(
          "h-8 w-24 font-mono text-xs",
          !isValid && "border-destructive focus-visible:ring-destructive"
        )}
        style={{
          backgroundColor: isValid && isValidHex(localValue) ? bgColor : undefined,
          color: isValid && isValidHex(localValue) ? textColor : undefined
        }}
        placeholder="#000000"
      />
    </div>
  );
}

export function PaletteEditor() {
  const { activePaletteId, palettes, updatePaletteStep } = usePaletteStore();
  
  const activePalette = React.useMemo(
    () => palettes.find((p) => p.id === activePaletteId),
    [palettes, activePaletteId]
  );

  if (!activePalette) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>Select or create a palette to start editing</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">{activePalette.name}</h2>
        <p className="text-xs text-muted-foreground">
          Define hex values for each step (200-2500)
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => (
            <ColorInput
              key={step}
              step={step}
              value={activePalette.steps[step]}
              onChange={(hex) => updatePaletteStep(activePalette.id, step, hex)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

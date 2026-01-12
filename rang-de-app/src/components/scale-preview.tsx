"use client";

import * as React from "react";
import { LayoutGrid, List, ArrowUpDown, Download, Circle, Copy, Check, ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorSwatch } from "@/components/color-swatch";
import { ContrastPreview } from "@/components/contrast-preview";
import { usePaletteStore } from "@/store/palette-store";
import { STEPS, Step, StepScales, PaletteSteps, isValidHex, normalizeHex, getReadableTextColor, ScaleResult } from "@/lib/color-utils";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type SortOrder = "asc" | "desc";

// Download utility functions
function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportAsJSON(name: string, steps: PaletteSteps) {
  const data = {
    name,
    steps: Object.fromEntries(
      STEPS.filter(step => steps[step]).map(step => [step, steps[step]])
    )
  };
  downloadFile(JSON.stringify(data, null, 2), `${name.toLowerCase().replace(/\s+/g, '-')}.json`, "application/json");
}

function exportAsCSS(name: string, steps: PaletteSteps) {
  const cssName = name.toLowerCase().replace(/\s+/g, '-');
  const variables = STEPS
    .filter(step => steps[step])
    .map(step => `  --${cssName}-${step}: ${steps[step]};`)
    .join('\n');
  const css = `:root {\n${variables}\n}`;
  downloadFile(css, `${cssName}.css`, "text/css");
}

function exportAsText(name: string, steps: PaletteSteps) {
  const lines = STEPS
    .filter(step => steps[step])
    .map(step => `${step}: ${steps[step]}`)
    .join('\n');
  const text = `${name}\n${'='.repeat(name.length)}\n\n${lines}`;
  downloadFile(text, `${name.toLowerCase().replace(/\s+/g, '-')}.txt`, "text/plain");
}

// SVG generator for Figma copy - generates all scales for each step
function generateScalesSVG(
  name: string, 
  generatedScales: Record<Step, StepScales | null>,
  steps: Step[]
): string {
  const scaleKeys = ['surface', 'high', 'medium', 'low', 'heavy', 'bold', 'boldA11Y', 'minimal'] as const;
  const scaleLabels = ['Surface', 'High', 'Medium', 'Low', 'Heavy', 'Bold', 'Bold A11Y', 'Minimal'];
  
  const swatchWidth = 80;
  const swatchHeight = 48;
  const stepLabelWidth = 50;
  const gap = 4;
  const rowGap = 8;
  const headerHeight = 24;
  const labelHeight = 16;
  
  const filledSteps = steps.filter(step => generatedScales[step]);
  const cols = scaleKeys.length;
  
  const width = stepLabelWidth + cols * swatchWidth + (cols - 1) * gap + 20;
  const height = headerHeight + labelHeight + filledSteps.length * (swatchHeight + rowGap) + 40;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `  <style>\n`;
  svg += `    .title { font-family: system-ui, sans-serif; font-size: 14px; font-weight: 600; fill: #333; }\n`;
  svg += `    .header { font-family: system-ui, sans-serif; font-size: 10px; font-weight: 500; fill: #666; }\n`;
  svg += `    .step-label { font-family: ui-monospace, monospace; font-size: 11px; font-weight: 500; fill: #666; }\n`;
  svg += `    .hex-label { font-family: ui-monospace, monospace; font-size: 8px; }\n`;
  svg += `  </style>\n`;
  
  // Title
  svg += `  <text x="0" y="16" class="title">${name} - Color Scales</text>\n`;
  
  // Column headers
  scaleLabels.forEach((label, i) => {
    const x = stepLabelWidth + i * (swatchWidth + gap) + swatchWidth / 2;
    svg += `  <text x="${x}" y="${headerHeight + 12}" text-anchor="middle" class="header">${label}</text>\n`;
  });
  
  // Rows for each step
  filledSteps.forEach((step, rowIndex) => {
    const scales = generatedScales[step];
    if (!scales) return;
    
    const y = headerHeight + labelHeight + 8 + rowIndex * (swatchHeight + rowGap);
    
    // Step label
    svg += `  <text x="${stepLabelWidth - 8}" y="${y + swatchHeight / 2 + 4}" text-anchor="end" class="step-label">${step}</text>\n`;
    
    // Scale swatches
    scaleKeys.forEach((key, colIndex) => {
      const scale = scales[key];
      if (!scale || !scale.hex) return;
      
      const x = stepLabelWidth + colIndex * (swatchWidth + gap);
      const hex = scale.blendedHex || (scale.hex.startsWith('#') ? scale.hex : '#808080');
      const displayHex = scale.hex.startsWith('#') ? scale.hex.toUpperCase() : scale.hex;
      
      // Determine text color for hex label
      const textColor = isValidHex(hex) ? getReadableTextColor(hex) : '#333';
      
      // Swatch rectangle
      svg += `  <rect x="${x}" y="${y}" width="${swatchWidth}" height="${swatchHeight}" fill="${hex}" rx="4"/>\n`;
      
      // Hex label inside swatch
      svg += `  <text x="${x + swatchWidth / 2}" y="${y + swatchHeight / 2 + 3}" text-anchor="middle" class="hex-label" fill="${textColor}">${displayHex}</text>\n`;
    });
  });
  
  svg += `</svg>`;
  return svg;
}

async function copyScalesAsSVG(
  name: string, 
  generatedScales: Record<Step, StepScales | null>,
  steps: Step[]
): Promise<boolean> {
  const svg = generateScalesSVG(name, generatedScales, steps);
  try {
    await navigator.clipboard.writeText(svg);
    return true;
  } catch {
    return false;
  }
}

// Generate compact contrast SVG for Figma - single column layout with increased width and spacing
function generateContrastSVG(
  name: string,
  generatedScales: Record<Step, StepScales | null>,
  steps: Step[]
): string {
  const scaleKeys = ['high', 'medium', 'low', 'heavy', 'bold', 'boldA11Y', 'minimal'] as const;
  const scaleLabels = ['High', 'Medium', 'Low', 'Heavy', 'Bold', 'Bold A11Y', 'Minimal'];
  
  const headerHeight = 40;
  const stepHeaderHeight = 28; // Height for "Step 200" header
  const rowHeight = 28;        // Height for each scale row (increased for more gap)
  const padding = 20;          // Increased padding
  const groupSpacing = 24;     // Increased spacing between step groups
  
  const colWidths = {
    label: 100,    // Increased width
    swatch: 24,    // Increased swatch spacing
    hex: 90,       // Increased hex column width
    contrast: 80   // Increased contrast column width
  };
  
  const filledSteps = steps.filter(step => generatedScales[step]);
  // Reverse order: 2500 to 200 (descending)
  const reversedSteps = [...filledSteps].reverse();
  
  // Single column layout - calculate width
  const groupWidth = colWidths.label + colWidths.swatch + colWidths.hex + colWidths.contrast;
  const width = padding * 2 + groupWidth;
  
  // Calculate total height
  let currentY = headerHeight + padding;
  
  reversedSteps.forEach(step => {
    const scales = generatedScales[step];
    if (!scales) return;
    
    const validScaleCount = scaleKeys.filter(key => scales[key]?.hex).length;
    // Height = header + (rows * rowHeight) + padding
    const groupHeight = stepHeaderHeight + (validScaleCount * rowHeight) + 16;
    
    currentY += groupHeight + groupSpacing;
  });
  
  const height = currentY - groupSpacing + padding; // Remove last spacing, add bottom padding
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `  <style>\n`;
  svg += `    .title { font-family: system-ui, sans-serif; font-size: 16px; font-weight: 600; fill: #111; }\n`;
  svg += `    .step-header { font-family: system-ui, sans-serif; font-size: 12px; font-weight: 600; fill: #333; }\n`;
  svg += `    .label { font-family: system-ui, sans-serif; font-size: 11px; fill: #666; }\n`;
  svg += `    .hex { font-family: ui-monospace, monospace; font-size: 11px; fill: #333; }\n`;
  svg += `    .contrast { font-family: ui-monospace, monospace; font-size: 11px; font-weight: 500; text-anchor: end; }\n`;
  svg += `  </style>\n`;
  
  // Main Background
  svg += `  <rect width="${width}" height="${height}" fill="#ffffff" rx="8"/>\n`;
  
  // Main Title
  svg += `  <text x="${padding}" y="${28}" class="title">${name} - Contrast Values</text>\n`;
  svg += `  <line x1="${padding}" y1="${36}" x2="${width - padding}" y2="${36}" stroke="#e5e5e5" stroke-width="1"/>\n`;
  
  // Render Step Groups (single column)
  let currentYPos = headerHeight + padding;
  
  reversedSteps.forEach((step) => {
    const scales = generatedScales[step];
    if (!scales) return;
    
    const x = padding;
    const y = currentYPos;
    
    // Step Header
    svg += `  <text x="${x}" y="${y + 18}" class="step-header">Step ${step}</text>\n`;
    svg += `  <line x1="${x}" y1="${y + 26}" x2="${x + groupWidth}" y2="${y + 26}" stroke="#eaeaea" stroke-width="1"/>\n`;
    
    // Scale Rows
    let rowOffset = 0;
    scaleKeys.forEach((key, keyIndex) => {
      const scale = scales[key];
      if (!scale || !scale.hex) return;
      
      const rowY = y + stepHeaderHeight + (rowOffset * rowHeight) + 16; // +16 to center text vertically in row
      
      // Label (with gap)
      svg += `  <text x="${x}" y="${rowY}" class="label">${scaleLabels[keyIndex]}</text>\n`;
      
      // Swatch (with gap)
      const hex = scale.hex.startsWith('#') ? scale.hex : '#808080';
      svg += `  <circle cx="${x + colWidths.label + 8}" cy="${rowY - 4}" r="6" fill="${hex}" stroke="#e5e5e5" stroke-width="0.5"/>\n`;
      
      // Hex (with gap)
      const displayHex = scale.hex.startsWith('#') ? scale.hex.toUpperCase() : scale.hex;
      svg += `  <text x="${x + colWidths.label + colWidths.swatch}" y="${rowY}" class="hex">${displayHex}</text>\n`;
      
      // Contrast (with gap, right-aligned)
      const contrastColor = scale.contrastRatio >= 4.5 ? '#16a34a' : (scale.contrastRatio >= 3 ? '#ca8a04' : '#dc2626');
      svg += `  <text x="${x + groupWidth}" y="${rowY}" class="contrast" fill="${contrastColor}">${scale.contrastRatio.toFixed(2)}:1</text>\n`;
      
      rowOffset++;
    });
    
    // Move to next group position
    const validScaleCount = scaleKeys.filter(key => scales[key]?.hex).length;
    const groupHeight = stepHeaderHeight + (validScaleCount * rowHeight) + 16;
    currentYPos += groupHeight + groupSpacing;
  });
  
  svg += `</svg>`;
  return svg;
}

async function copyContrastAsSVG(
  name: string,
  generatedScales: Record<Step, StepScales | null>,
  steps: Step[]
): Promise<boolean> {
  const svg = generateContrastSVG(name, generatedScales, steps);
  try {
    await navigator.clipboard.writeText(svg);
    return true;
  } catch {
    return false;
  }
}

const SCALE_LABELS = [
  { 
    key: "surface" as const, 
    label: "Surface",
    description: "The base color for this step. All other scales are calculated relative to this surface."
  },
  { 
    key: "high" as const, 
    label: "High",
    description: "Maximum contrast: Uses step 2500 (if surface is light) or step 200 (if surface is dark) as the contrasting color."
  },
  { 
    key: "medium" as const, 
    label: "Medium",
    description: "Contrasting color with transparency adjusted to midpoint between High (100% opacity) and Low (4.5:1 contrast) alpha levels."
  },
  { 
    key: "low" as const, 
    label: "Low",
    description: "Contrasting color with transparency calculated to achieve exactly 4.5:1 contrast ratio (WCAG AA standard)."
  },
  { 
    key: "heavy" as const, 
    label: "Heavy",
    description: "Dark CC: Step between Bold and step 200 (capped at 800). Light CC: Same as BoldA11Y, or step 2500 if more than 3 steps away from base."
  },
  { 
    key: "bold" as const, 
    label: "Bold",
    description: "Base value. If contrast < 3.0:1 against surface, finds the next color step with contrast >= 3.0:1."
  },
  { 
    key: "boldA11Y" as const, 
    label: "Bold A11Y",
    description: "Starts from the user-selected base step. Checks if contrast >= 4.5:1. If not, moves toward contrasting color step by step until finding >= 4.5:1 contrast (WCAG AA)."
  },
  { 
    key: "minimal" as const, 
    label: "Minimal",
    description: "Dark CC: Surface step - 200 (e.g., 2400 → 2200). Light CC: Surface step + 200 (e.g., 400 → 600)."
  },
];

interface ColorEditCellProps {
  step: Step;
  value: string;
  onChange: (hex: string) => void;
}

function ColorEditCell({ step, value, onChange }: ColorEditCellProps) {
  const [localValue, setLocalValue] = React.useState(value || '#');
  const [isValid, setIsValid] = React.useState(true);
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    // Always display with # prefix
    const displayVal = value ? (value.startsWith('#') ? value : `#${value}`) : '#';
    setLocalValue(displayVal);
    setIsValid(!value || isValidHex(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Ensure # is always at the start
    if (!newValue.startsWith('#')) {
      newValue = '#' + newValue.replace(/^#*/g, '');
    }
    
    // Limit to # + 6 hex chars
    const hexPart = newValue.slice(1).replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    newValue = '#' + hexPart;
    
    setLocalValue(newValue);
    
    if (hexPart.length === 6) {
      setIsValid(true);
      onChange(newValue);
    } else {
      setIsValid(hexPart.length === 0 || hexPart.length <= 6);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setLocalValue(hex);
    setIsValid(true);
    onChange(hex);
  };

  // Get stored value with #
  const storedValue = localValue.length === 7 && isValidHex(localValue) ? localValue : '';
  const textColor = storedValue ? getReadableTextColor(storedValue) : "#000";
  const bgColor = storedValue || "#ffffff";

  return (
    <div className="group flex items-center gap-1">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "h-12 w-8 shrink-0 rounded-md border transition-all hover:scale-105 cursor-pointer",
              !isValid && "ring-2 ring-destructive"
            )}
            style={{ backgroundColor: bgColor }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <input
            type="color"
            value={storedValue || "#ffffff"}
            onChange={handleColorPickerChange}
            className="h-32 w-32 cursor-pointer border-0"
          />
        </PopoverContent>
      </Popover>
      <Input
        value={localValue}
        onChange={handleChange}
        className={cn(
          "h-12 w-24 font-mono text-xs text-center cursor-pointer transition-all group-hover:ring-2 group-hover:ring-ring/50",
          !isValid && "border-destructive focus-visible:ring-destructive"
        )}
        style={{
          backgroundColor: storedValue ? bgColor : undefined,
          color: storedValue ? textColor : undefined
        }}
        placeholder="#000000"
      />
    </div>
  );
}

interface ScaleRowProps {
  step: Step;
  scales: StepScales | null;
  paletteId: string;
  paletteValue: string;
  onUpdate: (paletteId: string, step: Step, hex: string) => void;
  showDots: boolean;
}

function ScaleRow({ step, scales, paletteId, paletteValue, onUpdate, showDots }: ScaleRowProps) {
  const surfaceColor = scales?.surface?.hex || paletteValue;
  
  return (
    <div className="flex items-center gap-2">
      {/* Step label */}
      <div className="w-10 shrink-0 text-right font-mono text-xs text-muted-foreground">
        {step}
      </div>
      
      {/* Edit cell */}
      <div className="shrink-0">
        <ColorEditCell
          step={step}
          value={paletteValue}
          onChange={(hex) => onUpdate(paletteId, step, hex)}
        />
      </div>
      
      {/* Generated scales */}
      <div className="grid flex-1 grid-cols-8 gap-1">
        {SCALE_LABELS.map(({ key, label }) => {
          const scale = scales?.[key];
          if (!scale || !scale.hex) {
            return (
              <div
                key={key}
                className="flex h-12 w-full items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground"
              >
                —
              </div>
            );
          }
          return (
            <ColorSwatch
              key={key}
              scale={scale}
              label={`${step} / ${label}`}
              showStep={key !== "surface"}
              showDots={showDots}
              surfaceColor={surfaceColor}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * List Scale Row - Individual scale row in list view with copy icon on hover
 */
interface ListScaleRowProps {
  scale: ScaleResult;
  label: string;
  step: Step;
  displayStep: Step;
  hasAlpha: boolean;
  alpha: number | undefined;
  cellTextColor: string;
  passesAllAA: boolean;
  showDots: boolean;
  surfaceColor: string;
}

function ListScaleRow({ scale, label, step, displayStep, hasAlpha, alpha, cellTextColor, passesAllAA, showDots, surfaceColor }: ListScaleRowProps) {
  const [copied, setCopied] = React.useState(false);
  
  const handleCopy = async () => {
    try {
      // Use clipboard API if available (HTTPS), otherwise fallback to execCommand
      if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(scale.hex);
      } else {
        // Fallback for HTTP contexts
        const textArea = document.createElement("textarea");
        textArea.value = scale.hex;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleCopy}
          className="group/row relative flex items-center justify-center h-7 px-3 w-full transition-opacity hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: scale.hex }}
        >
          {/* Left side - Label with AA status dot */}
          <div className="absolute left-3 flex items-center gap-1.5">
            {showDots && (
              <span
                className={cn(
                  "h-1 w-1 rounded-full shrink-0",
                  passesAllAA ? "bg-green-500" : "bg-red-500"
                )}
              />
            )}
            <span 
              className="text-[10px]"
              style={{ color: cellTextColor }}
            >
              {label}
            </span>
          </div>
          
          {/* Center - Copy icon on hover */}
          {copied ? (
            <Check className="h-2.5 w-2.5" style={{ color: cellTextColor }} />
          ) : (
            <Copy 
              className="h-2.5 w-2.5 opacity-0 group-hover/row:opacity-50 transition-opacity" 
              style={{ color: cellTextColor }} 
            />
          )}
          
          {/* Right side - Step and alpha */}
          <div className="absolute right-3 flex items-center gap-2">
            {/* Step number */}
            <span 
              className="font-mono text-[10px]"
              style={{ color: cellTextColor, opacity: 0.8 }}
            >
              {displayStep}
            </span>
            
            {/* Alpha percentage */}
            {hasAlpha && (
              <span 
                className="font-mono text-[10px]"
                style={{ color: cellTextColor, opacity: 0.7 }}
              >
                {Math.round((alpha || 1) * 100)}%
              </span>
            )}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="w-64">
        <div className="space-y-2.5 text-xs text-primary-foreground">
          {/* Contrast Preview */}
          <ContrastPreview
            foregroundColor={scale.blendedHex || scale.hex}
            backgroundColor={surfaceColor}
          />
          
          <div className="font-medium">{step} / {label}</div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="opacity-70">Hex</span>
              <code className="font-mono text-xs">{scale.hex.toUpperCase()}</code>
            </div>
            
            {scale.alpha !== undefined && (
              <div className="flex items-center justify-between gap-4">
                <span className="opacity-70">Alpha</span>
                <span>{Math.round(scale.alpha * 100)}%</span>
              </div>
            )}
            
            {scale.sourceStep && (
              <div className="flex items-center justify-between gap-4">
                <span className="opacity-70">Step</span>
                <span>{scale.sourceStep}</span>
              </div>
            )}
          </div>
          
          {/* WCAG Contrast Check Section */}
          <div className="border-t border-primary-foreground/20 pt-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="opacity-70">Contrast</span>
              <span className="font-mono">{scale.contrastRatio.toFixed(2)} : 1</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="opacity-70">Normal Text</span>
              <div className="flex items-center gap-1.5">
                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", scale.wcag.normalText.aa ? "bg-green-600 text-white" : "bg-red-500 text-white")}>AA</span>
                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", scale.wcag.normalText.aaa ? "bg-green-600 text-white" : "bg-red-500 text-white")}>AAA</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="opacity-70">Large Text</span>
              <div className="flex items-center gap-1.5">
                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", scale.wcag.largeText.aa ? "bg-green-600 text-white" : "bg-red-500 text-white")}>AA</span>
                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", scale.wcag.largeText.aaa ? "bg-green-600 text-white" : "bg-red-500 text-white")}>AAA</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="opacity-70">Graphics</span>
              <div className="flex items-center gap-1.5">
                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", scale.wcag.graphics.aa ? "bg-green-600 text-white" : "bg-red-500 text-white")}>AA</span>
              </div>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * List View - Shows each step as a compact card with all scales
 */
interface ListViewCardProps {
  step: Step;
  scales: StepScales | null;
  paletteValue: string;
  showDots: boolean;
  paletteId: string;
  onUpdate: (paletteId: string, step: Step, hex: string) => void;
}

function ListViewCard({ step, scales, paletteValue, showDots, paletteId, onUpdate }: ListViewCardProps) {
  const [localValue, setLocalValue] = React.useState(paletteValue || '#');
  const [isValid, setIsValid] = React.useState(true);
  
  React.useEffect(() => {
    // Always display with # prefix
    const displayVal = paletteValue ? (paletteValue.startsWith('#') ? paletteValue : `#${paletteValue}`) : '#';
    setLocalValue(displayVal);
    setIsValid(!paletteValue || isValidHex(paletteValue));
  }, [paletteValue]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Ensure # is always at the start
    if (!newValue.startsWith('#')) {
      newValue = '#' + newValue.replace(/^#*/g, '');
    }
    
    // Limit to # + 6 hex chars
    const hexPart = newValue.slice(1).replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    newValue = '#' + hexPart;
    
    setLocalValue(newValue);
    
    if (hexPart.length === 6) {
      setIsValid(true);
      onUpdate(paletteId, step, newValue);
    } else {
      setIsValid(hexPart.length === 0 || hexPart.length <= 6);
    }
  };
  
  const surfaceColor = scales?.surface?.hex || paletteValue || '#e5e5e5';
  const textColor = paletteValue && isValidHex(surfaceColor) ? getReadableTextColor(surfaceColor) : "#666666";
  const hasValue = !!paletteValue;
  
  return (
    <div className="group flex flex-col rounded-lg border overflow-hidden">
      {/* Header with step number and always-visible input */}
      <div 
        className="flex items-center justify-between px-3 h-8 cursor-pointer"
        style={{ backgroundColor: hasValue ? surfaceColor : undefined }}
      >
        <span 
          className="font-mono text-[11px] shrink-0"
          style={{ color: hasValue ? textColor : undefined }}
        >
          {step}
        </span>
        <Input
          value={localValue}
          onChange={handleChange}
          className={cn(
            "h-5 w-20 font-mono text-[9px] cursor-pointer rounded-sm px-1.5 border-transparent bg-transparent text-right",
            "focus:border-foreground focus:bg-background/50",
            "group-hover:border-foreground/60 group-hover:bg-background/30",
            !isValid && "border-destructive focus-visible:ring-destructive"
          )}
          style={{ color: hasValue ? textColor : undefined }}
          placeholder="#000000"
        />
      </div>
      
      {/* Scale rows - full width color cells */}
      <div 
        className="flex flex-col"
        style={{ backgroundColor: surfaceColor }}
      >
        {SCALE_LABELS.map(({ key, label }) => {
          const scale = scales?.[key];
          if (!scale || !scale.hex) return null;
          
          const displayStep = scale.sourceStep || step;
          const alpha = scale.alpha;
          const hasAlpha = alpha !== undefined && alpha < 1;
          const cellTextColor = scale.blendedHex 
            ? getReadableTextColor(scale.blendedHex)
            : (isValidHex(scale.hex) ? getReadableTextColor(scale.hex) : textColor);
          
          // Check if all AA contrast checks pass
          const passesAllAA = scale.wcag.normalText.aa && scale.wcag.largeText.aa && scale.wcag.graphics.aa;
          
          return (
            <ListScaleRow
              key={key}
              scale={scale}
              label={label}
              step={step}
              displayStep={displayStep}
              hasAlpha={hasAlpha}
              alpha={alpha}
              cellTextColor={cellTextColor}
              passesAllAA={passesAllAA}
              showDots={showDots}
              surfaceColor={surfaceColor}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ScalePreview() {
  const { generatedScales, activePaletteId, palettes, updatePaletteStep, updatePrimaryStep, isFullscreen, toggleFullscreen } = usePaletteStore();
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");
  const [downloadOpen, setDownloadOpen] = React.useState(false);
  const [primaryOpen, setPrimaryOpen] = React.useState(false);
  const [showDots, setShowDots] = React.useState(true);
  const [copyStatus, setCopyStatus] = React.useState<'idle' | 'copied' | 'error'>('idle');
  const [copyContrastStatus, setCopyContrastStatus] = React.useState<'idle' | 'copied' | 'error'>('idle');
  
  // Reset copy status when download menu closes
  React.useEffect(() => {
    if (!downloadOpen) {
      setCopyStatus('idle');
    }
  }, [downloadOpen]);

  // Reset copy contrast status after delay
  React.useEffect(() => {
    if (copyContrastStatus === 'copied') {
      const timer = setTimeout(() => setCopyContrastStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyContrastStatus]);

  const activePalette = React.useMemo(
    () => palettes.find((p) => p.id === activePaletteId),
    [palettes, activePaletteId]
  );

  // Get sorted steps based on sort order
  const sortedSteps = React.useMemo(() => {
    return sortOrder === "asc" ? [...STEPS] : [...STEPS].reverse();
  }, [sortOrder]);

  if (!activePaletteId || !generatedScales || !activePalette) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>Select a palette to see generated scales</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="font-semibold">{activePalette.name}</h2>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {/* Base Step Dropdown */}
            <Popover open={primaryOpen} onOpenChange={setPrimaryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs cursor-pointer gap-1"
                >
                  <span className="text-muted-foreground">Base:</span>
                  <span className="font-mono">{activePalette.primaryStep}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] p-1 max-h-64 overflow-y-auto" align="end">
                <div className="flex flex-col">
                  {STEPS.map((step) => (
                    <button
                      key={step}
                      className={cn(
                        "rounded px-2 py-1 text-xs text-left cursor-pointer font-mono",
                        step === activePalette.primaryStep
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent"
                      )}
                      onClick={() => {
                        updatePrimaryStep(activePalette.id, step);
                        setPrimaryOpen(false);
                      }}
                    >
                      {step}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Show Dots Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showDots ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 w-6 p-0 cursor-pointer"
                  onClick={() => setShowDots(!showDots)}
                >
                  <Circle className={cn("h-3.5 w-3.5", showDots ? "fill-current opacity-70" : "opacity-50")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{showDots ? "Hide AA indicators" : "Show AA indicators"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Copy Contrast Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 cursor-pointer"
                  onClick={async () => {
                    const success = await copyContrastAsSVG(activePalette.name, generatedScales, sortedSteps);
                    setCopyContrastStatus(success ? 'copied' : 'error');
                  }}
                >
                  {copyContrastStatus === 'copied' ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 opacity-50" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {copyContrastStatus === 'copied' ? 'Copied!' : 'Copy contrast values'}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Download Menu */}
            <Popover open={downloadOpen} onOpenChange={setDownloadOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-1" align="end">
                <div className="flex flex-col">
                  <button
                    className="rounded px-2 py-1.5 text-xs hover:bg-accent text-left cursor-pointer"
                    onClick={() => {
                      exportAsJSON(activePalette.name, activePalette.steps);
                      setDownloadOpen(false);
                    }}
                  >
                    JSON
                  </button>
                  <button
                    className="rounded px-2 py-1.5 text-xs hover:bg-accent text-left cursor-pointer"
                    onClick={() => {
                      exportAsCSS(activePalette.name, activePalette.steps);
                      setDownloadOpen(false);
                    }}
                  >
                    CSS Variables
                  </button>
                  <button
                    className="rounded px-2 py-1.5 text-xs hover:bg-accent text-left cursor-pointer"
                    onClick={() => {
                      exportAsText(activePalette.name, activePalette.steps);
                      setDownloadOpen(false);
                    }}
                  >
                    Text
                  </button>
                  <div className="my-1 h-px bg-border/50" />
                  <button
                    className="rounded px-2 py-1.5 text-xs hover:bg-accent text-left cursor-pointer"
                    onClick={async () => {
                      const success = await copyScalesAsSVG(activePalette.name, generatedScales, sortedSteps);
                      setCopyStatus(success ? 'copied' : 'error');
                      if (success) {
                        setTimeout(() => setDownloadOpen(false), 800);
                      }
                    }}
                  >
                    {copyStatus === 'copied' ? '✓ Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy for Figma'}
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 cursor-pointer"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{sortOrder === "asc" ? "Sort 2500 → 200" : "Sort 200 → 2500"}</p>
              </TooltipContent>
            </Tooltip>

            {/* View Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 cursor-pointer"
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                >
                  {viewMode === "grid" ? (
                    <List className="h-3.5 w-3.5 opacity-50" />
                  ) : (
                    <LayoutGrid className="h-3.5 w-3.5 opacity-50" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{viewMode === "grid" ? "List View" : "Grid View"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Fullscreen Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 cursor-pointer"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5 opacity-50" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5 opacity-50" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {viewMode === "grid" ? (
          <>
            {/* Header row */}
            <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
              <div className="w-10 shrink-0" />
              <div className="w-[136px] shrink-0 text-center text-[10px] font-medium uppercase tracking-wide text-foreground">
                Base Color
              </div>
              <div className="grid flex-1 grid-cols-8 gap-1">
                {SCALE_LABELS.map(({ key, label, description }) => (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "cursor-help text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground",
                          key === "surface" && "font-semibold text-foreground"
                        )}
                      >
                        {label}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-xs">{description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-1 p-4">
                {sortedSteps.map((step) => (
                  <ScaleRow
                    key={step}
                    step={step}
                    scales={generatedScales[step]}
                    paletteId={activePalette.id}
                    paletteValue={activePalette.steps[step]}
                    onUpdate={updatePaletteStep}
                    showDots={showDots}
                  />
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
              {sortedSteps.map((step) => {
                const scales = generatedScales[step];
                const paletteValue = activePalette.steps[step];
                
                return (
                  <ListViewCard
                    key={step}
                    step={step}
                    scales={scales}
                    paletteValue={paletteValue}
                    showDots={showDots}
                    paletteId={activePalette.id}
                    onUpdate={updatePaletteStep}
                  />
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </TooltipProvider>
  );
}

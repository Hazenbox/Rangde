"use client";

import * as React from "react";
import { Plus, MoreHorizontal, ChevronRight, HelpCircle, Search, GripVertical } from "lucide-react";
import { Plus, MoreHorizontal, ChevronRight, ChevronDown, HelpCircle, Search, Workflow, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePaletteStore } from "@/store/palette-store";
import { useCollectionsStore } from "@/store/collections-store";
import { STEPS, PaletteSteps, getReadableTextColor, isValidHex, rgbaToHex, sanitizeFigmaName } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function generatePaletteSVG(name: string, steps: PaletteSteps): string {
  const filledSteps = STEPS.filter(step => steps[step]);
  const cols = 6;
  const swatchSize = 100;
  const gap = 24;
  const padding = 32;
  const labelHeight = 24;
  const hexLabelHeight = 18;
  const titleHeight = 28;
  const titleMarginBottom = 24;
  const rows = Math.ceil(filledSteps.length / cols);
  
  const contentWidth = cols * swatchSize + (cols - 1) * gap;
  const contentHeight = rows * (labelHeight + swatchSize + hexLabelHeight + gap) - gap;
  const width = padding * 2 + contentWidth;
  const height = padding * 2 + titleHeight + titleMarginBottom + contentHeight;
  
  const sanitizedName = sanitizeFigmaName(name);
  
  let svgContent = `<svg id="${sanitizedName}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  svgContent += `  <defs>\n`;
  svgContent += `    <style>\n`;
  svgContent += `      .title { font-family: 'JioType Var', sans-serif; font-style: normal; font-weight: 700; font-size: 14px; line-height: 16px; letter-spacing: -0.02em; fill: #1a1a1a; }\n`;
  svgContent += `      .step-label { font-family: 'JioType Var', sans-serif; font-size: 13px; font-weight: 600; fill: #4a4a4a; }\n`;
  svgContent += `      .hex-label { font-family: 'JioType Var', sans-serif; font-size: 11px; font-weight: 500; }\n`;
  svgContent += `    </style>\n`;
  svgContent += `  </defs>\n`;
  
  // Background rectangle
  svgContent += `  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" rx="8"/>\n`;
  
  // Title
  svgContent += `  <text x="${padding}" y="${padding + 16}" class="title">${name}</text>\n`;
  
  // Swatches (no groups, direct elements)
  filledSteps.forEach((step, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const baseX = padding + col * (swatchSize + gap);
    const baseY = padding + titleHeight + titleMarginBottom + row * (labelHeight + swatchSize + hexLabelHeight + gap);
    const rawHex = steps[step] || '#000000';
    
    // Convert rgba to hex if needed
    let hex = rawHex;
    let displayHex = rawHex;
    if (rawHex.startsWith('rgba') || rawHex.startsWith('rgb')) {
      hex = rgbaToHex(rawHex);
      displayHex = hex;
    } else {
      displayHex = rawHex.toUpperCase();
    }
    
    // Determine text color for hex label based on background
    const hexTextColor = isValidHex(hex) ? getReadableTextColor(hex) : '#333';
    const stepTextColor = '#4a4a4a';
    
    // Step label
    svgContent += `  <text x="${baseX + swatchSize / 2}" y="${baseY + 16}" text-anchor="middle" class="step-label" fill="${stepTextColor}">${step}</text>\n`;
    
    // Color swatch with id
    const swatchId = `${sanitizedName}-${step}`;
    svgContent += `  <rect id="${swatchId}" x="${baseX}" y="${baseY + labelHeight}" width="${swatchSize}" height="${swatchSize}" fill="${hex}" rx="6" stroke="#e5e5e5" stroke-width="0.5"/>\n`;
    
    // Hex label
    svgContent += `  <text x="${baseX + swatchSize / 2}" y="${baseY + labelHeight + swatchSize + 14}" text-anchor="middle" class="hex-label" fill="${hexTextColor}">${displayHex}</text>\n`;
  });
  
  svgContent += `</svg>`;
  return svgContent;
}

async function copyPaletteAsSVG(name: string, steps: PaletteSteps): Promise<boolean> {
  const svg = generatePaletteSVG(name, steps);
  try {
    await navigator.clipboard.writeText(svg);
    return true;
  } catch {
    return false;
  }
}

interface PaletteItemProps {
  palette: { id: string; name: string; steps: PaletteSteps };
  isActive: boolean;
  isEditing: boolean;
  editingName: string;
  onSelect: () => void;
  onStartEdit: () => void;
  onEditChange: (name: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
}

function SortablePaletteItem({
  palette,
  isActive,
  isEditing,
  editingName,
  onSelect,
  onStartEdit,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
}: PaletteItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: palette.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [downloadHover, setDownloadHover] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState<'idle' | 'copied' | 'error'>('idle');
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close submenu when main menu closes
  React.useEffect(() => {
    if (!menuOpen) {
      setDownloadHover(false);
      setCopyStatus('idle');
    }
  }, [menuOpen]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex h-8 items-center justify-between rounded-lg pl-3 pr-1 text-sm transition-colors cursor-pointer select-none",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/50"
      )}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="mr-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50 transition-opacity touch-none"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.preventDefault()}
      >
        <GripVertical className="h-3.5 w-3.5 pointer-events-none" />
      </div>
      {isEditing ? (
        <Input
          value={editingName}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onEditSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEditSave();
            if (e.key === "Escape") onEditCancel();
          }}
          className="h-5 px-1 py-0 text-xs rounded-lg"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate">{palette.name}</span>
      )}
      
      {/* Meatball Menu */}
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-5 w-5 rounded-full cursor-pointer transition-opacity",
              menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(true);
            }}
          >
            <MoreHorizontal className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          ref={menuRef}
          className="w-32 p-1" 
          align="end" 
          side="right"
          onMouseLeave={() => setDownloadHover(false)}
        >
          <div className="flex flex-col">
            {/* Rename */}
            <button
              className="rounded px-2 py-1.5 text-xs hover:bg-accent text-left cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onStartEdit();
              }}
            >
              Rename
            </button>
            
            {/* Download with hover submenu */}
            <div 
              className="relative"
              onMouseEnter={() => setDownloadHover(true)}
            >
              <button
                className="flex items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-accent text-left w-full cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <span>Download</span>
                <ChevronRight className="h-2.5 w-2.5 opacity-50" />
              </button>
              
              {/* Hover submenu */}
              {downloadHover && (
                <div 
                  className="absolute left-full top-0 ml-1 w-28 rounded-md border bg-popover p-1"
                  onMouseEnter={() => setDownloadHover(true)}
                  onMouseLeave={() => setDownloadHover(false)}
                >
                  <button
                    className="rounded px-2 py-1.5 text-xs hover:bg-accent text-left w-full cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportAsJSON(palette.name, palette.steps);
                      setMenuOpen(false);
                    }}
                  >
                    JSON
                  </button>
                  <button
                    className="rounded px-2 py-1.5 text-xs hover:bg-accent text-left w-full cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportAsCSS(palette.name, palette.steps);
                      setMenuOpen(false);
                    }}
                  >
                    CSS
                  </button>
                  <button
                    className="rounded px-2 py-1.5 text-xs hover:bg-accent text-left w-full cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportAsText(palette.name, palette.steps);
                      setMenuOpen(false);
                    }}
                  >
                    Text
                  </button>
                  <div className="my-1 h-px bg-border/50" />
                  <button
                    className="rounded px-2 py-1.5 text-xs hover:bg-accent text-left w-full cursor-pointer"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const success = await copyPaletteAsSVG(palette.name, palette.steps);
                      setCopyStatus(success ? 'copied' : 'error');
                      if (success) {
                        setTimeout(() => setMenuOpen(false), 800);
                      }
                    }}
                  >
                    {copyStatus === 'copied' ? '✓ Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy for Figma'}
                  </button>
                </div>
              )}
            </div>
            
            {/* Divider */}
            <div className="my-1 h-px bg-border/50" />
            
            {/* Delete */}
            <button
              className="rounded px-2 py-1.5 text-xs hover:bg-accent text-left cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                setDeleteDialogOpen(true);
              }}
            >
              Delete
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete Palette</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{palette.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false);
                onDelete();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ColorSidebar() {
  const {
    palettes,
    activePaletteId,
    createPalette,
    deletePalette,
    setActivePalette,
    renamePalette,
    reorderPalettes,
    viewMode,
    setViewMode,
    generatedScales,
  } = usePaletteStore();

  const { selectedNodeId, getCollection, setSelectedNode } = useCollectionsStore();
  const selectedCollection = selectedNodeId ? getCollection(selectedNodeId) : null;

  const [newPaletteName, setNewPaletteName] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // Collections mode state
  const [expandedPalettes, setExpandedPalettes] = React.useState<Set<string>>(
    new Set(palettes.map(p => p.id))
  );

  const handleCreate = () => {
    if (newPaletteName.trim()) {
      createPalette(newPaletteName.trim());
      setNewPaletteName("");
      setDialogOpen(false);
    }
  };

  const handleRename = (id: string) => {
    if (editingName.trim()) {
      renamePalette(id, editingName.trim());
    }
    setEditingId(null);
    setEditingName("");
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  // Filter palettes based on search query
  const filteredPalettes = palettes.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Drag and drop sensors with activation delay to prevent text selection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = palettes.findIndex((p) => p.id === active.id);
      const newIndex = palettes.findIndex((p) => p.id === over.id);
      reorderPalettes(oldIndex, newIndex);
    }
  };

  // Collections mode handlers
  const togglePalette = (paletteId: string) => {
    setExpandedPalettes(prev => {
      const next = new Set(prev);
      if (next.has(paletteId)) {
        next.delete(paletteId);
      } else {
        next.add(paletteId);
      }
      return next;
    });
  };

  const handleDragStart = (
    event: React.DragEvent,
    hex: string,
    paletteId: string,
    step: number,
    scaleType?: string
  ) => {
    event.dataTransfer.effectAllowed = 'copy';
    const data = {
      type: 'color',
      hex,
      paletteId,
      step,
      scaleType,
    };
    event.dataTransfer.setData('application/json', JSON.stringify(data));
  };

  const scaleTypes = ['surface', 'high', 'medium', 'low', 'heavy', 'bold', 'boldA11Y', 'minimal'] as const;
  const activePalette = palettes.find(p => p.id === activePaletteId);

  // Render collections mode sidebar
  if (viewMode === "collections") {
    return (
      <div className="flex h-full w-56 flex-col bg-sidebar-background relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-between px-3 pt-5 pb-3">
          <svg 
            width="88" 
            height="26" 
            viewBox="0 0 110 33" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Rang De"
            role="img"
            className="text-foreground"
          >
            <path d="M25.2533 18.9333L26.1066 20.24C25.2355 23.2978 23.431 24.8267 20.6933 24.8267C20.071 24.8267 19.5288 24.7111 19.0666 24.48C18.6221 24.2489 18.2844 23.9733 18.0533 23.6533C17.8221 23.3333 17.6355 22.9244 17.4933 22.4267C17.2977 21.68 17.191 20.6933 17.1733 19.4667C17.1733 18.24 17.0221 17.3956 16.7199 16.9333C16.4355 16.4711 15.8844 16.2133 15.0666 16.16L15.3599 13.8933C15.3955 13.8933 15.4221 13.8933 15.4399 13.8933C16.471 13.8933 17.3244 13.6 17.9999 13.0133C18.7288 12.3556 19.0933 11.5111 19.0933 10.48C19.0933 9.44888 18.6044 8.57777 17.6266 7.86666C16.6666 7.15555 15.4221 6.8 13.8933 6.8C11.9199 6.8 10.3999 7.28889 9.33325 8.26666C8.76436 8.8 8.47992 9.44 8.47992 10.1867C8.47992 11.1289 9.19992 11.6978 10.6399 11.8933L10.2666 13.8933C9.18214 13.84 8.22214 13.4756 7.38659 12.8C6.55103 12.1244 6.13325 11.2533 6.13325 10.1867C6.13325 8.32 6.91547 6.88888 8.47992 5.89333C10.0444 4.88 12.0266 4.37333 14.4266 4.37333C15.9733 4.37333 17.3333 4.56 18.5066 4.93333C20.5155 5.60888 21.8488 6.78222 22.5066 8.45333C22.7199 9.04 22.8266 9.52 22.8266 9.89333C22.8266 10.2489 22.8266 10.4889 22.8266 10.6133C22.7555 11.5911 22.391 12.5511 21.7333 13.4933C21.0933 14.4356 20.1244 15.0844 18.8266 15.44C19.6088 15.6 20.1421 15.9378 20.4266 16.4533C20.711 16.9689 20.8621 17.7511 20.8799 18.8C20.8977 20.5956 20.9777 21.6889 21.1199 22.08C21.2799 22.4533 21.5999 22.64 22.0799 22.64C23.3777 22.64 24.4355 21.4044 25.2533 18.9333ZM8.90659 24.8267C7.96436 24.8267 7.20881 24.5422 6.63992 23.9733C6.07103 23.4044 5.78659 22.7022 5.78659 21.8667C5.78659 19.6978 7.3777 17.8844 10.5599 16.4267C11.1999 11.4489 11.5288 8.89777 11.5466 8.77333C12.2933 8.29333 13.1377 8.05333 14.0799 8.05333C14.471 8.05333 14.9155 8.10666 15.4133 8.21333L13.7333 19.6C13.1999 23.0844 11.591 24.8267 8.90659 24.8267ZM7.75992 21.5467C7.75992 22.1156 8.06214 22.4 8.66659 22.4C9.3777 22.4 9.83103 21.76 10.0266 20.48L10.2666 18.6667C8.59547 19.6444 7.75992 20.6044 7.75992 21.5467ZM35.9185 24.8C34.2829 24.8 33.1985 24.2311 32.6651 23.0933C31.7407 24.2489 30.5496 24.8267 29.0918 24.8267C27.6518 24.8267 26.434 24.3378 25.4385 23.36C24.4607 22.3822 23.9718 21.0933 23.9718 19.4933C23.9718 17.1644 24.6562 15.3067 26.0251 13.92C27.394 12.5333 29.1274 11.84 31.2251 11.84C31.2785 11.84 31.3318 11.84 31.3851 11.84C32.274 11.84 33.0918 11.9911 33.8385 12.2933C34.3185 11.9911 34.8962 11.84 35.5718 11.84C36.2651 11.84 36.7629 11.9289 37.0651 12.1067C36.9051 13.4222 36.7362 14.72 36.5585 16C36.3807 17.2622 36.2562 18.16 36.1851 18.6933C36.0251 19.9022 35.9451 20.7733 35.9451 21.3067C35.9451 22.0178 36.2296 22.3733 36.7985 22.3733C37.2429 22.3733 37.714 22.08 38.2118 21.4933C38.7096 20.8889 39.1451 19.9467 39.5185 18.6667C40.034 19.1289 40.3896 19.6444 40.5851 20.2133C40.0696 21.9022 39.3762 23.0933 38.5051 23.7867C37.634 24.4622 36.7718 24.8 35.9185 24.8ZM31.6251 13.92C30.4874 13.92 29.5807 14.3556 28.9051 15.2267C28.2474 16.08 27.8562 17.36 27.7318 19.0667C27.714 19.2267 27.7051 19.3778 27.7051 19.52C27.7051 20.3911 27.9096 21.0844 28.3185 21.6C28.7451 22.1156 29.2874 22.3733 29.9451 22.3733C31.0651 22.3733 31.9096 21.5822 32.4785 20L33.1185 14.24C32.6029 14.0267 32.1051 13.92 31.6251 13.92ZM46.2612 21.68L46.9012 15.7333C46.9012 15.2533 46.7767 14.8533 46.5278 14.5333C46.2789 14.2133 45.8612 14.0533 45.2745 14.0533C44.7056 14.0533 44.2167 14.3111 43.8078 14.8267C43.4167 15.3244 43.1678 15.9556 43.0612 16.72C42.4212 21.5911 42.0834 24.24 42.0478 24.6667H38.4478L39.9145 12.1067C40.6612 11.9111 41.2301 11.8133 41.6212 11.8133C42.8123 11.8133 43.4345 12.2489 43.4878 13.12C44.3589 12.2667 45.3989 11.84 46.6078 11.84C47.8345 11.84 48.7945 12.1422 49.4878 12.7467C50.1812 13.3511 50.5278 14.1156 50.5278 15.04C50.5278 15.2889 50.4745 15.76 50.3678 16.4533C49.9589 19.1556 49.7545 20.7289 49.7545 21.1733C49.7545 21.9911 50.0301 22.4 50.5812 22.4C51.7901 22.4 52.7056 21.1378 53.3278 18.6133C53.9323 19.2533 54.2967 19.76 54.4212 20.1333C53.4789 23.2622 51.8434 24.8267 49.5145 24.8267C48.4123 24.8267 47.5945 24.4889 47.0612 23.8133C46.5278 23.1378 46.2612 22.4267 46.2612 21.68ZM59.6626 11.84C60.6404 11.84 61.5382 12 62.356 12.32C62.9071 11.9822 63.4849 11.8133 64.0893 11.8133C64.6937 11.8133 65.1737 11.8933 65.5293 12.0533L64.5693 19.5733C65.8849 18.56 66.8804 17.6356 67.556 16.8L68.3293 18.4267C67.316 19.4933 65.9649 20.6311 64.276 21.84L63.556 27.4133C63.3604 29.0844 62.8093 30.3644 61.9026 31.2533C61.0137 32.16 59.8582 32.6133 58.436 32.6133C57.6182 32.6133 56.8182 32.3467 56.036 31.8133C55.2182 31.2444 54.8093 30.3289 54.8093 29.0667C54.8093 27.52 55.5471 26.1067 57.0226 24.8267C55.7604 24.7378 54.676 24.2133 53.7693 23.2533C52.8626 22.2933 52.4093 21.04 52.4093 19.4933C52.4093 17.1644 53.0937 15.3067 54.4626 13.92C55.8315 12.5333 57.5649 11.84 59.6626 11.84ZM60.0626 13.92C58.9249 13.92 58.0182 14.3556 57.3426 15.2267C56.6849 16.08 56.2937 17.36 56.1693 19.0667C56.1515 19.2267 56.1426 19.3778 56.1426 19.52C56.1426 20.3911 56.3471 21.0844 56.756 21.6C57.1826 22.1156 57.7249 22.3733 58.3826 22.3733C59.5026 22.3733 60.3471 21.5911 60.916 20.0267L61.5826 14.24C61.0315 14.0267 60.5249 13.92 60.0626 13.92ZM56.8626 28.6667C56.8626 29.1467 56.996 29.52 57.2626 29.7867C57.5471 30.0711 57.8671 30.2133 58.2226 30.2133C59.2182 30.2133 59.796 29.5822 59.956 28.32L60.4093 24.32C58.0449 25.7244 56.8626 27.1733 56.8626 28.6667ZM72.8614 10.3733C72.8614 8.47111 73.6881 6.97777 75.3414 5.89333C76.9947 4.80888 78.8969 4.26666 81.0481 4.26666C83.8036 4.26666 86.2214 5.05777 88.3014 6.64C89.3325 7.44 90.1325 8.50666 90.7014 9.84C91.2703 11.1556 91.5547 12.6133 91.5547 14.2133C91.5547 17.36 90.6569 19.92 88.8614 21.8933C86.9947 23.9022 84.6569 24.9067 81.8481 24.9067C81.2258 24.9067 80.5681 24.8267 79.8747 24.6667C79.1814 24.5067 78.6303 24.2933 78.2214 24.0267C77.5636 24.5244 76.7192 24.7733 75.6881 24.7733C74.6747 24.7733 73.8836 24.4889 73.3147 23.92C72.7458 23.3511 72.4614 22.6222 72.4614 21.7333C72.4614 19.6356 74.0525 17.8489 77.2347 16.3733C77.3236 15.6267 77.4481 14.6222 77.6081 13.36C77.7858 12.08 77.9192 11.0489 78.0081 10.2667C78.1147 9.48444 78.1858 8.96888 78.2214 8.72C78.9503 8.25777 79.7947 8.02666 80.7547 8.02666C81.1992 8.02666 81.6258 8.07111 82.0347 8.16L80.3547 19.5467C80.1947 20.56 79.9725 21.4044 79.6881 22.08C80.2392 22.2222 80.6836 22.2933 81.0214 22.2933C83.0658 22.2933 84.6481 21.52 85.7681 19.9733C86.9236 18.3556 87.5014 16.4 87.5014 14.1067C87.5014 11.1733 86.4436 9.06666 84.3281 7.78666C83.1547 7.07555 81.8658 6.72 80.4614 6.72C78.6658 6.72 77.2436 7.20888 76.1947 8.18666C75.5903 8.73777 75.2881 9.40444 75.2881 10.1867C75.2881 10.5956 75.4125 10.9867 75.6614 11.36C75.9103 11.7156 76.3458 11.92 76.9681 11.9733L76.7014 13.7067C75.4036 13.6356 74.4347 13.28 73.7947 12.64C73.1725 11.9822 72.8614 11.2267 72.8614 10.3733ZM74.4347 21.3867C74.4347 22.0267 74.7369 22.3467 75.3414 22.3467C75.5903 22.3467 75.8481 22.1867 76.1147 21.8667C76.3992 21.5289 76.5947 21.0044 76.7014 20.2933L76.9414 18.64C75.2703 19.5822 74.4347 20.4978 74.4347 21.3867ZM97.3451 18.6933C98.4474 18.4622 99.2651 18.0178 99.7985 17.36C100.35 16.7022 100.625 16.0711 100.625 15.4667C100.625 14.8444 100.456 14.4267 100.118 14.2133C99.7985 13.9822 99.4429 13.8667 99.0518 13.8667C98.2162 13.8667 97.4785 14.3378 96.8385 15.28C96.2162 16.2044 95.9051 17.3156 95.9051 18.6133C95.9051 19.8933 96.2074 20.8533 96.8118 21.4933C97.434 22.1156 98.1985 22.4267 99.1051 22.4267C100.438 22.4267 101.718 21.9644 102.945 21.04C104.172 20.1156 105.167 18.9067 105.932 17.4133C106.323 17.7867 106.678 18.2489 106.998 18.8C106.412 20.1333 105.372 21.44 103.878 22.72C103.132 23.3422 102.243 23.8489 101.212 24.24C100.198 24.6311 99.1496 24.8267 98.0651 24.8267C96.2874 24.8267 94.8829 24.2844 93.8518 23.2C92.7496 22.0267 92.1985 20.5244 92.1985 18.6933C92.1985 16.8622 92.8829 15.2622 94.2518 13.8933C95.6385 12.5244 97.2918 11.84 99.2118 11.84C100.581 11.84 101.692 12.1422 102.545 12.7467C103.398 13.3333 103.834 14.1333 103.852 15.1467C103.852 16.5156 103.301 17.6267 102.198 18.48C101.114 19.3333 99.6207 19.9289 97.7185 20.2667L97.3451 18.6933Z" fill="currentColor"/>
          </svg>
        </div>

        {/* Collection Header with Dismiss */}
        {selectedCollection && (
          <div className="flex items-center justify-between px-3 pt-5 pb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium truncate">
                  {selectedCollection.icon} {selectedCollection.name}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => setSelectedNode(null)}
                  title="Dismiss collection"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar - matching global nav style */}
        <div className="px-2 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 px-3 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {palettes.length === 0 ? (
              <div className="text-[10px] text-muted-foreground text-center py-4">
                No palettes available
              </div>
            ) : (
              palettes
                .filter((palette) => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return palette.name.toLowerCase().includes(query);
                })
                .map((palette) => {
                  const isExpanded = expandedPalettes.has(palette.id);
                  const availableSteps = STEPS.filter(step => palette.steps[step]);

                  return (
                    <div key={palette.id} className="border rounded overflow-hidden">
                      <button
                        className="flex items-center justify-between w-full px-2 py-1 bg-muted/30 hover:bg-muted/50 transition-colors"
                        onClick={() => togglePalette(palette.id)}
                      >
                        <span className="text-sm font-medium truncate">{palette.name}</span>
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-3 w-3 flex-shrink-0" />
                        )}
                      </button>

                        {isExpanded && (
                          <div className="p-1 grid grid-cols-4 gap-1">
                            {availableSteps.map((step) => {
                              const hex = palette.steps[step];
                              return (
                                <div
                                  key={step}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, hex, palette.id, step)}
                                  className="relative group cursor-grab active:cursor-grabbing"
                                  title={`${palette.name} - ${step}`}
                                >
                                  <div
                                    className="aspect-square rounded border hover:ring-1 hover:ring-primary transition-all"
                                    style={{ backgroundColor: hex }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[8px] font-bold text-white bg-black/60 px-1 rounded">
                                      {step}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
            )}

            {/* Scales */}
            {activePalette && generatedScales && (
              <>
                {STEPS.filter(step => {
                  if (!activePalette.steps[step] || !generatedScales[step]) return false;
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return step.toString().includes(query) || 
                         activePalette.name.toLowerCase().includes(query);
                }).map((step) => {
                  const stepScales = generatedScales[step];
                  if (!stepScales) return null;

                  return (
                    <div key={`scale-${step}`} className="border rounded overflow-hidden">
                      <div className="px-2 py-1 bg-muted/30">
                        <span className="text-sm font-medium">Step {step}</span>
                      </div>
                      <div className="p-1 grid grid-cols-4 gap-1">
                        {scaleTypes.map((scaleType) => {
                          const scale = stepScales[scaleType];
                          if (!scale?.hex) return null;

                          return (
                            <div
                              key={scaleType}
                              draggable
                              onDragStart={(e) =>
                                handleDragStart(e, scale.hex, activePalette.id, step, scaleType)
                              }
                              className="relative group cursor-grab active:cursor-grabbing"
                              title={`${step} - ${scaleType}`}
                            >
                              <div
                                className="aspect-square rounded border hover:ring-1 hover:ring-primary transition-all"
                                style={{ backgroundColor: scale.hex }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[7px] font-bold text-white bg-black/60 px-0.5 rounded">
                                  {scaleType}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Bottom - Only Theme Toggle */}
        <div className="p-3 space-y-2 border-t">
          <ThemeToggle />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-56 flex-col bg-sidebar-background relative z-10">
      <div className="flex items-center justify-between px-3 pt-5 pb-3">
        {/* Logo - SVG uses currentColor so it adapts to light/dark mode */}
        <svg 
          width="88" 
          height="26" 
          viewBox="0 0 110 33" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Rang De"
          role="img"
          className="text-foreground"
        >
          <path d="M25.2533 18.9333L26.1066 20.24C25.2355 23.2978 23.431 24.8267 20.6933 24.8267C20.071 24.8267 19.5288 24.7111 19.0666 24.48C18.6221 24.2489 18.2844 23.9733 18.0533 23.6533C17.8221 23.3333 17.6355 22.9244 17.4933 22.4267C17.2977 21.68 17.191 20.6933 17.1733 19.4667C17.1733 18.24 17.0221 17.3956 16.7199 16.9333C16.4355 16.4711 15.8844 16.2133 15.0666 16.16L15.3599 13.8933C15.3955 13.8933 15.4221 13.8933 15.4399 13.8933C16.471 13.8933 17.3244 13.6 17.9999 13.0133C18.7288 12.3556 19.0933 11.5111 19.0933 10.48C19.0933 9.44888 18.6044 8.57777 17.6266 7.86666C16.6666 7.15555 15.4221 6.8 13.8933 6.8C11.9199 6.8 10.3999 7.28889 9.33325 8.26666C8.76436 8.8 8.47992 9.44 8.47992 10.1867C8.47992 11.1289 9.19992 11.6978 10.6399 11.8933L10.2666 13.8933C9.18214 13.84 8.22214 13.4756 7.38659 12.8C6.55103 12.1244 6.13325 11.2533 6.13325 10.1867C6.13325 8.32 6.91547 6.88888 8.47992 5.89333C10.0444 4.88 12.0266 4.37333 14.4266 4.37333C15.9733 4.37333 17.3333 4.56 18.5066 4.93333C20.5155 5.60888 21.8488 6.78222 22.5066 8.45333C22.7199 9.04 22.8266 9.52 22.8266 9.89333C22.8266 10.2489 22.8266 10.4889 22.8266 10.6133C22.7555 11.5911 22.391 12.5511 21.7333 13.4933C21.0933 14.4356 20.1244 15.0844 18.8266 15.44C19.6088 15.6 20.1421 15.9378 20.4266 16.4533C20.711 16.9689 20.8621 17.7511 20.8799 18.8C20.8977 20.5956 20.9777 21.6889 21.1199 22.08C21.2799 22.4533 21.5999 22.64 22.0799 22.64C23.3777 22.64 24.4355 21.4044 25.2533 18.9333ZM8.90659 24.8267C7.96436 24.8267 7.20881 24.5422 6.63992 23.9733C6.07103 23.4044 5.78659 22.7022 5.78659 21.8667C5.78659 19.6978 7.3777 17.8844 10.5599 16.4267C11.1999 11.4489 11.5288 8.89777 11.5466 8.77333C12.2933 8.29333 13.1377 8.05333 14.0799 8.05333C14.471 8.05333 14.9155 8.10666 15.4133 8.21333L13.7333 19.6C13.1999 23.0844 11.591 24.8267 8.90659 24.8267ZM7.75992 21.5467C7.75992 22.1156 8.06214 22.4 8.66659 22.4C9.3777 22.4 9.83103 21.76 10.0266 20.48L10.2666 18.6667C8.59547 19.6444 7.75992 20.6044 7.75992 21.5467ZM35.9185 24.8C34.2829 24.8 33.1985 24.2311 32.6651 23.0933C31.7407 24.2489 30.5496 24.8267 29.0918 24.8267C27.6518 24.8267 26.434 24.3378 25.4385 23.36C24.4607 22.3822 23.9718 21.0933 23.9718 19.4933C23.9718 17.1644 24.6562 15.3067 26.0251 13.92C27.394 12.5333 29.1274 11.84 31.2251 11.84C31.2785 11.84 31.3318 11.84 31.3851 11.84C32.274 11.84 33.0918 11.9911 33.8385 12.2933C34.3185 11.9911 34.8962 11.84 35.5718 11.84C36.2651 11.84 36.7629 11.9289 37.0651 12.1067C36.9051 13.4222 36.7362 14.72 36.5585 16C36.3807 17.2622 36.2562 18.16 36.1851 18.6933C36.0251 19.9022 35.9451 20.7733 35.9451 21.3067C35.9451 22.0178 36.2296 22.3733 36.7985 22.3733C37.2429 22.3733 37.714 22.08 38.2118 21.4933C38.7096 20.8889 39.1451 19.9467 39.5185 18.6667C40.034 19.1289 40.3896 19.6444 40.5851 20.2133C40.0696 21.9022 39.3762 23.0933 38.5051 23.7867C37.634 24.4622 36.7718 24.8 35.9185 24.8ZM31.6251 13.92C30.4874 13.92 29.5807 14.3556 28.9051 15.2267C28.2474 16.08 27.8562 17.36 27.7318 19.0667C27.714 19.2267 27.7051 19.3778 27.7051 19.52C27.7051 20.3911 27.9096 21.0844 28.3185 21.6C28.7451 22.1156 29.2874 22.3733 29.9451 22.3733C31.0651 22.3733 31.9096 21.5822 32.4785 20L33.1185 14.24C32.6029 14.0267 32.1051 13.92 31.6251 13.92ZM46.2612 21.68L46.9012 15.7333C46.9012 15.2533 46.7767 14.8533 46.5278 14.5333C46.2789 14.2133 45.8612 14.0533 45.2745 14.0533C44.7056 14.0533 44.2167 14.3111 43.8078 14.8267C43.4167 15.3244 43.1678 15.9556 43.0612 16.72C42.4212 21.5911 42.0834 24.24 42.0478 24.6667H38.4478L39.9145 12.1067C40.6612 11.9111 41.2301 11.8133 41.6212 11.8133C42.8123 11.8133 43.4345 12.2489 43.4878 13.12C44.3589 12.2667 45.3989 11.84 46.6078 11.84C47.8345 11.84 48.7945 12.1422 49.4878 12.7467C50.1812 13.3511 50.5278 14.1156 50.5278 15.04C50.5278 15.2889 50.4745 15.76 50.3678 16.4533C49.9589 19.1556 49.7545 20.7289 49.7545 21.1733C49.7545 21.9911 50.0301 22.4 50.5812 22.4C51.7901 22.4 52.7056 21.1378 53.3278 18.6133C53.9323 19.2533 54.2967 19.76 54.4212 20.1333C53.4789 23.2622 51.8434 24.8267 49.5145 24.8267C48.4123 24.8267 47.5945 24.4889 47.0612 23.8133C46.5278 23.1378 46.2612 22.4267 46.2612 21.68ZM59.6626 11.84C60.6404 11.84 61.5382 12 62.356 12.32C62.9071 11.9822 63.4849 11.8133 64.0893 11.8133C64.6937 11.8133 65.1737 11.8933 65.5293 12.0533L64.5693 19.5733C65.8849 18.56 66.8804 17.6356 67.556 16.8L68.3293 18.4267C67.316 19.4933 65.9649 20.6311 64.276 21.84L63.556 27.4133C63.3604 29.0844 62.8093 30.3644 61.9026 31.2533C61.0137 32.16 59.8582 32.6133 58.436 32.6133C57.6182 32.6133 56.8182 32.3467 56.036 31.8133C55.2182 31.2444 54.8093 30.3289 54.8093 29.0667C54.8093 27.52 55.5471 26.1067 57.0226 24.8267C55.7604 24.7378 54.676 24.2133 53.7693 23.2533C52.8626 22.2933 52.4093 21.04 52.4093 19.4933C52.4093 17.1644 53.0937 15.3067 54.4626 13.92C55.8315 12.5333 57.5649 11.84 59.6626 11.84ZM60.0626 13.92C58.9249 13.92 58.0182 14.3556 57.3426 15.2267C56.6849 16.08 56.2937 17.36 56.1693 19.0667C56.1515 19.2267 56.1426 19.3778 56.1426 19.52C56.1426 20.3911 56.3471 21.0844 56.756 21.6C57.1826 22.1156 57.7249 22.3733 58.3826 22.3733C59.5026 22.3733 60.3471 21.5911 60.916 20.0267L61.5826 14.24C61.0315 14.0267 60.5249 13.92 60.0626 13.92ZM56.8626 28.6667C56.8626 29.1467 56.996 29.52 57.2626 29.7867C57.5471 30.0711 57.8671 30.2133 58.2226 30.2133C59.2182 30.2133 59.796 29.5822 59.956 28.32L60.4093 24.32C58.0449 25.7244 56.8626 27.1733 56.8626 28.6667ZM72.8614 10.3733C72.8614 8.47111 73.6881 6.97777 75.3414 5.89333C76.9947 4.80888 78.8969 4.26666 81.0481 4.26666C83.8036 4.26666 86.2214 5.05777 88.3014 6.64C89.3325 7.44 90.1325 8.50666 90.7014 9.84C91.2703 11.1556 91.5547 12.6133 91.5547 14.2133C91.5547 17.36 90.6569 19.92 88.8614 21.8933C86.9947 23.9022 84.6569 24.9067 81.8481 24.9067C81.2258 24.9067 80.5681 24.8267 79.8747 24.6667C79.1814 24.5067 78.6303 24.2933 78.2214 24.0267C77.5636 24.5244 76.7192 24.7733 75.6881 24.7733C74.6747 24.7733 73.8836 24.4889 73.3147 23.92C72.7458 23.3511 72.4614 22.6222 72.4614 21.7333C72.4614 19.6356 74.0525 17.8489 77.2347 16.3733C77.3236 15.6267 77.4481 14.6222 77.6081 13.36C77.7858 12.08 77.9192 11.0489 78.0081 10.2667C78.1147 9.48444 78.1858 8.96888 78.2214 8.72C78.9503 8.25777 79.7947 8.02666 80.7547 8.02666C81.1992 8.02666 81.6258 8.07111 82.0347 8.16L80.3547 19.5467C80.1947 20.56 79.9725 21.4044 79.6881 22.08C80.2392 22.2222 80.6836 22.2933 81.0214 22.2933C83.0658 22.2933 84.6481 21.52 85.7681 19.9733C86.9236 18.3556 87.5014 16.4 87.5014 14.1067C87.5014 11.1733 86.4436 9.06666 84.3281 7.78666C83.1547 7.07555 81.8658 6.72 80.4614 6.72C78.6658 6.72 77.2436 7.20888 76.1947 8.18666C75.5903 8.73777 75.2881 9.40444 75.2881 10.1867C75.2881 10.5956 75.4125 10.9867 75.6614 11.36C75.9103 11.7156 76.3458 11.92 76.9681 11.9733L76.7014 13.7067C75.4036 13.6356 74.4347 13.28 73.7947 12.64C73.1725 11.9822 72.8614 11.2267 72.8614 10.3733ZM74.4347 21.3867C74.4347 22.0267 74.7369 22.3467 75.3414 22.3467C75.5903 22.3467 75.8481 22.1867 76.1147 21.8667C76.3992 21.5289 76.5947 21.0044 76.7014 20.2933L76.9414 18.64C75.2703 19.5822 74.4347 20.4978 74.4347 21.3867ZM97.3451 18.6933C98.4474 18.4622 99.2651 18.0178 99.7985 17.36C100.35 16.7022 100.625 16.0711 100.625 15.4667C100.625 14.8444 100.456 14.4267 100.118 14.2133C99.7985 13.9822 99.4429 13.8667 99.0518 13.8667C98.2162 13.8667 97.4785 14.3378 96.8385 15.28C96.2162 16.2044 95.9051 17.3156 95.9051 18.6133C95.9051 19.8933 96.2074 20.8533 96.8118 21.4933C97.434 22.1156 98.1985 22.4267 99.1051 22.4267C100.438 22.4267 101.718 21.9644 102.945 21.04C104.172 20.1156 105.167 18.9067 105.932 17.4133C106.323 17.7867 106.678 18.2489 106.998 18.8C106.412 20.1333 105.372 21.44 103.878 22.72C103.132 23.3422 102.243 23.8489 101.212 24.24C100.198 24.6311 99.1496 24.8267 98.0651 24.8267C96.2874 24.8267 94.8829 24.2844 93.8518 23.2C92.7496 22.0267 92.1985 20.5244 92.1985 18.6933C92.1985 16.8622 92.8829 15.2622 94.2518 13.8933C95.6385 12.5244 97.2918 11.84 99.2118 11.84C100.581 11.84 101.692 12.1422 102.545 12.7467C103.398 13.3333 103.834 14.1333 103.852 15.1467C103.852 16.5156 103.301 17.6267 102.198 18.48C101.114 19.3333 99.6207 19.9289 97.7185 20.2667L97.3451 18.6933Z" fill="currentColor"/>
        </svg>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full cursor-pointer bg-white dark:bg-white/10">
                    <Plus className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Create Palette</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Palette</DialogTitle>
              <DialogDescription>
                Enter a name for your new color palette.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Palette Name</Label>
                <Input
                  id="name"
                  value={newPaletteName}
                  onChange={(e) => setNewPaletteName(e.target.value)}
                  placeholder="e.g., Brand Colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!newPaletteName.trim()}>
                Create Palette
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="px-2 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 px-3 pl-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-1">
          {palettes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-muted-foreground">
              <p className="text-xs">No palettes yet</p>
              <p className="text-[10px]">Click + to create one</p>
            </div>
          ) : filteredPalettes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-muted-foreground">
              <p className="text-xs">No palettes found</p>
              <p className="text-[10px]">Try a different search term</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={palettes.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5">
                  {filteredPalettes.map((palette) => (
                    <SortablePaletteItem
                      key={palette.id}
                      palette={palette}
                      isActive={activePaletteId === palette.id && viewMode === "palette"}
                      isEditing={editingId === palette.id}
                      editingName={editingName}
                      onSelect={() => {
                        setActivePalette(palette.id);
                        setViewMode("palette");
                      }}
                      onStartEdit={() => startEditing(palette.id, palette.name)}
                      onEditChange={setEditingName}
                      onEditSave={() => handleRename(palette.id)}
                      onEditCancel={() => {
                        setEditingId(null);
                        setEditingName("");
                      }}
                      onDelete={() => deletePalette(palette.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 space-y-0.5 border-t">
        <div
          className={cn(
            "flex h-8 items-center pl-3 pr-1 rounded-lg text-sm transition-colors cursor-pointer",
            (viewMode as string) === "collections"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "hover:bg-sidebar-accent/50"
          )}
          onClick={() => setViewMode("collections" as any)}
        >
          <Workflow className="h-3.5 w-3.5 mr-2 opacity-60" />
          <span className="flex-1 truncate">Collections</span>
        </div>
        <div
          className={cn(
            "flex h-8 items-center pl-3 pr-1 rounded-lg text-sm transition-colors cursor-pointer",
            viewMode === "how-it-works"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "hover:bg-sidebar-accent/50"
          )}
          onClick={() => setViewMode("how-it-works")}
        >
          <HelpCircle className="h-3.5 w-3.5 mr-2 opacity-60" />
          <span className="flex-1 truncate">How it works</span>
        </div>
        <div className="pt-2">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

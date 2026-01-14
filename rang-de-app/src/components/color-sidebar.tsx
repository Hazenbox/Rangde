"use client";

import * as React from "react";
import { Plus, MoreHorizontal, ChevronRight, ChevronDown, HelpCircle, Search, Workflow, GripVertical, X } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePaletteStore } from "@/store/palette-store";
import { useCollectionsStore } from "@/store/collections-store";
import { CollectionNodeDialog } from "@/components/collections/collection-node-dialog";
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
            <DialogTitle>Delete Surface</DialogTitle>
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

  const { selectedNodeId, collectionNodes, getCollection, setSelectedNode } = useCollectionsStore();
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
  const [collectionDialogOpen, setCollectionDialogOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("collections");

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
      <div className="flex h-full w-60 flex-col bg-sidebar-background relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-5 pb-2 h-12">
          <h2 className="text-[14px] font-semibold">Collections</h2>
          
          {activeTab === "collections" && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => setCollectionDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px] px-2 py-1">
                  Create Collection
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="collections" className="flex-1 flex flex-col" onValueChange={setActiveTab}>
          <TabsList className="mx-3 mb-2">
            <TabsTrigger value="collections" className="flex-1 text-[11px]">Collections</TabsTrigger>
            <TabsTrigger value="surfaces" className="flex-1 text-[11px]">Surfaces</TabsTrigger>
          </TabsList>

          {/* Collections Tab */}
          <TabsContent value="collections" className="flex-1 flex flex-col m-0 overflow-hidden">
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background/50"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2">
                {collectionNodes.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-xs text-muted-foreground">No collections yet</p>
                    <Button 
                      size="sm" 
                      className="h-7 text-[11px]"
                      onClick={() => setCollectionDialogOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create Collection
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {collectionNodes
                      .filter(c => !searchQuery.trim() || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(collection => {
                        const isSelected = selectedCollection?.id === collection.id;
                        return (
                          <button
                            key={collection.id}
                            onClick={() => setSelectedNode(collection.id)}
                            className={cn(
                              "w-full text-left px-2 py-2 rounded-md text-xs transition-colors",
                              isSelected 
                                ? "bg-primary/10 text-primary font-medium" 
                                : "hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span>{collection.icon || '📁'}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{collection.name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {collection.variables.length} variables · {collection.modes.length} modes
                                </div>
                              </div>
                              {collection.layer && (
                                <div 
                                  className="px-1 py-0.5 text-[9px] font-semibold rounded"
                                  style={{
                                    backgroundColor: collection.layer === 'primitive' ? '#3b82f620' 
                                      : collection.layer === 'semantic' ? '#8b5cf620'
                                      : '#ec489920',
                                    color: collection.layer === 'primitive' ? '#3b82f6'
                                      : collection.layer === 'semantic' ? '#8b5cf6'
                                      : '#ec4899'
                                  }}
                                >
                                  {collection.layer.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Surfaces Tab */}
          <TabsContent value="surfaces" className="flex-1 flex flex-col m-0 overflow-hidden">
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search surfaces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background/50"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {palettes.length === 0 ? (
              <div className="text-[10px] text-muted-foreground text-center py-4">
                No surfaces available
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
          </TabsContent>
        </Tabs>
        
        {/* Collection Creation Dialog */}
        <CollectionNodeDialog
          open={collectionDialogOpen}
          onOpenChange={setCollectionDialogOpen}
        />
      </div>
    );
  }

  // Render palette mode sidebar
  return (
    <div className="flex h-full w-60 flex-col bg-sidebar-background relative z-10">
      <div className="flex items-center justify-between px-3 pt-5 pb-3 h-14">
        <h2 className="text-[14px] font-semibold">Surfaces</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px] px-2 py-1">
                Create Surface
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Surface</DialogTitle>
              <DialogDescription>
                Enter a name for your new color surface.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Surface Name</Label>
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
                Create Surface
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search surfaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-background/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-1">
          {palettes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-muted-foreground">
              <p className="text-xs">No surfaces yet</p>
              <p className="text-[10px]">Click + to create one</p>
            </div>
          ) : filteredPalettes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-muted-foreground">
              <p className="text-xs">No surfaces found</p>
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
    </div>
  );
}

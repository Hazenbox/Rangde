"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { usePaletteStore } from "@/store/palette-store";
import { useCollectionsStore } from "@/store/collections-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { STEPS } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CollectionPaletteSidebarProps {
  className?: string;
}

export function CollectionPaletteSidebar({ className }: CollectionPaletteSidebarProps) {
  const { palettes, generatedScales, activePaletteId } = usePaletteStore();
  const { selectedNodeId, getCollection, setSelectedNode } = useCollectionsStore();
  const selectedCollection = selectedNodeId ? getCollection(selectedNodeId) : null;
  const [selectedTab, setSelectedTab] = React.useState<'palettes' | 'scales'>('palettes');
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedPalettes, setExpandedPalettes] = React.useState<Set<string>>(
    new Set(palettes.map(p => p.id))
  );

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

  return (
    <div className={cn("w-[200px] bg-sidebar-background flex flex-col", className)}>
      {/* Collection Header (when selected) */}
      {selectedCollection && (
        <div className="border-b px-2 py-1.5 flex items-center justify-between bg-primary/5">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium truncate">
              {selectedCollection.icon} {selectedCollection.name}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 flex-shrink-0"
            onClick={() => setSelectedNode(null)}
            title="Dismiss collection"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="p-2 flex gap-1">
        <button
          className={cn(
            "flex-1 px-2 py-1 text-[11px] font-medium rounded transition-colors",
            selectedTab === 'palettes'
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent"
          )}
          onClick={() => setSelectedTab('palettes')}
        >
          Surfaces
        </button>
        <button
          className={cn(
            "flex-1 px-2 py-1 text-[11px] font-medium rounded transition-colors",
            selectedTab === 'scales'
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent"
          )}
          onClick={() => setSelectedTab('scales')}
        >
          Scales
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-2 py-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="h-6 text-[10px] px-2"
        />
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {selectedTab === 'palettes' ? (
          // Surfaces view
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
                      <span className="text-[11px] font-medium truncate">{palette.name}</span>
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
          </div>
        ) : (
          // Scales view
          <div className="p-2 space-y-1">
            {activePalette && generatedScales ? (
              STEPS.filter(step => {
                if (!activePalette.steps[step] || !generatedScales[step]) return false;
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                return step.toString().includes(query) || 
                       activePalette.name.toLowerCase().includes(query);
              }).map((step) => {
                const stepScales = generatedScales[step];
                if (!stepScales) return null;

                return (
                  <div key={step} className="border rounded overflow-hidden">
                    <div className="px-2 py-1 bg-muted/30">
                      <span className="text-[11px] font-medium">Step {step}</span>
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
              })
            ) : (
              <div className="text-[10px] text-muted-foreground text-center py-4">
                {!activePalette ? 'Select a surface from the main view' : 'No scales generated'}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer hint */}
      <div className="border-t px-2 py-1 bg-muted/20">
        <p className="text-[9px] text-muted-foreground text-center">
          Drag colors onto cells
        </p>
      </div>
    </div>
  );
}

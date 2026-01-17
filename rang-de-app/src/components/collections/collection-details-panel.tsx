"use client";

import * as React from "react";
import { X, Plus, Trash2, Palette as PaletteIcon, Type, AlertTriangle, AlertCircle } from "lucide-react";
import { useCollectionsStore } from "@/store/collections-store";
import { usePaletteStore } from "@/store/palette-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { VariableValue } from "@/types/collections";
import { validateCollectionVariables, getLayerLabel, getLayerColor } from "@/lib/collection-validator";

interface CollectionDetailsPanelProps {
  collectionId: string;
  onClose: () => void;
}

export function CollectionDetailsPanel({ collectionId, onClose }: CollectionDetailsPanelProps) {
  const {
    getCollection,
    addMode,
    deleteMode,
    addVariable,
    deleteVariable,
    setVariableValue,
    getAllVariables,
    collectionNodes,
  } = useCollectionsStore();

  const { palettes } = usePaletteStore();

  const collection = getCollection(collectionId);
  const [newModeName, setNewModeName] = React.useState("");
  const [showModeDialog, setShowModeDialog] = React.useState(false);
  const [newVariableName, setNewVariableName] = React.useState("");
  const [editingCell, setEditingCell] = React.useState<{ variableId: string; modeId: string } | null>(null);
  const [dragOverCell, setDragOverCell] = React.useState<{ variableId: string; modeId: string } | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const variableInputRef = React.useRef<HTMLInputElement>(null);

  // Validate collection - MUST be before early return to satisfy Rules of Hooks
  const validation = React.useMemo(() => {
    if (!collection) return { state: 'valid' as const, errors: [], warnings: [] };
    return validateCollectionVariables(collection, collectionNodes);
  }, [collection, collectionNodes]);

  // Filter variables based on search - MUST be before early return
  const filteredVariables = React.useMemo(() => {
    if (!collection || !searchQuery.trim()) return collection?.variables || [];
    const query = searchQuery.toLowerCase();
    return collection.variables.filter(v => v.name.toLowerCase().includes(query));
  }, [collection, searchQuery]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // Ctrl/Cmd + M: Add mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'm' && !isInputFocused) {
        e.preventDefault();
        setShowModeDialog(true);
      }
      // Ctrl/Cmd + K: Focus variable input (quick add)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        variableInputRef.current?.focus();
      }
      // Ctrl/Cmd + F: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !isInputFocused) {
        e.preventDefault();
        document.getElementById('variable-search')?.focus();
      }
      // Escape: Cancel edit or close panel
      if (e.key === 'Escape') {
        if (editingCell) {
          setEditingCell(null);
        } else if (!isInputFocused) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingCell, onClose]);

  if (!collection) {
    return null;
  }

  const handleAddMode = () => {
    if (newModeName.trim()) {
      addMode(collectionId, newModeName.trim());
      setNewModeName("");
      setShowModeDialog(false);
    }
  };

  const handleAddVariable = () => {
    if (newVariableName.trim()) {
      addVariable(collectionId, newVariableName.trim());
      setNewVariableName("");
      // Keep focus on input for next variable
      setTimeout(() => variableInputRef.current?.focus(), 0);
    }
  };

  const handleCellClick = (variableId: string, modeId: string) => {
    setEditingCell({ variableId, modeId });
  };

  const handleSetColor = (variableId: string, modeId: string, hex: string) => {
    setVariableValue(collectionId, variableId, modeId, { type: 'color', hex });
    setEditingCell(null);
  };

  const handleSetAlias = (variableId: string, modeId: string, aliasRef: string) => {
    // Parse the alias reference: format is "collectionId:variableId" or just "variableId" for same-collection
    const parts = aliasRef.split(':');
    let value: VariableValue;
    
    if (parts.length === 2) {
      // Cross-collection reference
      value = { type: 'alias', collectionId: parts[0], variableId: parts[1] };
    } else {
      // Same-collection reference
      value = { type: 'alias', variableId: aliasRef };
    }
    
    setVariableValue(collectionId, variableId, modeId, value);
    setEditingCell(null);
  };

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent, variableId: string, modeId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragOverCell({ variableId, modeId });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (event: React.DragEvent, variableId: string, modeId: string) => {
    event.preventDefault();
    setDragOverCell(null);

    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      if (data.type === 'color' && data.hex) {
        setVariableValue(collectionId, variableId, modeId, { type: 'color', hex: data.hex });
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error);
    }
  };

  const CellEditor = ({ variableId, modeId, currentValue }: { variableId: string; modeId: string; currentValue: VariableValue }) => {
    const [color, setColor] = React.useState(currentValue.hex || '#000000');
    const [mode, setMode] = React.useState<'color' | 'alias'>(currentValue.type);
    
    // Initialize selectedAlias with proper format
    const initialAlias = currentValue.collectionId && currentValue.variableId
      ? `${currentValue.collectionId}:${currentValue.variableId}`
      : currentValue.variableId || '';
    const [selectedAlias, setSelectedAlias] = React.useState(initialAlias);

    return (
      <div className="absolute z-50 bg-popover border rounded-lg shadow-lg p-2 min-w-[240px]" 
           style={{ top: '100%', left: 0, marginTop: '2px' }}>
        <div className="space-y-2">
          {/* Mode selector - compact tabs */}
          <div className="flex gap-1 border-b pb-2">
            <button
              className={cn(
                "flex-1 px-2 py-1 text-[10px] rounded transition-colors",
                mode === 'color' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              )}
              onClick={() => setMode('color')}
            >
              <PaletteIcon className="h-2.5 w-2.5 inline mr-1" />
              Color
            </button>
            <button
              className={cn(
                "flex-1 px-2 py-1 text-[10px] rounded transition-colors",
                mode === 'alias' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              )}
              onClick={() => setMode('alias')}
            >
              <Type className="h-2.5 w-2.5 inline mr-1" />
              Alias
            </button>
          </div>

          {mode === 'color' ? (
            <div className="space-y-2">
              <div className="flex gap-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-6 rounded border cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 h-6 text-[11px] px-2"
                  placeholder="#000000"
                />
              </div>
              {/* Recent/palette colors */}
              <div>
                <div className="text-[9px] text-muted-foreground mb-1">Quick colors</div>
                <ScrollArea className="h-16">
                  <div className="grid grid-cols-6 gap-1">
                    {palettes.flatMap(palette =>
                      Object.entries(palette.steps).slice(0, 6).map(([step, hex]) => (
                        <button
                          key={`${palette.id}-${step}`}
                          className="w-5 h-5 rounded border hover:ring-1 hover:ring-primary"
                          style={{ backgroundColor: hex }}
                          onClick={() => setColor(hex)}
                          title={`${palette.name} - ${step}`}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-[10px]">Reference variable</Label>
              <select
                value={selectedAlias}
                onChange={(e) => setSelectedAlias(e.target.value)}
                className="w-full px-2 py-1 text-[11px] border rounded bg-background"
              >
                <option value="">Select...</option>
                {/* Group variables by collection */}
                {collectionNodes.map((coll) => (
                  <optgroup key={coll.id} label={`${coll.icon || '📁'} ${coll.name}`}>
                    {coll.variables
                      .filter(v => !(coll.id === collectionId && v.id === variableId))
                      .map((variable) => {
                        const value = coll.id === collectionId 
                          ? variable.id 
                          : `${coll.id}:${variable.id}`;
                        const isCrossCollection = coll.id !== collectionId;
                        return (
                          <option key={`${coll.id}-${variable.id}`} value={value}>
                            {isCrossCollection && '→ '}{variable.name}
                          </option>
                        );
                      })}
                  </optgroup>
                ))}
              </select>
              <div className="text-[9px] text-muted-foreground">
                Cross-collection references marked with →
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-1 justify-end pt-1 border-t">
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={() => setEditingCell(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => {
                if (mode === 'color') {
                  handleSetColor(variableId, modeId, color);
                } else if (selectedAlias) {
                  handleSetAlias(variableId, modeId, selectedAlias);
                }
              }}
              disabled={mode === 'alias' && !selectedAlias}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-[400px] border-l bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-3 py-2 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate">
              {collection.icon} {collection.name}
            </h3>
            {collection.layer && (
              <span
                className="px-1.5 py-0.5 text-[9px] font-semibold rounded"
                style={{
                  backgroundColor: `${getLayerColor(collection.layer)}20`,
                  color: getLayerColor(collection.layer),
                }}
              >
                {getLayerLabel(collection.layer)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {collection.modes.length} modes · {collection.variables.length} variables
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Validation Alerts */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="border-b px-3 py-2 space-y-1">
          {validation.errors.length > 0 && (
            <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive">
              <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-[10px] space-y-0.5">
                <div className="font-semibold">{validation.errors.length} Error(s)</div>
                {validation.errors.slice(0, 3).map((error, idx) => (
                  <div key={idx} className="opacity-90">• {error}</div>
                ))}
                {validation.errors.length > 3 && (
                  <div className="opacity-70">...and {validation.errors.length - 3} more</div>
                )}
              </div>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-[10px] space-y-0.5">
                <div className="font-semibold">{validation.warnings.length} Warning(s)</div>
                {validation.warnings.slice(0, 2).map((warning, idx) => (
                  <div key={idx} className="opacity-90">• {warning}</div>
                ))}
                {validation.warnings.length > 2 && (
                  <div className="opacity-70">...and {validation.warnings.length - 2} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modes bar with search */}
      <div className="border-b px-3 py-2 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-medium text-muted-foreground">Modes:</span>
          {collection.modes.map((mode) => (
            <div
              key={mode.id}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]"
            >
              <span>{mode.name}</span>
              <button
                className="hover:bg-primary/20 rounded p-0.5"
                onClick={() => deleteMode(collectionId, mode.id)}
              >
                <X className="h-2 w-2" />
              </button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[9px] px-1.5"
            onClick={() => setShowModeDialog(true)}
            title="Add Mode (Ctrl+M)"
          >
            <Plus className="h-2.5 w-2.5 mr-0.5" />
            Mode
          </Button>
        </div>
        <Input
          id="variable-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search... (Ctrl+F)"
          className="h-6 text-[10px] px-2"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <table className="w-full">
            <thead className="sticky top-0 bg-muted z-10">
              <tr>
                <th className="text-left px-2 py-1.5 text-[10px] font-medium border-r">
                  Variable
                </th>
                {collection.modes.map((mode) => (
                  <th
                    key={mode.id}
                    className="text-center px-1 py-1.5 text-[10px] font-medium border-r min-w-[100px]"
                  >
                    {mode.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVariables.length === 0 && searchQuery && (
                <tr>
                  <td colSpan={collection.modes.length + 1} className="px-2 py-6 text-center">
                    <div className="text-[10px] text-muted-foreground">
                      No variables found for "{searchQuery}"
                    </div>
                  </td>
                </tr>
              )}
              {filteredVariables.map((variable, idx) => (
                <tr key={variable.id} className={cn("border-b", idx % 2 === 0 && "bg-muted/20")}>
                  <td className="px-2 py-1 border-r">
                    <div className="flex items-center justify-between group">
                      <span className="text-[10px] font-mono truncate">{variable.name}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded p-0.5"
                        onClick={() => deleteVariable(collectionId, variable.id)}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </td>
                  {collection.modes.map((mode) => {
                    const value = variable.valuesByMode[mode.id];
                    const isEditing = editingCell?.variableId === variable.id && editingCell?.modeId === mode.id;
                    const isDragOver = dragOverCell?.variableId === variable.id && dragOverCell?.modeId === mode.id;

                    return (
                      <td key={mode.id} className="px-0.5 py-0.5 border-r relative">
                        <div
                          className={cn(
                            "cursor-pointer hover:bg-accent/50 rounded p-1 min-h-[24px] flex items-center justify-center transition-colors",
                            isDragOver && "bg-primary/20 ring-2 ring-primary"
                          )}
                          onClick={() => handleCellClick(variable.id, mode.id)}
                          onDragOver={(e) => handleDragOver(e, variable.id, mode.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, variable.id, mode.id)}
                        >
                          {value?.type === 'color' ? (
                            <div className="flex items-center gap-1">
                              <div
                                className="w-3 h-3 rounded border"
                                style={{ backgroundColor: value.hex }}
                              />
                              <span className="text-[9px] font-mono">{value.hex}</span>
                            </div>
                          ) : value?.type === 'alias' ? (
                            (() => {
                              // Handle cross-collection or same-collection aliases
                              const isCrossCollection = value.collectionId && value.collectionId !== collectionId;
                              const targetCollection = isCrossCollection 
                                ? collectionNodes.find(c => c.id === value.collectionId)
                                : collection;
                              const targetVariable = targetCollection?.variables.find(v => v.id === value.variableId);
                              
                              return (
                                <div 
                                  className="text-[9px] text-primary truncate"
                                  title={isCrossCollection ? `${targetCollection?.name}/${targetVariable?.name}` : targetVariable?.name}
                                >
                                  → {isCrossCollection && targetCollection ? `${targetCollection.name}/` : ''}{targetVariable?.name || 'Unknown'}
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-[8px] text-muted-foreground">Drop</span>
                          )}
                        </div>
                        {isEditing && value && (
                          <CellEditor
                            variableId={variable.id}
                            modeId={mode.id}
                            currentValue={value}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Inline variable creation row */}
              {!searchQuery && (
                <tr>
                  <td colSpan={collection.modes.length + 1} className="px-2 py-1">
                    <Input
                      ref={variableInputRef}
                      value={newVariableName}
                      onChange={(e) => setNewVariableName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddVariable();
                        if (e.key === 'Escape') setNewVariableName('');
                      }}
                      placeholder="Type name + Enter (Ctrl+K)"
                      className="h-6 text-[10px] font-mono border-dashed"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      {/* Add Mode Dialog */}
      <Dialog open={showModeDialog} onOpenChange={setShowModeDialog}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-base">Add Mode</DialogTitle>
            <DialogDescription className="text-[11px]">
              Add a new mode like Light, Dark, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label htmlFor="mode-name" className="text-[11px]">Mode Name</Label>
            <Input
              id="mode-name"
              value={newModeName}
              onChange={(e) => setNewModeName(e.target.value)}
              placeholder="e.g., Light, Dark"
              onKeyDown={(e) => e.key === 'Enter' && handleAddMode()}
              className="h-8 text-[12px] mt-1"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setShowModeDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-[11px]" onClick={handleAddMode} disabled={!newModeName.trim()}>
              Add Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

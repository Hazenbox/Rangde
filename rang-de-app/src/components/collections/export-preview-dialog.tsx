"use client";

import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Download, HelpCircle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollectionNode, ExportFormat } from "@/types/collections";
import { validateCollectionVariables, getLayerLabel, getLayerColor } from "@/lib/collection-validator";
import { downloadCollectionsExport } from "@/lib/collections-exporter";
import { ExportHelpDialog } from "./export-help-dialog";
import { cn } from "@/lib/utils";

interface ExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: CollectionNode[];
}

export function ExportPreviewDialog({
  open,
  onOpenChange,
  collections,
}: ExportPreviewDialogProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    new Set(collections.map(c => c.id))
  );
  const [exportFormat, setExportFormat] = React.useState<ExportFormat>(ExportFormat.DTCG);
  const [includeAllModes, setIncludeAllModes] = React.useState(false);
  const [includeThemes, setIncludeThemes] = React.useState(true);
  const [resolveAliases, setResolveAliases] = React.useState(false);

  // Reset selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set(collections.map(c => c.id)));
    }
  }, [open, collections]);

  const toggleCollection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    setSelectedIds(new Set(collections.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    const selected = collections.filter(c => selectedIds.has(c.id));
    if (selected.length === 0) return;
    
    const exportCollections = selected.length === 1 ? selected[0] : selected;
    
    downloadCollectionsExport(exportCollections, {
      format: exportFormat,
      resolveAliases: exportFormat === ExportFormat.FIGMA_API ? resolveAliases : undefined,
      includeAllModes: exportFormat === ExportFormat.DTCG ? includeAllModes : undefined,
      includeThemes: exportFormat === ExportFormat.TOKENS_STUDIO ? includeThemes : undefined,
    });
    
    onOpenChange(false);
  };

  const totalVariables = collections
    .filter(c => selectedIds.has(c.id))
    .reduce((sum, c) => sum + c.variables.length, 0);

  const hasErrors = collections.some(c => {
    if (!selectedIds.has(c.id)) return false;
    const validation = validateCollectionVariables(c, collections);
    return validation.errors.length > 0;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
          <DialogTitle>Export Collections</DialogTitle>
          <DialogDescription>
                Select collections to export as design tokens
          </DialogDescription>
            </div>
            <ExportHelpDialog />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick actions */}
          <div className="flex items-center justify-between text-xs">
            <div className="text-muted-foreground">
              {selectedIds.size} of {collections.length} selected · {totalVariables} variables
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="h-6 text-[10px] px-2"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deselectAll}
                className="h-6 text-[10px] px-2"
              >
                Deselect All
              </Button>
            </div>
          </div>

          {/* Collections list */}
          <ScrollArea className="h-[300px] border rounded-md">
            <div className="p-3 space-y-2">
              {collections.map((collection) => {
                const validation = validateCollectionVariables(collection, collections);
                const isSelected = selectedIds.has(collection.id);
                const hasError = validation.errors.length > 0;
                const hasWarning = validation.warnings.length > 0;

                return (
                  <div
                    key={collection.id}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-md border transition-colors",
                      isSelected ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCollection(collection.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {collection.icon} {collection.name}
                        </span>
                        {collection.layer && (
                          <span
                            className="px-1 py-0.5 text-[9px] font-semibold rounded"
                            style={{
                              backgroundColor: `${getLayerColor(collection.layer)}20`,
                              color: getLayerColor(collection.layer),
                            }}
                          >
                            {getLayerLabel(collection.layer)}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {collection.variables.length} variables · {collection.modes.length} modes
                      </div>

                      {isSelected && (hasError || hasWarning) && (
                        <div className="space-y-1 pt-1">
                          {hasError && (
                            <div className="flex items-start gap-1.5 text-[10px] text-destructive">
                              <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              <span>{validation.errors.length} error(s)</span>
                            </div>
                          )}
                          {hasWarning && (
                            <div className="flex items-start gap-1.5 text-[10px] text-amber-600">
                              <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              <span>{validation.warnings.length} warning(s)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!hasError && !hasWarning && isSelected && (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Export options */}
          <div className="space-y-3 pt-2 border-t">
            <div className="text-xs font-medium">Export Format</div>
            
            {/* Format selector */}
            <div className="space-y-2">
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ExportFormat.DTCG}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">DTCG Format</span>
                      <span className="text-[10px] text-muted-foreground">Recommended - Standard design tokens</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={ExportFormat.TOKENS_STUDIO}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Tokens Studio Format</span>
                      <span className="text-[10px] text-muted-foreground">For Tokens Studio plugin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={ExportFormat.FIGMA_API}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Figma API Format</span>
                      <span className="text-[10px] text-muted-foreground">For Export/Import Variables plugin</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Format help text */}
              <div className="p-2 rounded-md bg-muted/50 text-[10px] space-y-1">
                {exportFormat === ExportFormat.DTCG && (
                  <>
                    <div className="font-medium text-foreground">Use with: Figma Design Token Importer plugin</div>
                    <div className="text-muted-foreground">W3C standard format with $type and $value fields. Works with most design token tools.</div>
                    <a 
                      href="https://www.figma.com/community/plugin/888356646278934516/figma-design-token-importer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                    >
                      Install plugin <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </>
                )}
                {exportFormat === ExportFormat.TOKENS_STUDIO && (
                  <>
                    <div className="font-medium text-foreground">Use with: Tokens Studio for Figma plugin</div>
                    <div className="text-muted-foreground">Popular format with theme and mode support. Best for complex design systems.</div>
                    <a 
                      href="https://www.figma.com/community/plugin/843461159747178978/tokens-studio-for-figma"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                    >
                      Install plugin <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </>
                )}
                {exportFormat === ExportFormat.FIGMA_API && (
                  <div className="text-blue-700 dark:text-blue-400">
                    <div className="font-medium flex items-center gap-1">
                      Use with: Export/Import Variables plugin
                    </div>
                    <div className="text-muted-foreground">
                      {selectedIds.size > 1 
                        ? `All ${selectedIds.size} collections will be merged into ONE collection with namespaced variable names (e.g., "Parent/Sand/200", "C1/Idle"). This ensures maximum compatibility and preserves all aliases.`
                        : 'Standard Figma Variables REST API format. Single collection per file.'
                      }
                    </div>
                    {selectedIds.size > 1 && (
                      <div className="text-green-700 dark:text-green-400 text-[10px] mt-1 flex items-start gap-1">
                        <CheckCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span>Single file output: design-tokens-flattened.json</span>
                      </div>
                    )}
                    <a 
                      href="https://www.figma.com/community/plugin/1256972111705530093/export-import-variables"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                    >
                      Install plugin <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            {/* Format-specific options */}
            <div className="space-y-2">
              <div className="text-xs font-medium">Options</div>
              
              {exportFormat === ExportFormat.DTCG && (
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={includeAllModes}
                    onCheckedChange={(checked) => setIncludeAllModes(checked as boolean)}
                    className="mt-0.5"
                  />
                  <div>
                    <div>Export all modes as separate files</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Creates tokens.light.json, tokens.dark.json, etc. for each mode
                    </div>
                  </div>
                </label>
              )}
              
              {exportFormat === ExportFormat.TOKENS_STUDIO && (
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                <Checkbox
                    checked={includeThemes}
                    onCheckedChange={(checked) => setIncludeThemes(checked as boolean)}
                    className="mt-0.5"
                />
                  <div>
                    <div>Include themes ($themes array)</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Creates theme configurations for each mode (recommended)
                    </div>
                  </div>
              </label>
              )}
              
              {exportFormat === ExportFormat.FIGMA_API && selectedIds.size === 1 && (
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                <Checkbox
                    checked={resolveAliases}
                    onCheckedChange={(checked) => setResolveAliases(checked as boolean)}
                    className="mt-0.5"
                />
                  <div>
                    <div>Resolve aliases to direct colors</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Keep UNCHECKED to preserve VARIABLE_ALIAS references (recommended)
                    </div>
                  </div>
              </label>
              )}
              
              {exportFormat === ExportFormat.FIGMA_API && selectedIds.size > 1 && (
                <div className="p-2 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 text-[10px]">
                  <CheckCircle className="h-3 w-3 inline mr-1" />
                  Flattened export automatically preserves all VARIABLE_ALIAS references
                </div>
              )}
            </div>
          </div>

          {/* Error warning */}
          {hasErrors && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold">Collections have validation errors</div>
                <div className="mt-1 opacity-90">
                  Some selected collections contain errors. Fix them before exporting for best results.
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={selectedIds.size === 0}
          >
            <Download className="h-3 w-3 mr-2" />
            Export {selectedIds.size > 0 && `(${selectedIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

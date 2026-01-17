"use client";

import * as React from "react";
import { HelpCircle, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ExportHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" />
          Import Help
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>How to Import into Figma</DialogTitle>
          <DialogDescription>
            Step-by-step guide for importing your design tokens
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="figma-api" className="w-full">
          <TabsList className="grid w-full grid-cols-4 text-[10px]">
            <TabsTrigger value="figma-api">Figma API</TabsTrigger>
            <TabsTrigger value="dtcg">DTCG</TabsTrigger>
            <TabsTrigger value="tokens-studio">Tokens</TabsTrigger>
            <TabsTrigger value="troubleshoot">Help</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {/* Figma API Format Instructions */}
            <TabsContent value="figma-api" className="space-y-4 px-1">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Using Figma API Format</h3>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      1
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium">Install the Plugin</h4>
                      <p className="text-xs text-muted-foreground">
                        Open Figma → Resources (Shift+I) → Plugins → Search for "Export/Import Variables"
                      </p>
                      <a 
                        href="https://www.figma.com/community/plugin/1256972111705530093/export-import-variables"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View plugin page <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      2
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium">Export Your Collections</h4>
                      <p className="text-xs text-muted-foreground">
                        Select "Figma API Format". When exporting <strong>multiple collections</strong>, they will be automatically merged into ONE collection with namespaced variable names.
                      </p>
                      <div className="text-[10px] bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                        Example: "Parent/Sand/200", "C1/Idle", "C2/ghost"
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      3
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium">Import into Figma</h4>
                      <p className="text-xs text-muted-foreground">
                        In Figma: Right-click → Plugins → Export/Import Variables → Import → Select your <strong>design-tokens-flattened.json</strong> file
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        All variables will be created in a single collection. All aliases will be preserved as VARIABLE_ALIAS references.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      4
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium">Verify Import</h4>
                      <p className="text-xs text-muted-foreground">
                        Check the Variables panel (View → Variables). You should see one collection named "Design Tokens (All Collections)" with all your variables and aliases correctly resolved.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <CheckCircle className="h-3.5 w-3.5" />
                    How Flattened Export Works
                  </div>
                  <ul className="text-[10px] space-y-0.5 ml-5 list-disc">
                    <li>All collections are merged into ONE collection automatically</li>
                    <li>Variable names are prefixed with their collection name</li>
                    <li>All VARIABLE_ALIAS references are preserved and remapped</li>
                    <li>Single file output: design-tokens-flattened.json</li>
                    <li>Import once - all variables created in single collection</li>
                    <li>100% import compatibility guaranteed</li>
                  </ul>
                </div>

                <div className="p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <CheckCircle className="h-3.5 w-3.5" />
                    What's Supported
                  </div>
                  <ul className="text-[10px] space-y-0.5 ml-5 list-disc">
                    <li>All Figma variable types (color, number, string, boolean)</li>
                    <li>Multiple modes per collection</li>
                    <li>Variable aliases and references</li>
                    <li>Cross-collection dependencies</li>
                    <li>Scopes and code syntax</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* DTCG Format Instructions */}
            <TabsContent value="dtcg" className="space-y-4 px-1">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Using DTCG Format (Recommended)</h3>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      1
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium">Install the Plugin</h4>
                      <p className="text-xs text-muted-foreground">
                        Open Figma → Resources (Shift+I) → Plugins → Search for "Figma Design Token Importer"
                      </p>
                      <a 
                        href="https://www.figma.com/community/plugin/888356646278934516/figma-design-token-importer"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View plugin page <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      2
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium">Export Your Collections</h4>
                      <p className="text-xs text-muted-foreground">
                        Select "DTCG Format" in the export dialog and download your tokens.json file(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      3
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium">Import into Figma</h4>
                      <p className="text-xs text-muted-foreground">
                        In Figma: Right-click → Plugins → Figma Design Token Importer → Load your JSON file
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      4
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium">Verify Import</h4>
                      <p className="text-xs text-muted-foreground">
                        Check your variables in the Variables panel (View → Variables) or Assets panel
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <CheckCircle className="h-3.5 w-3.5" />
                    What's Supported
                  </div>
                  <ul className="text-[10px] space-y-0.5 ml-5 list-disc">
                    <li>Color tokens with hex values</li>
                    <li>Alias references between tokens</li>
                    <li>Nested token groups</li>
                    <li>Multiple modes (light/dark)</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Tokens Studio Format Instructions */}
            <TabsContent value="tokens-studio" className="space-y-4 px-1">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Using Tokens Studio Format</h3>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      1
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium">Install Tokens Studio Plugin</h4>
                      <p className="text-xs text-muted-foreground">
                        Open Figma → Resources (Shift+I) → Plugins → Search for "Tokens Studio for Figma"
                      </p>
                      <a 
                        href="https://www.figma.com/community/plugin/843461159747178978/tokens-studio-for-figma"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View plugin page <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      2
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium">Export Your Collections</h4>
                      <p className="text-xs text-muted-foreground">
                        Select "Tokens Studio Format" in the export dialog and download the tokens file
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      3
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium">Import into Figma</h4>
                      <p className="text-xs text-muted-foreground">
                        Run Tokens Studio plugin → Settings → Import → Select your JSON file
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      4
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-sm font-medium">Apply Themes</h4>
                      <p className="text-xs text-muted-foreground">
                        Use the themes ($themes) to switch between light/dark modes in the plugin
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Advanced Features
                  </div>
                  <ul className="text-[10px] space-y-0.5 ml-5 list-disc">
                    <li>Theme management with $themes array</li>
                    <li>Token set organization</li>
                    <li>Cross-collection references</li>
                    <li>Layer-based token structure</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Troubleshooting */}
            <TabsContent value="troubleshoot" className="space-y-4 px-1">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Common Issues & Solutions</h3>
                
                <div className="space-y-3">
                  <div className="p-3 rounded-md border bg-card">
                    <h4 className="text-xs font-medium mb-1 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      "Unable to import" error
                    </h4>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      This usually means you're using the wrong format or importing without a plugin.
                    </p>
                    <div className="text-[10px] space-y-1">
                      <p className="font-medium">Solutions:</p>
                      <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
                        <li>Make sure you selected DTCG or Tokens Studio format (NOT Figma API)</li>
                        <li>Install the correct plugin for your chosen format</li>
                        <li>Don't use File → Import (use the plugin instead)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 rounded-md border bg-card">
                    <h4 className="text-xs font-medium mb-1 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      Aliases not working
                    </h4>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Token references show as black or broken colors.
                    </p>
                    <div className="text-[10px] space-y-1">
                      <p className="font-medium">Solutions:</p>
                      <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
                        <li>Export all related collections together (not separately)</li>
                        <li>Ensure referenced tokens are defined before they're used</li>
                        <li>Check that token names match exactly (case-sensitive)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 rounded-md border bg-card">
                    <h4 className="text-xs font-medium mb-1 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      Modes/themes missing
                    </h4>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Only one mode appears after import.
                    </p>
                    <div className="text-[10px] space-y-1">
                      <p className="font-medium">Solutions:</p>
                      <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
                        <li>For DTCG: Enable "Export all modes as separate files"</li>
                        <li>For Tokens Studio: Keep "Include themes" checked</li>
                        <li>Import each mode file separately if using multi-file export</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 rounded-md border bg-card">
                    <h4 className="text-xs font-medium mb-1 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      Plugin not found
                    </h4>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Can't find the import plugin in Figma.
                    </p>
                    <div className="text-[10px] space-y-1">
                      <p className="font-medium">Solutions:</p>
                      <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
                        <li>Use Resources panel (Shift+I) instead of right-click menu</li>
                        <li>Make sure you're logged into Figma</li>
                        <li>Check you have edit access to the file</li>
                        <li>Try reinstalling the plugin</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-muted">
                  <p className="text-[10px] text-muted-foreground">
                    <span className="font-medium">Still having issues?</span> Make sure you're using the latest version 
                    of Figma and the plugins. The DTCG format is the most reliable and widely supported.
                  </p>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import Image from "next/image";
import { Palette, Workflow, HelpCircle, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { AISettingsPanel } from "@/components/settings/ai-settings-panel";
import { usePaletteStore } from "@/store/palette-store";
import { cn } from "@/lib/utils";

export function NavigationRail() {
  const { viewMode, setViewMode } = usePaletteStore();
  const [aiSettingsOpen, setAISettingsOpen] = React.useState(false);

  const navItems = [
    {
      id: "palette",
      label: "Surfaces",
      icon: Palette,
      onClick: () => setViewMode("palette"),
    },
    {
      id: "collections",
      label: "Collections",
      icon: Workflow,
      onClick: () => setViewMode("collections"),
    },
    {
      id: "how-it-works",
      label: "How It Works",
      icon: HelpCircle,
      onClick: () => setViewMode("how-it-works"),
    },
  ] as const;

  return (
    <div className="flex w-[72px] flex-col items-center border-r border-border/30 bg-sidebar-background pt-4 pb-6 gap-4 z-20 h-full">
      {/* App Logo */}
      <div className="flex h-auto w-full items-center justify-center mb-2 px-[14px]">
        <Image
          src="/logo-vertical.svg"
          alt="Rang De"
          width={26}
          height={19}
          className="w-auto h-auto"
          priority
        />
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col justify-start items-center gap-3 w-full px-2">
        {navItems.map((item) => {
          const isActive = viewMode === item.id;
          return (
            <div
              key={item.id}
              className="flex flex-col items-center gap-1.5 cursor-pointer"
              onClick={item.onClick}
            >
              <div
                className={cn(
                  "w-[52px] h-[30px] rounded-full flex items-center justify-center transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive && "text-foreground")} />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-none tracking-tight text-center transition-colors duration-200",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center justify-end gap-2 w-full px-2 pb-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => setAISettingsOpen(true)}
          title="AI Settings"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
        <ThemeToggle />
      </div>

      {/* AI Settings Dialog */}
      <Dialog open={aiSettingsOpen} onOpenChange={setAISettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <AISettingsPanel />
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import * as React from "react";
import { Palette, Workflow, HelpCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePaletteStore } from "@/store/palette-store";
import { cn } from "@/lib/utils";

export function NavigationRail() {
  const { viewMode, setViewMode } = usePaletteStore();

  const navItems = [
    {
      id: "palette",
      label: "Palettes",
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
    <div className="flex w-20 flex-col items-center border-r bg-sidebar-background py-6 gap-4 z-20 h-full">
      {/* App Logo */}
      <div className="flex h-10 w-10 items-center justify-center mb-2">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-muted-foreground/40 hover:text-foreground transition-colors duration-300"
        >
          <path
            d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col justify-center items-center gap-4 w-full px-2">
        {navItems.map((item) => {
          const isActive = viewMode === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "h-auto w-14 py-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              onClick={item.onClick}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-foreground")} />
              <span className="text-[10px] font-medium leading-none tracking-tight">
                {item.label}
              </span>
            </Button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center justify-end gap-2 w-full px-2 pb-2">
        <ThemeToggle />
      </div>
    </div>
  );
}

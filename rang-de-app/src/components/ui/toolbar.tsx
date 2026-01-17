"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

interface ToolbarProps {
  children: React.ReactNode;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  className?: string;
}

export function Toolbar({ children, position = "top-right", className }: ToolbarProps) {
  const positionClasses = {
    "top-left": "top-3 left-3",
    "top-right": "top-3 right-3",
    "bottom-left": "bottom-3 left-3",
    "bottom-right": "bottom-3 right-3",
  };

  return (
    <div
      className={cn(
        "absolute z-10 flex items-center",
        positionClasses[position],
        DESIGN_TOKENS.toolbar.shape,
        DESIGN_TOKENS.toolbar.padding,
        DESIGN_TOKENS.toolbar.gap,
        DESIGN_TOKENS.toolbar.background,
        DESIGN_TOKENS.toolbar.border,
        DESIGN_TOKENS.toolbar.shadow,
        className
      )}
    >
      {children}
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
}

export function ToolbarButton({ icon, onClick, disabled, tooltip, className }: ToolbarButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        DESIGN_TOKENS.toolbar.button.size,
        DESIGN_TOKENS.toolbar.button.shape,
        "p-0",
        className
      )}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
    >
      {icon}
    </Button>
  );
}

interface ToolbarDividerProps {
  className?: string;
}

export function ToolbarDivider({ className }: ToolbarDividerProps) {
  return <div className={cn("w-px h-5 bg-border", className)} />;
}

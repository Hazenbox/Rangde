"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

interface MainHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function MainHeader({ title, subtitle, actions, className }: MainHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between flex-shrink-0",
        DESIGN_TOKENS.main.header.padding,
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div>
          <h2
            className={cn(
              DESIGN_TOKENS.main.header.titleSize,
              DESIGN_TOKENS.main.header.titleWeight
            )}
          >
            {title}
          </h2>
          {subtitle && (
            <p className={cn(DESIGN_TOKENS.typography.caption, "text-muted-foreground mt-0.5")}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

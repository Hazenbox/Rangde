"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Get click position for ripple origin
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    const newTheme = theme === "dark" ? "light" : "dark";
    
    // Change theme immediately so the ripple shows the new theme color
    setTheme(newTheme);
    
    // Trigger ripple animation
    if (typeof window !== "undefined" && (window as any).triggerThemeRipple) {
      (window as any).triggerThemeRipple(x, y, newTheme);
    }
  };

  if (!mounted) {
    return (
      <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full cursor-pointer bg-white dark:bg-white/10" disabled>
        <Sun className="h-3.5 w-3.5 opacity-60" />
      </Button>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 rounded-full cursor-pointer bg-white dark:bg-white/10"
            onClick={handleThemeToggle}
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5 opacity-60" />
            ) : (
              <Moon className="h-3.5 w-3.5 opacity-60" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{theme === "dark" ? "Light Mode" : "Dark Mode"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

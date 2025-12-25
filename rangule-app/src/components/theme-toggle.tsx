"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full cursor-pointer" disabled>
        <Sun className="h-3.5 w-3.5 opacity-60" />
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      className="h-7 w-7 rounded-full cursor-pointer"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-3.5 w-3.5 opacity-60" />
      ) : (
        <Moon className="h-3.5 w-3.5 opacity-60" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

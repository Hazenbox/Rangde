"use client";

import * as React from "react";
import { Palette } from "lucide-react";
import { ColorSidebar } from "@/components/color-sidebar";
import { ScalePreview } from "@/components/scale-preview";
import { HowItWorks } from "@/components/how-it-works";
import { usePaletteStore } from "@/store/palette-store";

export default function Home() {
  const { activePaletteId, regenerateScales, viewMode } = usePaletteStore();
  const [mounted, setMounted] = React.useState(false);

  // Ensure hydration is complete before rendering
  React.useEffect(() => {
    setMounted(true);
    // Regenerate scales on mount in case we have stored palettes
    regenerateScales();
  }, [regenerateScales]);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Palette className="h-6 w-6 animate-pulse" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <ColorSidebar />

      {/* Main area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {viewMode === "how-it-works" ? (
          <HowItWorks />
        ) : activePaletteId ? (
          <ScalePreview />
        ) : (
          <div className="flex flex-1 items-center justify-center text-center">
            <div className="max-w-md space-y-4">
              <Palette className="mx-auto h-16 w-16 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold">Welcome to Rangule</h2>
              <p className="text-muted-foreground">
                Create a new palette from the sidebar to get started. Define your
                base colors (steps 200-2500) and we&apos;ll automatically generate
                accessible color scales.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

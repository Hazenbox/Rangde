"use client";

import * as React from "react";
import { Layers, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  onCreateCollection: () => void;
}

export function CollectionsEmptyState({ onCreateCollection }: EmptyStateProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="text-center space-y-6 max-w-2xl px-4 pointer-events-auto">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <Layers className="h-16 w-16 text-muted-foreground/50" />
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">Build a Three-Layer Token System</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create a scalable design token architecture following Figma Variables best practices
          </p>
        </div>

        {/* Three Layer Visualization */}
        <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
          {/* Primitive */}
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-blue-500" />
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm text-blue-500">Primitive</div>
              <div className="text-xs text-muted-foreground mt-1">
                Base colors<br/>#FF0000
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
          </div>

          {/* Semantic */}
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-purple-500" />
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm text-purple-500">Semantic</div>
              <div className="text-xs text-muted-foreground mt-1">
                Intent-based<br/>danger, success
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center col-start-2">
            <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
          </div>

          {/* Theme */}
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-pink-500" />
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm text-pink-500">Theme</div>
              <div className="text-xs text-muted-foreground mt-1">
                Brand-specific<br/>button-primary
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground max-w-xl mx-auto pt-4">
          <div className="space-y-1">
            <div className="font-semibold text-foreground">✓ Validated</div>
            <div>Layer rules enforced automatically</div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-foreground">✓ Visual</div>
            <div>See dependencies at a glance</div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-foreground">✓ Exportable</div>
            <div>Figma-ready JSON format</div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-3 justify-center pt-4">
          <Button size="lg" onClick={onCreateCollection}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Collection
          </Button>
        </div>

        {/* Hint */}
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Tip:</span> Start with a Primitive collection containing your base colors
        </div>
      </div>
    </div>
  );
}

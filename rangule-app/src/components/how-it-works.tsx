"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

const SCALE_DATA = [
  {
    name: "Surface",
    contrastTarget: "N/A",
    logic: "The base color for each step. All other scales are calculated relative to this surface color.",
    example: "Step 2400 surface = #e8eaff",
  },
  {
    name: "High",
    contrastTarget: "Maximum available",
    logic: "Uses the contrasting color at 100% opacity. Light surface → step 200 (darkest). Dark surface → step 2500 (lightest).",
    example: "On light surface, uses darkest palette color",
  },
  {
    name: "Medium",
    contrastTarget: "Between High and Low",
    logic: "Contrasting color with alpha = midpoint between 1.0 and Low's alpha. Formula: alpha = (1.0 + Low_alpha) / 2",
    example: "If Low alpha = 0.55, Medium alpha = 0.775",
  },
  {
    name: "Low",
    contrastTarget: "4.5:1 (WCAG AA)",
    logic: "Contrasting color with transparency calculated to achieve exactly 4.5:1 contrast ratio against the surface.",
    example: "Alpha adjusted until contrast = 4.5:1",
  },
  {
    name: "Bold",
    contrastTarget: "≥ 3.0:1",
    logic: "Starts at base step. If contrast < 3.0:1, moves toward contrasting color until ≥ 3.0:1 is achieved.",
    example: "Step 2100 → may use step 1000 if needed",
  },
  {
    name: "Bold A11Y",
    contrastTarget: "≥ 4.5:1",
    logic: "Starts at base step. If contrast < 4.5:1, moves toward contrasting color until ≥ 4.5:1 is achieved.",
    example: "Step 2100 → may use step 800 if needed",
  },
  {
    name: "Heavy",
    contrastTarget: "Varies",
    logic: "Dark CC: Midpoint between Bold step and step 200, capped at 800. Light CC: Same as BoldA11Y (or step 2500 if >3 steps away).",
    example: "Bold=1200 → Heavy=(1200+200)/2=700",
  },
  {
    name: "Minimal",
    contrastTarget: "Low contrast (decorative)",
    logic: "Exactly 2 steps away from surface. Dark CC: surface - 200. Light CC: surface + 200.",
    example: "Surface 2400 → Minimal 2200",
  },
];

const WCAG_DATA = [
  {
    type: "Normal Text",
    level: "AA",
    ratio: "≥ 4.5:1",
    description: "Text smaller than 18pt (or 14pt bold)",
  },
  {
    type: "Normal Text",
    level: "AAA",
    ratio: "≥ 7.0:1",
    description: "Enhanced contrast for better readability",
  },
  {
    type: "Large Text",
    level: "AA",
    ratio: "≥ 3.0:1",
    description: "Text 18pt+ (or 14pt+ bold)",
  },
  {
    type: "Large Text",
    level: "AAA",
    ratio: "≥ 4.5:1",
    description: "Enhanced contrast for large text",
  },
  {
    type: "Graphics/UI",
    level: "AA",
    ratio: "≥ 3.0:1",
    description: "Icons, borders, form controls, focus indicators",
  },
];

const TERMINOLOGY_DATA = [
  {
    term: "Surface",
    definition: "The background color on which other colors are placed.",
  },
  {
    term: "Contrasting Color (CC)",
    definition: "The color used for text/elements on a surface. Dark surfaces need light CC, light surfaces need dark CC.",
  },
  {
    term: "Dark CC",
    definition: "When surface is light, the contrasting color is dark (toward step 200).",
  },
  {
    term: "Light CC",
    definition: "When surface is dark, the contrasting color is light (toward step 2500).",
  },
  {
    term: "Step",
    definition: "A position in the color scale (200-2500). Lower numbers are lighter, higher numbers are darker.",
  },
  {
    term: "Alpha",
    definition: "Transparency value (0-1). Used to blend contrasting color with surface for specific contrast ratios.",
  },
];

export function HowItWorks() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">Color Scale Logic</h2>
          <p className="text-xs text-muted-foreground">
            How each scale is generated based on WCAG accessibility guidelines
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-8">
          {/* Scale Logic Table */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Scale Generation Rules</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-semibold">Scale</th>
                    <th className="px-3 py-2 text-left font-semibold">Target</th>
                    <th className="px-3 py-2 text-left font-semibold">Logic</th>
                    <th className="px-3 py-2 text-left font-semibold">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {SCALE_DATA.map((scale, index) => (
                    <tr 
                      key={scale.name} 
                      className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
                    >
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{scale.name}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">{scale.contrastTarget}</td>
                      <td className="px-3 py-2 text-muted-foreground max-w-xs">{scale.logic}</td>
                      <td className="px-3 py-2 text-muted-foreground text-[10px] font-mono">{scale.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* WCAG Requirements Table */}
          <section>
            <h3 className="text-sm font-semibold mb-3">WCAG 2.1 Contrast Requirements</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-semibold">Content Type</th>
                    <th className="px-3 py-2 text-left font-semibold">Level</th>
                    <th className="px-3 py-2 text-left font-semibold">Ratio</th>
                    <th className="px-3 py-2 text-left font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {WCAG_DATA.map((item, index) => (
                    <tr 
                      key={`${item.type}-${item.level}`} 
                      className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
                    >
                      <td className="px-3 py-2 font-medium">{item.type}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          item.level === "AA" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>
                          {item.level}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">{item.ratio}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Terminology Table */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Terminology</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-semibold w-40">Term</th>
                    <th className="px-3 py-2 text-left font-semibold">Definition</th>
                  </tr>
                </thead>
                <tbody>
                  {TERMINOLOGY_DATA.map((item, index) => (
                    <tr 
                      key={item.term} 
                      className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
                    >
                      <td className="px-3 py-2 font-medium">{item.term}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.definition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Quick Reference */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Quick Reference</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold">Light Surface (e.g., step 2400)</h4>
                <ul className="text-[11px] text-muted-foreground space-y-1">
                  <li>• Contrasting color: Dark (step 200)</li>
                  <li>• Bold/BoldA11Y: Move toward step 200</li>
                  <li>• Minimal: Surface - 200</li>
                </ul>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold">Dark Surface (e.g., step 400)</h4>
                <ul className="text-[11px] text-muted-foreground space-y-1">
                  <li>• Contrasting color: Light (step 2500)</li>
                  <li>• Bold/BoldA11Y: Move toward step 2500</li>
                  <li>• Minimal: Surface + 200</li>
                </ul>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold">Alpha Blending</h4>
                <ul className="text-[11px] text-muted-foreground space-y-1">
                  <li>• Low: Alpha for 4.5:1 contrast</li>
                  <li>• Medium: (1.0 + Low_alpha) / 2</li>
                  <li>• High: Always 1.0 (100%)</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

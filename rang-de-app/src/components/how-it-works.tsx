"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Copy, Check, Search } from "lucide-react";
import { oklchToHex } from "@/lib/color-utils";
import colorPalettesData from "@/lib/color-palettes.json";

const SCALE_DATA = [
  {
    name: "Surface",
    contrastTarget: "N/A",
    logic: [
      "The base background color for each step in the palette",
      "All other scales are calculated relative to this surface color",
      "Determines whether dark or light contrasting color is needed",
    ],
    exampleLight: "Surface 2400 = #f3f4ff (light purple background)",
    exampleDark: "Surface 200 = #0b0034 (dark indigo background)",
  },
  {
    name: "High",
    contrastTarget: "Maximum",
    logic: [
      "Uses the contrasting color at 100% opacity (no transparency)",
      "Light surface → uses step 200 (darkest color in palette)",
      "Dark surface → uses step 2500 (lightest color in palette)",
      "Provides maximum contrast for primary text and important elements",
    ],
    exampleLight: "Surface 2400 (light) → High = step 200 (#0b0034)",
    exampleDark: "Surface 200 (dark) → High = step 2500 (#ffffff)",
  },
  {
    name: "Medium",
    contrastTarget: "Between High & Low",
    logic: [
      "Uses the same contrasting color as High, but with reduced opacity",
      "Alpha = midpoint between 1.0 (High) and Low's alpha",
      "Formula: alpha = round((1.0 + Low_alpha) / 2)",
      "Provides moderate contrast for secondary text",
    ],
    exampleLight: "Surface 2400, Low alpha=0.56 → Medium = step 200 at 78% opacity",
    exampleDark: "Surface 200, Low alpha=0.55 → Medium = step 2500 at 77% opacity",
  },
  {
    name: "Low",
    contrastTarget: "≥ 4.5:1",
    logic: [
      "Uses the High contrasting color (step 200 or 2500)",
      "Starts at 1% opacity and increases until contrast ≥ 4.5:1",
      "Finds the lowest integer percentage (e.g., 57% -> 4.49 fail, 58% -> 4.51 pass)",
      "If full opacity contrast < 4.5:1, searches for a palette step instead",
    ],
    exampleLight: "Surface 2400 → Low = step 200 at 56% opacity (4.5:1 contrast)",
    exampleDark: "Surface 200 → Low = step 2500 at 55% opacity (4.5:1 contrast)",
  },
  {
    name: "Bold",
    contrastTarget: "≥ 3.0:1",
    logic: [
      "Starts from the user-selected base step (e.g., 600)",
      "Checks if contrast ratio against surface is ≥ 3.0:1",
      "If contrast fails, moves toward the contrasting color step by step",
      "Continues until finding a step with ≥ 3.0:1 contrast",
      "Suitable for large text (18pt+) and UI components",
    ],
    exampleLight: "Base 600, Surface 2400 → 600 passes (3.2:1) → Bold = 600",
    exampleDark: "Base 600, Surface 200 → 600 fails (1.67:1) → 700, 800, 900 fail → 1000 passes (3.51:1)",
  },
  {
    name: "Bold A11Y",
    contrastTarget: "≥ 4.5:1",
    logic: [
      "Starts from the user-selected base step (e.g., 600)",
      "Checks if contrast ratio against surface is ≥ 4.5:1",
      "If contrast fails, moves toward the contrasting color step by step",
      "Continues until finding a step with ≥ 4.5:1 contrast",
      "Ensures WCAG AA compliance for normal text",
    ],
    exampleLight: "Base 600, Surface 2400 → 600 fails (2.1:1) → 500, 400, 300... → step 200 passes (4.5:1)",
    exampleDark: "Base 600, Surface 200 → 600 fails (1.67:1) → 700, 800, 900... → step 1200 passes (4.79:1)",
  },
  {
    name: "Heavy",
    contrastTarget: "High contrast",
    logic: [
      "Dark CC (light surface): Midpoint between Bold step and step 200",
      "Capped at step 800 (never goes above 800)",
      "Light CC (dark surface): Same as BoldA11Y",
      "Exception: If BoldA11Y is >3 steps away from surface, uses step 2500",
    ],
    exampleLight: "Surface 2400, Bold=600 → Heavy = (600 + 200) / 2 = 400",
    exampleDark: "Surface 200, BoldA11Y=1200 → Heavy = 1200 (same as BoldA11Y)",
  },
  {
    name: "Minimal",
    contrastTarget: "Low (decorative)",
    logic: [
      "Provides subtle, low-contrast color for decorative elements",
      "Dark CC (High = 200): Subtract 200 from surface (e.g., 1500 → 1300)",
      "Light CC (High = 2500): Add 200 to surface (e.g., 400 → 600)",
      "Always moves away from the contrasting color by 2 steps",
      "Not intended for text; use for borders, dividers, backgrounds",
    ],
    exampleLight: "Surface 2400 (CC=200) → Minimal = 2200 (2400 - 200)",
    exampleDark: "Surface 200 (CC=2500) → Minimal = 400 (200 + 200)",
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
    definition: "The background color on which other colors are placed. Each step (200-2500) can be used as a surface.",
  },
  {
    term: "Contrasting Color (CC)",
    definition: "The color used for text/elements on a surface. Automatically determined based on surface lightness.",
  },
  {
    term: "Dark CC",
    definition: "When surface is light (contrast vs white < 4.5:1), uses dark colors (toward step 200) for contrast.",
  },
  {
    term: "Light CC",
    definition: "When surface is dark (contrast vs white ≥ 4.5:1), uses light colors (toward step 2500) for contrast.",
  },
  {
    term: "Base Step",
    definition: "User-selected step (default: 600) used as starting point for Bold calculation. Set via the Base dropdown.",
  },
  {
    term: "Step",
    definition: "A position in the color scale (200-2500). Step 200 is darkest, step 2500 is lightest.",
  },
  {
    term: "Alpha",
    definition: "Transparency value (0-1). Used to blend contrasting color with surface to achieve specific contrast ratios.",
  },
  {
    term: "Contrast Ratio",
    definition: "WCAG measure of luminance difference between two colors. Higher ratios = better readability.",
  },
  {
    term: "Truncation (Floor)",
    definition: "The rounding method used for contrast checks. Ratios are always cut off at 2 decimal places (e.g. 4.499 becomes 4.49) to ensure strict compliance.",
  },
];

const REJECTED_BOLD_A11Y_DATA = [
  { palette: "Cobalt", surface: 500, rejected: 1400, contrast: "4.49", chosen: 1500 },
  { palette: "Teal", surface: 1600, rejected: 600, contrast: "4.49", chosen: 500 },
  { palette: "Emerald", surface: 800, rejected: 2000, contrast: "4.49", chosen: 2100 },
  { palette: "Grey", surface: 400, rejected: 1300, contrast: "4.49", chosen: 1400 },
  { palette: "Grey", surface: 1300, rejected: 400, contrast: "4.49", chosen: 300 },
  { palette: "Gold (Fin)", surface: 800, rejected: 2000, contrast: "4.49", chosen: 2100 },
  { palette: "Rose Gold", surface: 700, rejected: 1800, contrast: "4.49", chosen: 1900 },
  { palette: "Tulip", surface: 1100, rejected: 2400, contrast: "4.45", chosen: 2500 },
  { palette: "Rose", surface: 1400, rejected: 400, contrast: "4.47", chosen: 300 },
  { palette: "Indigo", surface: 700, rejected: 1700, contrast: "4.46", chosen: 1800 },
];

export function HowItWorks() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [copiedValues, setCopiedValues] = React.useState<Record<string, boolean>>({});

  const handleCopy = async (value: string, key: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedValues({ ...copiedValues, [key]: true });
      setTimeout(() => {
        setCopiedValues({ ...copiedValues, [key]: false });
      }, 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h2 className="font-semibold">How It Works</h2>
        </div>
      </div>

      <Tabs defaultValue="logic" className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b flex items-end -mt-px">
          <TabsList className="h-10 w-auto bg-transparent p-0 gap-1">
            <TabsTrigger
              value="logic"
              className="text-xs px-3 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
            >
              Logic
            </TabsTrigger>
            <TabsTrigger
              value="colors"
              className="text-xs px-3 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
            >
              Color Source
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="text-xs px-3 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
            >
              Rejected Bold A11Y
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="logic" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-8">
              {/* Scale Logic Table */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Scale Generation Rules</h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap w-28">Scale</th>
                        <th className="px-3 py-2 text-left font-semibold w-[55%]">Logic</th>
                        <th className="px-3 py-2 text-left font-semibold w-[30%]">Examples</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SCALE_DATA.map((scale, index) => (
                        <tr
                          key={scale.name}
                          className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
                        >
                          <td className="px-3 py-2 align-top">
                            <div className="font-medium">{scale.name}</div>
                            <div className="text-[10px] text-muted-foreground font-normal">({scale.contrastTarget})</div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground align-top">
                            <ul className="space-y-0.5">
                              {scale.logic.map((item, i) => (
                                <li key={i} className="flex gap-1.5">
                                  <span className="text-muted-foreground/50">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground align-top">
                            <div className="space-y-1">
                              <div><span className="text-foreground/70">Light:</span> {scale.exampleLight}</div>
                              <div><span className="text-foreground/70">Dark:</span> {scale.exampleDark}</div>
                            </div>
                          </td>
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
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${item.level === "AA"
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
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-3 space-y-2">
                    <h4 className="text-xs font-semibold">Light Surface (e.g., step 2400)</h4>
                    <ul className="text-[11px] text-muted-foreground space-y-1">
                      <li>• Contrast vs white &lt; 4.5:1</li>
                      <li>• Contrasting color: Dark (step 200)</li>
                      <li>• Bold: Base step → move toward 200 until ≥ 3.0:1</li>
                      <li>• BoldA11Y: Base step → move toward 200 until ≥ 4.5:1</li>
                      <li>• Heavy: Midpoint(Bold, 200), capped at 800</li>
                      <li>• Minimal: Surface - 200 (e.g., 2400 → 2200)</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border p-3 space-y-2">
                    <h4 className="text-xs font-semibold">Dark Surface (e.g., step 400)</h4>
                    <ul className="text-[11px] text-muted-foreground space-y-1">
                      <li>• Contrast vs white ≥ 4.5:1</li>
                      <li>• Contrasting color: Light (step 2500)</li>
                      <li>• Bold: Base step → move toward 2500 until ≥ 3.0:1</li>
                      <li>• BoldA11Y: Base step → move toward 2500 until ≥ 4.5:1</li>
                      <li>• Heavy: Same as BoldA11Y (or 2500 if &gt;3 steps away)</li>
                      <li>• Minimal: Surface + 200 (e.g., 400 → 600)</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border p-3 space-y-2">
                    <h4 className="text-xs font-semibold">Alpha Blending (High/Medium/Low)</h4>
                    <ul className="text-[11px] text-muted-foreground space-y-1">
                      <li>• High: 100% opacity (alpha = 1.0)</li>
                      <li>• Low: Minimum alpha for 4.5:1 contrast</li>
                      <li>• Medium: floor((1.0 + Low_alpha) / 2)</li>
                      <li>• All use the same contrasting color (step 200 or 2500)</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border p-3 space-y-2">
                    <h4 className="text-xs font-semibold">Minimal Step Mapping</h4>
                    <ul className="text-[11px] text-muted-foreground space-y-1">
                      <li>• Dark CC (High = 200): Surface - 200 (e.g., 1500→1300)</li>
                      <li>• Light CC (High = 2500): Surface + 200 (e.g., 400→600)</li>
                      <li>• Always moves away from the contrasting color</li>
                      <li>• Used for subtle, decorative elements only</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="rejected" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              <section>
                <div className="p-3 mb-4 rounded-lg bg-orange-50 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30">
                  <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-400 mb-1">Strict Truncation Logic</h3>
                  <p className="text-xs text-orange-700/80 dark:text-orange-400/70 leading-relaxed">
                    To ensure 100% mathematical certainty for accessibility, we use <strong>Truncation (Floor)</strong> rounding for all contrast checks.
                    Ratios are cut off at 2 decimal places (e.g., <code className="bg-orange-100 dark:bg-orange-900/40 px-1 rounded text-orange-900 dark:text-orange-300">4.498</code> becomes <code className="bg-orange-100 dark:bg-orange-900/40 px-1 rounded text-orange-900 dark:text-orange-300">4.49</code>).
                    This means a color that is even <code className="font-medium">0.001</code> below the threshold is rejected, forcing the algorithm to select a safer, higher-contrast step.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-semibold">Palette</th>
                        <th className="px-3 py-2 text-left font-semibold">Surface</th>
                        <th className="px-3 py-2 text-left font-semibold">Rejected Step</th>
                        <th className="px-3 py-2 text-left font-semibold">Truncated Ratio</th>
                        <th className="px-3 py-2 text-left font-semibold">Chosen Step</th>
                      </tr>
                    </thead>
                    <tbody>
                      {REJECTED_BOLD_A11Y_DATA.map((item, index) => (
                        <tr
                          key={`${item.palette}-${item.surface}`}
                          className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
                        >
                          <td className="px-3 py-2 font-medium">{item.palette}</td>
                          <td className="px-3 py-2">{item.surface}</td>
                          <td className="px-3 py-2 text-orange-600 dark:text-orange-400">{item.rejected}</td>
                          <td className="px-3 py-2 font-mono text-orange-600 dark:text-orange-400">{item.contrast}:1</td>
                          <td className="px-3 py-2 font-semibold text-green-600 dark:text-green-400">{item.chosen} <span className="text-[10px] opacity-70">(Next Step)</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="p-3 rounded-lg border bg-muted/20">
                <h4 className="text-xs font-semibold mb-2">Technical Implementation</h4>
                <code className="block p-2 rounded bg-background border text-[10px] font-mono whitespace-pre-wrap">
                  {`// src/lib/color-utils.ts\nexport function getContrastRatio(color1, color2) {\n  const ratio = (lighter + 0.05) / (darker + 0.05);\n  // Always truncate to 2 decimal places\n  return Math.floor(ratio * 100) / 100;\n}`}
                </code>
              </section>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="colors" className="flex-1 m-0 overflow-hidden flex flex-col">
          {/* Sticky Search Bar */}
          <div className="p-4 pb-2 bg-background sticky top-0 z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Source: v1010.json"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {/* Color Palettes Table */}
              {(() => {
                const filteredResults = Object.entries(colorPalettesData)
                  .map(([paletteName, paletteData]) => {
                    const baseStep = paletteData.base;
                    const displayName = paletteName
                      .split('_')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');

                    // Get all steps (200-2500, excluding 100)
                    const steps = [
                      200, 300, 400, 500, 600, 700, 800, 900, 1000,
                      1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800,
                      1900, 2000, 2100, 2200, 2300, 2400, 2500
                    ];

                    // Filter steps based on search query
                    const filteredSteps = steps.filter((step) => {
                      if (!searchQuery) return true;

                      const stepKey = step.toString() as keyof typeof paletteData;
                      const oklchValue = paletteData[stepKey];
                      if (!oklchValue || typeof oklchValue !== 'string') return false;

                      const hexValue = oklchToHex(oklchValue);
                      const query = searchQuery.toLowerCase();

                      // Search in step number
                      if (step.toString().includes(query)) return true;

                      // Search in OKLCH value
                      if (oklchValue.toLowerCase().includes(query)) return true;

                      // Search in HEX value (case-insensitive)
                      if (hexValue.toLowerCase().includes(query)) return true;

                      return false;
                    });

                    // Check if palette name or base step matches search
                    const paletteMatchesSearch = !searchQuery ||
                      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      baseStep.includes(searchQuery);

                    // Only show palette if it matches or has matching steps
                    if (searchQuery && !paletteMatchesSearch && filteredSteps.length === 0) {
                      return null;
                    }

                    return { paletteName, paletteData, baseStep, displayName, filteredSteps, steps };
                  })
                  .filter(Boolean) as Array<{ paletteName: string; paletteData: any; baseStep: string; displayName: string; filteredSteps: number[]; steps: number[] }>;

                if (searchQuery && filteredResults.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-muted-foreground">No results found for "{searchQuery}"</p>
                      <p className="text-xs text-muted-foreground mt-1">Try searching by palette name, step number, OKLCH, or HEX value</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {filteredResults.map(({ paletteName, paletteData, baseStep, displayName, filteredSteps, steps }) => (
                      <div key={paletteName}>
                        {/* Palette Header */}
                        <div className="flex items-baseline gap-3 mb-2">
                          <h3 className="text-sm font-semibold">{displayName}</h3>
                          <span className="text-xs text-muted-foreground">
                            Base: <span className="font-mono font-medium text-foreground">{baseStep}</span>
                          </span>
                        </div>

                        {/* Color Table */}
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="px-3 py-2 text-left font-semibold w-16">Step</th>
                                <th className="px-3 py-2 text-left font-semibold w-20">Swatch</th>
                                <th className="px-3 py-2 text-left font-semibold">OKLCH</th>
                                <th className="px-3 py-2 text-left font-semibold w-24">HEX</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(searchQuery ? filteredSteps : steps).map((step, index) => {
                                const stepKey = step.toString() as keyof typeof paletteData;
                                const oklchValue = paletteData[stepKey];
                                if (!oklchValue || typeof oklchValue !== 'string') return null;

                                const hexValue = oklchToHex(oklchValue);
                                const isBase = step.toString() === baseStep;
                                const oklchKey = `${paletteName}-${step}-oklch`;
                                const hexKey = `${paletteName}-${step}-hex`;

                                return (
                                  <tr
                                    key={step}
                                    className={`${index % 2 === 0 ? "bg-background" : "bg-muted/30"} ${isBase ? "font-semibold" : ""
                                      }`}
                                  >
                                    <td className="px-3 py-2">
                                      {step}
                                      {isBase && (
                                        <span className="ml-1 text-[9px] text-primary">★</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div
                                        className="w-12 h-6 rounded border border-border"
                                        style={{ backgroundColor: hexValue }}
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1.5">
                                        <code className="font-mono text-[10px] text-muted-foreground">
                                          {oklchValue}
                                        </code>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopy(oklchValue, oklchKey);
                                          }}
                                          className="opacity-50 hover:opacity-100 transition-opacity"
                                        >
                                          {copiedValues[oklchKey] ? (
                                            <Check className="h-3 w-3" />
                                          ) : (
                                            <Copy className="h-3 w-3" />
                                          )}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1.5">
                                        <code className="font-mono">
                                          {hexValue}
                                        </code>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopy(hexValue, hexKey);
                                          }}
                                          className="opacity-50 hover:opacity-100 transition-opacity"
                                        >
                                          {copiedValues[hexKey] ? (
                                            <Check className="h-3 w-3" />
                                          ) : (
                                            <Copy className="h-3 w-3" />
                                          )}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

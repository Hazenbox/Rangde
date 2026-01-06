import { Palette } from "@/store/palette-store";
import { Step, PaletteSteps } from "@/lib/color-utils";
import { oklchToHex } from "@/lib/color-utils";
import colorPalettesData from "./color-palettes.json";

interface JSONPalette {
  base: string;
  [key: string]: string; // Steps like "100", "200", etc.
}

interface JSONData {
  [paletteName: string]: JSONPalette;
}

function generateId(): string {
  return `palette_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert JSON palette format to app Palette format
 */
function convertJSONPaletteToPalette(
  name: string,
  jsonPalette: JSONPalette
): Palette {
  const steps: Partial<PaletteSteps> = {};
  
  // Convert step values from JSON to app format
  // JSON has "100", "200", "300", ..., "2500"
  // App uses 200, 300, 400, ..., 2500 (skip "100")
  const stepMapping: Record<string, Step> = {
    "200": 200,
    "300": 300,
    "400": 400,
    "500": 500,
    "600": 600,
    "700": 700,
    "800": 800,
    "900": 900,
    "1000": 1000,
    "1100": 1100,
    "1200": 1200,
    "1300": 1300,
    "1400": 1400,
    "1500": 1500,
    "1600": 1600,
    "1700": 1700,
    "1800": 1800,
    "1900": 1900,
    "2000": 2000,
    "2100": 2100,
    "2200": 2200,
    "2300": 2300,
    "2400": 2400,
    "2500": 2500,
  };

  // Convert oklch values to hex for each step
  for (const [jsonStep, appStep] of Object.entries(stepMapping)) {
    const oklchValue = jsonPalette[jsonStep];
    if (oklchValue) {
      const hexValue = oklchToHex(oklchValue);
      steps[appStep] = hexValue;
    }
  }

  // Get primary step from base value
  const baseValue = jsonPalette.base;
  const primaryStep = (baseValue ? parseInt(baseValue) : 600) as Step;

  return {
    id: generateId(),
    name: capitalize(name.replace(/_/g, " ")), // Convert snake_case to Title Case
    steps: steps as PaletteSteps,
    primaryStep,
    createdAt: 0,
  };
}

/**
 * Load all palettes from the JSON file
 */
export function loadPalettesFromJSON(): Palette[] {
  const jsonData = colorPalettesData as JSONData;
  const palettes: Palette[] = [];

  for (const [paletteName, jsonPalette] of Object.entries(jsonData)) {
    try {
      const palette = convertJSONPaletteToPalette(paletteName, jsonPalette);
      palettes.push(palette);
    } catch (error) {
      console.warn(`Failed to load palette "${paletteName}":`, error);
    }
  }

  return palettes;
}

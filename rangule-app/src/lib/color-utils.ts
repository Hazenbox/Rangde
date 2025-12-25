import { colord, extend, Colord } from "colord";
import a11yPlugin from "colord/plugins/a11y";
import mixPlugin from "colord/plugins/mix";

// Extend colord with accessibility and mix plugins
extend([a11yPlugin, mixPlugin]);

// Available steps in the palette (200 to 2500)
export const STEPS = [
  200, 300, 400, 500, 600, 700, 800, 900, 1000,
  1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000,
  2100, 2200, 2300, 2400, 2500
] as const;

export type Step = typeof STEPS[number];

export type PaletteSteps = Record<Step, string>;

/**
 * WCAG 2.1 Compliance levels for different use cases
 * - Normal Text: < 18pt or < 14pt bold
 * - Large Text: >= 18pt or >= 14pt bold
 * - Graphics/UI: Non-text elements like icons, borders, UI components
 */
export interface WCAGCompliance {
  normalText: { aa: boolean; aaa: boolean };
  largeText: { aa: boolean; aaa: boolean };
  graphics: { aa: boolean };
}

export interface ScaleResult {
  hex: string;
  /** The actual blended hex color used for contrast calculation */
  blendedHex?: string;
  alpha?: number;
  contrastRatio: number;
  wcag: WCAGCompliance;
  sourceStep?: Step;
}

export interface StepScales {
  surface: ScaleResult;
  high: ScaleResult;
  medium: ScaleResult;
  low: ScaleResult;
  heavy: ScaleResult;
  bold: ScaleResult;
  boldA11Y: ScaleResult;
  minimal: ScaleResult;
}

/**
 * Get contrast ratio between two colors using WCAG 2.1 formula
 */
export function getContrastRatio(color1: string, color2: string): number {
  return colord(color1).contrast(color2);
}

/**
 * Determine if a surface color is "light" (needs dark contrasting color)
 * Based on contrast >= 4.5:1 against white = dark surface
 */
export function isLightSurface(surfaceHex: string): boolean {
  const contrastVsWhite = colord(surfaceHex).contrast("#ffffff");
  return contrastVsWhite < 4.5;
}

/**
 * Get the contrasting color direction
 * Light surface → use darker colors (toward 2500)
 * Dark surface → use lighter colors (toward 200)
 */
export function getContrastDirection(surfaceHex: string): 'dark' | 'light' {
  return isLightSurface(surfaceHex) ? 'dark' : 'light';
}

/**
 * Get step index in the STEPS array
 */
export function getStepIndex(step: Step): number {
  return STEPS.indexOf(step);
}

/**
 * Get step from index
 */
export function getStepFromIndex(index: number): Step | undefined {
  return STEPS[index];
}

/**
 * Blend a color with transparency over a background
 * Returns the resulting opaque color
 */
export function blendWithAlpha(fgHex: string, bgHex: string, alpha: number): string {
  const fg = colord(fgHex);
  const bg = colord(bgHex);
  return bg.mix(fg, alpha).toHex();
}

/**
 * Calculate the alpha value needed to achieve a target contrast ratio
 * Uses binary search to find the optimal alpha
 */
export function findAlphaForContrast(
  fgHex: string,
  bgHex: string,
  targetContrast: number,
  tolerance: number = 0.05
): number {
  let low = 0;
  let high = 1;
  let iterations = 0;
  const maxIterations = 50;

  while (high - low > 0.001 && iterations < maxIterations) {
    const mid = (low + high) / 2;
    const blended = blendWithAlpha(fgHex, bgHex, mid);
    const contrast = getContrastRatio(blended, bgHex);

    if (Math.abs(contrast - targetContrast) <= tolerance) {
      return mid;
    }

    if (contrast < targetContrast) {
      low = mid;
    } else {
      high = mid;
    }
    iterations++;
  }

  return (low + high) / 2;
}

/**
 * Check if a hex color is valid
 */
export function isValidHex(hex: string): boolean {
  return colord(hex).isValid();
}

/**
 * Normalize hex color (ensure # prefix and lowercase)
 */
export function normalizeHex(hex: string): string {
  const c = colord(hex);
  return c.isValid() ? c.toHex() : hex;
}

/**
 * Get luminance of a color (0-1)
 */
export function getLuminance(hex: string): number {
  return colord(hex).luminance();
}

/**
 * Create WCAG compliance result with full compliance checks
 * 
 * WCAG 2.1 Contrast Requirements:
 * - Normal Text AA: >= 4.5:1
 * - Normal Text AAA: >= 7:1
 * - Large Text AA: >= 3:1
 * - Large Text AAA: >= 4.5:1
 * - Graphics/UI AA: >= 3:1
 * 
 * @param hex - The display hex value (can be rgba string for alpha-blended colors)
 * @param surfaceHex - The surface color to calculate contrast against
 * @param alpha - Optional alpha value
 * @param sourceStep - The source step in the palette
 * @param blendedHex - Optional actual blended hex for contrast calculation (used when hex is rgba)
 */
export function createScaleResult(
  hex: string,
  surfaceHex: string,
  alpha?: number,
  sourceStep?: Step,
  blendedHex?: string
): ScaleResult {
  // Use blendedHex for contrast calculation if provided, otherwise use hex
  const colorForContrast = blendedHex || hex;
  const contrastRatio = getContrastRatio(colorForContrast, surfaceHex);
  
  return {
    hex,
    blendedHex,
    alpha,
    contrastRatio,
    wcag: {
      normalText: {
        aa: contrastRatio >= 4.5,
        aaa: contrastRatio >= 7
      },
      largeText: {
        aa: contrastRatio >= 3,
        aaa: contrastRatio >= 4.5
      },
      graphics: {
        aa: contrastRatio >= 3
      }
    },
    sourceStep
  };
}

/**
 * Convert hex with alpha to rgba string
 */
export function hexToRgba(hex: string, alpha: number): string {
  const c = colord(hex);
  return c.alpha(alpha).toRgbString();
}

/**
 * Get the readable text color (black or white) for a background
 */
export function getReadableTextColor(bgHex: string): string {
  return colord(bgHex).isLight() ? "#000000" : "#ffffff";
}

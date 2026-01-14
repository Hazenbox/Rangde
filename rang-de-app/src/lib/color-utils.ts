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
 * Manual implementation of WCAG 2.1 contrast ratio formula
 * Matches Figma Contrast plugin exactly
 */

/**
 * Convert sRGB channel to linear RGB
 * Formula: 
 * - If normalized <= 0.03928: linear = normalized / 12.92
 * - Otherwise: linear = ((normalized + 0.055) / 1.055)^2.4
 */
function sRgbToLinearRgb(value: number): number {
  const normalized = value / 255;

  if (normalized <= 0.03928) {
    return normalized / 12.92;
  }

  return Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/**
 * Get relative luminance from RGB components
 * Formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * R, G, B are linear RGB values
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const rLinear = sRgbToLinearRgb(r);
  const gLinear = sRgbToLinearRgb(g);
  const bLinear = sRgbToLinearRgb(b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Get contrast ratio between two colors using WCAG 2.1 formula
 * Using manual implementation to ensure 100% parity with design tools
 */
export function getContrastRatio(color1: string, color2: string): number {
  const c1Input = color1.startsWith('oklch') ? oklchToHex(color1) : color1;
  const c2Input = color2.startsWith('oklch') ? oklchToHex(color2) : color2;

  const c1 = colord(c1Input).toRgb();
  const c2 = colord(c2Input).toRgb();

  const l1 = getRelativeLuminance(c1.r, c1.g, c1.b);
  const l2 = getRelativeLuminance(c2.r, c2.g, c2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  // (L1 + 0.05) / (L2 + 0.05)
  // Floor/truncate to 2 decimal places to match Figma's contrast calculation
  // Example: 8.945 → 8.94 (not 8.95)
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.floor(ratio * 100) / 100;
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
 * Blend a color with transparency over a background using true alpha compositing
 * Formula: result = fg * alpha + bg * (1 - alpha)
 * Returns the resulting opaque color
 */
export function blendWithAlpha(fgHex: string, bgHex: string, alpha: number): string {
  const fgInput = fgHex.startsWith('oklch') ? oklchToHex(fgHex) : fgHex;
  const bgInput = bgHex.startsWith('oklch') ? oklchToHex(bgHex) : bgHex;

  const fg = colord(fgInput).toRgb();
  const bg = colord(bgInput).toRgb();

  // True alpha compositing: result = fg * alpha + bg * (1 - alpha)
  const r = Math.round(fg.r * alpha + bg.r * (1 - alpha));
  const g = Math.round(fg.g * alpha + bg.g * (1 - alpha));
  const b = Math.round(fg.b * alpha + bg.b * (1 - alpha));

  return colord({ r, g, b }).toHex();
}

/**
 * Calculate the alpha value needed to achieve a target contrast ratio
 * Uses binary search to find the smallest alpha that achieves >= targetContrast
 * 
 * @param fgHex - Foreground color (contrasting color)
 * @param bgHex - Background color (surface)
 * @param targetContrast - Minimum contrast ratio to achieve
 * @param ensureMinimum - If true, ensures result is >= targetContrast (never less)
 */
export function findAlphaForContrast(
  fgHex: string,
  bgHex: string,
  targetContrast: number,
  ensureMinimum: boolean = false
): number {
  // Linear search from 1% to 100% to find the lowest alpha that satisfies contrast
  // This ensures we match exact user expectations (e.g., if 45% is 4.49, we go to 46%)
  for (let alpha = 0.01; alpha <= 1.00; alpha += 0.01) {
    // Round to avoid floating point errors (e.g. 0.560000000001)
    const cleanAlpha = Math.round(alpha * 100) / 100;

    const blended = blendWithAlpha(fgHex, bgHex, cleanAlpha);
    const contrast = getContrastRatio(blended, bgHex);

    // Strict compliance: Must be >= targetContrast
    // Figma treats 4.49 as FAIL, so we must also treat it as FAIL.
    // This ensures Gold 800 goes to 71% (pass) instead of 70% (fail).
    if (contrast >= targetContrast) {
      return cleanAlpha;
    }
  }

  // If no alpha achieves the target contrast (should be handled by caller by checking full opacity first)
  return 1;
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

/**
 * Convert oklch color string to hex
 * Supports format: oklch(L% C H) or oklch(L% C H / alpha)
 * Example: oklch(16.01% 0.0209 58.51)
 * 
 * Manual conversion since colord doesn't support oklch:
 * OKLCH -> OKLab -> Linear RGB -> sRGB -> Hex
 */
export function oklchToHex(oklchString: string): string {
  try {
    // Parse oklch string: oklch(L% C H) or oklch(L% C H / alpha)
    const match = oklchString.match(/oklch\(([^)]+)\)/);
    if (!match) {
      return "#000000";
    }

    const parts = match[1].split(/\s+/).filter(p => p.trim());
    if (parts.length < 3) {
      return "#000000";
    }

    // Extract L, C, H values
    const L = parseFloat(parts[0].replace('%', '')) / 100; // Convert % to 0-1
    const C = parseFloat(parts[1]);
    const H = parseFloat(parts[2]) * Math.PI / 180; // Convert degrees to radians

    // Convert OKLCH to OKLab
    const a = C * Math.cos(H);
    const b = C * Math.sin(H);

    // Convert OKLab to linear RGB using OKLab to linear sRGB matrix
    // Matrix from: https://bottosson.github.io/posts/oklab/
    const l = L + 0.3963377774 * a + 0.2158037573 * b;
    const m = L - 0.1055613458 * a - 0.0638541728 * b;
    const s = L - 0.0894841775 * a - 1.2914855480 * b;

    const l_3 = l * l * l;
    const m_3 = m * m * m;
    const s_3 = s * s * s;

    // Linear RGB
    const r_linear = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
    const g_linear = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
    const b_linear = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;

    // Apply gamma correction (sRGB transfer function)
    const gammaCorrect = (c: number): number => {
      if (c >= 0.0031308) {
        return 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;
      }
      return 12.92 * c;
    };

    let r = gammaCorrect(r_linear);
    let g = gammaCorrect(g_linear);
    let bl = gammaCorrect(b_linear);

    // Clamp to [0, 1]
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    bl = Math.max(0, Math.min(1, bl));

    // Convert to 0-255 range and then to hex
    const r255 = Math.round(r * 255);
    const g255 = Math.round(g * 255);
    const b255 = Math.round(bl * 255);

    const hex = `#${r255.toString(16).padStart(2, '0')}${g255.toString(16).padStart(2, '0')}${b255.toString(16).padStart(2, '0')}`;

    return hex;
  } catch (error) {
    return "#000000";
  }
}

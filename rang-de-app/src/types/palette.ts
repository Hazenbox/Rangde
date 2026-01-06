import { Step } from '@/constants/steps';

/**
 * Color palette step values
 */
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

/**
 * Result of a scale generation for a single surface step
 */
export interface ScaleResult {
  hex: string;
  /** The actual blended hex color used for contrast calculation */
  blendedHex?: string;
  alpha?: number;
  contrastRatio: number;
  wcag: WCAGCompliance;
  sourceStep?: Step;
}

/**
 * All scales for a single surface step
 */
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
 * Color palette definition
 */
export interface Palette {
  id: string;
  name: string;
  steps: PaletteSteps;
  primaryStep: Step;
  createdAt: number;
}

/**
 * Map of all generated scales for all steps
 */
export type GeneratedScalesMap = Record<Step, StepScales | null>;

/**
 * View mode for the application
 */
export type ViewMode = 'palette' | 'how-it-works';

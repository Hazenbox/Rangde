/**
 * Color palette step constants
 * Steps range from 200 (darkest) to 2500 (lightest)
 */

export const STEPS = [
  200, 300, 400, 500, 600, 700, 800, 900, 1000,
  1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000,
  2100, 2200, 2300, 2400, 2500
] as const;

export type Step = typeof STEPS[number];

/**
 * Default primary step for color palettes
 */
export const DEFAULT_PRIMARY_STEP: Step = 600;

/**
 * Contrast ratio thresholds for WCAG compliance
 */
export const CONTRAST_RATIOS = {
  NORMAL_TEXT_AA: 4.5,
  NORMAL_TEXT_AAA: 7.0,
  LARGE_TEXT_AA: 3.0,
  LARGE_TEXT_AAA: 4.5,
  GRAPHICS_AA: 3.0,
} as const;

import {
  STEPS,
  Step,
  PaletteSteps,
  StepScales,
  ScaleResult,
  getContrastRatio,
  getContrastDirection,
  getStepIndex,
  getStepFromIndex,
  blendWithAlpha,
  findAlphaForContrast,
  createScaleResult,
  hexToRgba,
  isValidHex
} from "./color-utils";

/**
 * Generate High scale
 * Uses contrasting color:
 * - Dark CC (light surface) → step 200 (darkest)
 * - Light CC (dark surface) → step 2500 (lightest)
 */
function generateHigh(
  surfaceHex: string,
  palette: PaletteSteps,
  contrastDir: 'dark' | 'light'
): ScaleResult {
  // Step 200 = darkest, Step 2500 = lightest
  const targetStep: Step = contrastDir === 'dark' ? 200 : 2500;
  const hex = palette[targetStep];
  return createScaleResult(hex, surfaceHex, undefined, targetStep);
}

/**
 * Generate Low scale
 * Contrasting color with transparency to achieve exactly 4.5:1 contrast
 * 
 * Logic:
 * - If full contrast >= 4.5: reduce alpha to achieve exactly 4.5:1
 * - If full contrast < 4.5: find a step in the palette that has >= 4.5:1 contrast
 */
function generateLow(
  surfaceHex: string,
  palette: PaletteSteps,
  contrastDir: 'dark' | 'light'
): ScaleResult {
  // Step 200 = darkest, Step 2500 = lightest
  const targetStep: Step = contrastDir === 'dark' ? 200 : 2500;
  const ccHex = palette[targetStep];

  const fullContrast = getContrastRatio(ccHex, surfaceHex);

  // If full contrast with the contrasting color is < 4.5, find a better step
  if (fullContrast < 4.5) {
    // Search for a step that has >= 4.5:1 contrast
    const direction = contrastDir === 'dark' ? -1 : 1; // Move toward extremes
    let bestStep: Step = targetStep;
    let bestHex = ccHex;
    let bestContrast = fullContrast;

    // Search all steps to find one with sufficient contrast
    for (const step of STEPS) {
      const hex = palette[step];
      if (!hex || !isValidHex(hex)) continue;

      const contrast = getContrastRatio(hex, surfaceHex);
      if (contrast >= 4.5) {
        // Found a step with sufficient contrast, use it
        return createScaleResult(hex, surfaceHex, 1, step, hex);
      }
      // Track the best we've found so far
      if (contrast > bestContrast) {
        bestContrast = contrast;
        bestStep = step;
        bestHex = hex;
      }
    }

    // If no step has >= 4.5:1, use the best we found
    return createScaleResult(bestHex, surfaceHex, 1, bestStep, bestHex);
  }

  // Find the smallest alpha that achieves >= 4.5:1 contrast (never less)
  const alpha = findAlphaForContrast(ccHex, surfaceHex, 4.5, true);
  const blendedHex = blendWithAlpha(ccHex, surfaceHex, alpha);

  // Store rgba for display, but keep blendedHex for contrast calculation
  const rgbaDisplay = hexToRgba(ccHex, alpha);
  return createScaleResult(rgbaDisplay, surfaceHex, alpha, targetStep, blendedHex);
}

/**
 * Generate Medium scale
 * Contrasting color with alpha midpoint between 1.0 and Low's alpha
 */
function generateMedium(
  surfaceHex: string,
  palette: PaletteSteps,
  contrastDir: 'dark' | 'light',
  lowAlpha: number
): ScaleResult {
  // Step 200 = darkest, Step 2500 = lightest
  const targetStep: Step = contrastDir === 'dark' ? 200 : 2500;
  const ccHex = palette[targetStep];

  // Midpoint between 1.0 (100%) and Low's alpha, using round to avoid float precision issues
  // Formula: alpha = (100 + Low_alpha_percent) / 2, then round
  const alpha = Math.round(((1.0 + lowAlpha) / 2) * 100) / 100;
  const blendedHex = blendWithAlpha(ccHex, surfaceHex, alpha);

  // Store rgba for display, but keep blendedHex for contrast calculation
  const rgbaDisplay = hexToRgba(ccHex, alpha);
  return createScaleResult(rgbaDisplay, surfaceHex, alpha, targetStep, blendedHex);
}

/**
 * Get step offset for Bold based on Base Step (for dark mode/dark backgrounds)
 * 
 * Rules:
 * - 2500-1900: +0 steps
 * - 1800-1300: +1 step
 * - 1200-700:  +2 steps
 * - 600-100:   +3 steps
 */
function getBoldStepOffset(baseStep: Step): number {
  if (baseStep >= 1900) return 0;
  if (baseStep >= 1300) return 1;
  if (baseStep >= 700) return 2;
  return 3;
}

/**
 * Generate Bold scale
 * 
 * Start from the base step selected by the user.
 * If contrast ratio is below 3.0:1, move toward the contrasting color.
 * Continue stepping until contrast ratio is >= 3.0:1.
 */
function generateBold(
  surfaceStep: Step,
  surfaceHex: string,
  palette: PaletteSteps,
  contrastDir: 'dark' | 'light',
  primaryStep: Step
): ScaleResult {
  // Step 200 = darkest (dark CC), Step 2500 = lightest (light CC)
  const ccStep: Step = contrastDir === 'dark' ? 200 : 2500;

  // Start from the base (primary) step
  const primaryIndex = getStepIndex(primaryStep);
  let currentIndex = primaryIndex;

  // Apply Base Value Adjustment for Dark Backgrounds (Light CC)
  if (contrastDir === 'light') {
    const offset = getBoldStepOffset(primaryStep);
    // Move starting point towards lighter/higher values (add to index)
    // Ensure we don't go out of bounds
    currentIndex = Math.min(STEPS.length - 1, currentIndex + offset);
  }

  // Direction to move: toward CC
  // Dark CC (light surface) = move toward step 200 (lower indices)
  // Light CC (dark surface) = move toward step 2500 (higher indices)
  const direction = contrastDir === 'dark' ? -1 : 1;

  // Walk from base step toward CC until contrast >= 3.0:1
  while (currentIndex >= 0 && currentIndex < STEPS.length) {
    const step = getStepFromIndex(currentIndex);
    if (step === undefined) break;

    const hex = palette[step];
    if (hex && isValidHex(hex)) {
      const contrast = getContrastRatio(hex, surfaceHex);
      if (contrast >= 3.0) {
        return createScaleResult(hex, surfaceHex, undefined, step);
      }
    }

    currentIndex += direction;
  }

  // Fallback: Check contrasting color directly
  const ccHex = palette[ccStep];
  // Even if it fails the threshold, return it as the "best available" solid option
  // instead of using alpha blending.
  if (ccHex && isValidHex(ccHex)) {
    // We already checked it in the loop effectively (as the end limit),
    // but this catches cases where the loop might have exited.
    return createScaleResult(ccHex, surfaceHex, undefined, ccStep);
  }

  // Last resort (should rarely happen unless palette is broken): Return empty
  return createEmptyScaleResult();
}

/**
 * Generate BoldA11Y scale
 * 
 * Starts from the user-selected base step (primaryStep).
 * Checks if contrast ratio against surface is >= 4.5:1.
 * If contrast fails, moves toward the contrasting color step by step.
 * Continues until finding a step with >= 4.5:1 contrast.
 */
function generateBoldA11Y(
  surfaceStep: Step,
  surfaceHex: string,
  palette: PaletteSteps,
  contrastDir: 'dark' | 'light',
  primaryStep: Step
): ScaleResult {
  // Step 200 = darkest (dark CC), Step 2500 = lightest (light CC)
  const ccStep: Step = contrastDir === 'dark' ? 200 : 2500;

  // Start from the base (primary) step
  const primaryIndex = getStepIndex(primaryStep);
  let currentIndex = primaryIndex;

  // Apply Base Value Adjustment for Dark Backgrounds (Light CC)
  if (contrastDir === 'light') {
    const offset = getBoldStepOffset(primaryStep);
    // Move starting point towards lighter/higher values (add to index)
    currentIndex = Math.min(STEPS.length - 1, currentIndex + offset);
  }

  // Direction to move: toward CC
  // Dark CC (light surface) = move toward step 200 (lower indices)
  // Light CC (dark surface) = move toward step 2500 (higher indices)
  const direction = contrastDir === 'dark' ? -1 : 1;

  // Walk from base step toward CC until contrast >= 4.5:1
  while (currentIndex >= 0 && currentIndex < STEPS.length) {
    const step = getStepFromIndex(currentIndex);
    if (step === undefined) break;

    const hex = palette[step];
    if (hex && isValidHex(hex)) {
      const contrast = getContrastRatio(hex, surfaceHex);
      if (contrast >= 4.5) {
        return createScaleResult(hex, surfaceHex, undefined, step);
      }
    }

    currentIndex += direction;
  }

  // Fallback: Check contrasting color directly
  const ccHex = palette[ccStep];
  // Even if it fails the threshold, return it as the "best available" solid option
  // instead of using alpha blending.
  if (ccHex && isValidHex(ccHex)) {
    return createScaleResult(ccHex, surfaceHex, undefined, ccStep);
  }

  // Last resort: Return empty
  return createEmptyScaleResult();
}

/**
 * Generate Heavy scale
 * Dark CC (light surface): step between Bold and step 200, capped at 800
 * Light CC (dark surface): same as BoldA11Y (if >3 steps away, use 2500)
 */
function generateHeavy(
  surfaceStep: Step,
  surfaceHex: string,
  palette: PaletteSteps,
  contrastDir: 'dark' | 'light',
  boldResult: ScaleResult,
  boldA11YResult: ScaleResult,
  primaryStep: Step
): ScaleResult {
  if (contrastDir === 'dark') {
    // Dark CC (light surface): Average of Bold and Step 200 (Darkest)
    // Formula: (BoldStep + 200) / 2
    // If result ends in 50 (e.g. 450), round UP to next 100 (e.g. 500)

    // Using indices to handle the math easily
    const boldStep = boldResult.sourceStep || surfaceStep;
    const boldIndex = getStepIndex(boldStep);
    const step200Index = getStepIndex(200);

    // Average index. Math.ceil effectively rounds .5 up to next integer
    // e.g. (Index 600 + Index 700)/2 = Index 650? No indices are 0,1,2...
    // Let's use step values directly as user requested math based on values
    // (700 + 200) / 2 = 450 -> 500

    // Calculate using numeric values
    const rawMid = (boldStep + 200) / 2;
    // Round to nearest 100, rounding .50 UP
    // (450 + 50) / 100 = 5. floor -> 5 * 100 = 500.
    // Actually Math.ceil(450/100) * 100 = 5 * 100 = 500. Perfect.
    const targetStepValue = Math.ceil(rawMid / 100) * 100;

    // Find the closest valid step in STEPS array
    // (This helps if targetStepValue isn't in STEPS, though 100-2500 likely are)
    // Cast to simple number for search then cast back to Step
    let bestStep: Step = 200;
    let minDiff = Infinity;

    for (const step of STEPS) {
      const diff = Math.abs(step - targetStepValue);
      if (diff < minDiff) {
        minDiff = diff;
        bestStep = step;
      }
    }

    // Exception: Never go above step 800
    // If the calculation yields > 800 (e.g. Bold=1600 -> Avg=900), clamp to 800.
    if (bestStep > 800) {
      bestStep = 800;
    }

    const hex = palette[bestStep];
    return createScaleResult(hex, surfaceHex, undefined, bestStep);
  } else {
    // Light CC (dark surface): same as BoldA11Y
    // Exception: when the colour is more that 3 steps away from the New base value, then it goes to step 2500

    const boldA11YStep = boldA11YResult.sourceStep || surfaceStep;
    const boldA11YIndex = getStepIndex(boldA11YStep);

    // Calculate New Base Value (Base + Offset)
    const offset = getBoldStepOffset(primaryStep);
    const baseIndex = getStepIndex(primaryStep);
    // Ensure we don't go out of bounds
    const newBaseIndex = Math.min(STEPS.length - 1, baseIndex + offset);

    // Calculate distance in steps (indices)
    const distance = Math.abs(boldA11YIndex - newBaseIndex);

    // If more than 3 steps away (strictly > 3)
    if (distance > 3) {
      // Use Step 2500 (White)
      return createScaleResult(palette[2500], surfaceHex, undefined, 2500);
    }

    // Otherwise keep BoldA11Y
    return { ...boldA11YResult };
  }
}

/**
 * Generate Minimal scale
 * 
 * Minimal scale logic based on contrasting color direction:
 * - If High uses step 200 (dark CC): Subtract 200 from surface (move away from dark)
 *   Example: Surface 1500 → Minimal 1300 (1500 - 200)
 * - If High uses step 2500 (light CC): Add 200 to surface (move away from light)
 *   Example: Surface 400 → Minimal 600 (400 + 200)
 * 
 * This creates a subtle variation that moves away from the contrasting color,
 * providing low-contrast colors suitable for decorative elements only.
 */
function generateMinimal(
  surfaceStep: Step,
  surfaceHex: string,
  palette: PaletteSteps,
  contrastDir: 'dark' | 'light'
): ScaleResult {
  const surfaceIndex = getStepIndex(surfaceStep);

  // Determine offset based on contrasting color direction
  // Dark CC (High = 200): subtract 2 indices (move lighter, away from dark)
  // Light CC (High = 2500): add 2 indices (move darker, away from light)
  let targetIndex: number;
  if (contrastDir === 'dark') {
    // Dark contrasting color (step 200) → subtract 200 from surface
    targetIndex = surfaceIndex - 2;
  } else {
    // Light contrasting color (step 2500) → add 200 to surface
    targetIndex = surfaceIndex + 2;
  }

  // Clamp to valid range [0, 23]
  const clampedIndex = Math.max(0, Math.min(STEPS.length - 1, targetIndex));

  const targetStep = getStepFromIndex(clampedIndex) || surfaceStep;
  const hex = palette[targetStep];

  return createScaleResult(hex, surfaceHex, undefined, targetStep);
}

/**
 * Create an empty scale result for when no color is defined
 */
function createEmptyScaleResult(): ScaleResult {
  return {
    hex: "",
    alpha: undefined,
    contrastRatio: 0,
    wcag: {
      normalText: { aa: false, aaa: false },
      largeText: { aa: false, aaa: false },
      graphics: { aa: false }
    },
    sourceStep: undefined
  };
}

/**
 * Get default contrasting color based on direction
 */
function getDefaultContrastingColor(contrastDir: 'dark' | 'light'): string {
  return contrastDir === 'dark' ? '#000000' : '#ffffff';
}

/**
 * Generate all scales for a single surface step
 */
export function generateScalesForStep(
  surfaceStep: Step,
  palette: PaletteSteps,
  primaryStep: Step = 600
): StepScales | null {
  const surfaceHex = palette[surfaceStep];

  // If no surface color defined, return null
  if (!surfaceHex || !isValidHex(surfaceHex)) {
    return null;
  }

  const contrastDir = getContrastDirection(surfaceHex);

  // Get contrasting color from palette or use default
  // Step 200 = darkest, Step 2500 = lightest
  const ccStep: Step = contrastDir === 'dark' ? 200 : 2500;
  let ccHex = palette[ccStep];

  // If CC not defined in palette, use default
  if (!ccHex || !isValidHex(ccHex)) {
    ccHex = getDefaultContrastingColor(contrastDir);
  }

  // Create a temporary palette with default CC for calculations
  const tempPalette: PaletteSteps = {
    ...palette,
    [ccStep]: ccHex
  };

  // Generate Low first to get alpha for Medium
  const low = generateLow(surfaceHex, tempPalette, contrastDir);
  const lowAlpha = low.alpha ?? 1;

  // Generate Bold and BoldA11Y for Heavy calculation
  const bold = generateBold(surfaceStep, surfaceHex, tempPalette, contrastDir, primaryStep);
  const boldA11Y = generateBoldA11Y(surfaceStep, surfaceHex, tempPalette, contrastDir, primaryStep);

  return {
    surface: createScaleResult(surfaceHex, surfaceHex, undefined, surfaceStep),
    high: generateHigh(surfaceHex, tempPalette, contrastDir),
    medium: generateMedium(surfaceHex, tempPalette, contrastDir, lowAlpha),
    low,
    heavy: generateHeavy(surfaceStep, surfaceHex, tempPalette, contrastDir, bold, boldA11Y, primaryStep),
    bold,
    boldA11Y,
    minimal: generateMinimal(surfaceStep, surfaceHex, tempPalette, contrastDir)
  };
}

/**
 * Generate all scales for all steps in a palette
 */
export function generateAllScales(palette: PaletteSteps, primaryStep: Step = 600): Record<Step, StepScales | null> {
  const result: Partial<Record<Step, StepScales | null>> = {};

  for (const step of STEPS) {
    result[step] = generateScalesForStep(step, palette, primaryStep);
  }

  return result as Record<Step, StepScales | null>;
}

/**
 * Create an empty palette for initial state
 */
export function createDefaultPalette(): PaletteSteps {
  const palette: Partial<PaletteSteps> = {};

  // Create empty palette with empty strings
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    palette[step] = "";
  }

  return palette as PaletteSteps;
}

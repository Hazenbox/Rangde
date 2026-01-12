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
  
  // Midpoint between 1.0 (100%) and Low's alpha, using floor to round down
  // Formula: alpha = (100 + Low_alpha_percent) / 2, then floor
  const alpha = Math.floor(((1.0 + lowAlpha) / 2) * 100) / 100;
  const blendedHex = blendWithAlpha(ccHex, surfaceHex, alpha);
  
  // Store rgba for display, but keep blendedHex for contrast calculation
  const rgbaDisplay = hexToRgba(ccHex, alpha);
  return createScaleResult(rgbaDisplay, surfaceHex, alpha, targetStep, blendedHex);
}

/**
 * Get step offset for Bold based on surface step (dark mode only)
 * 
 * Step offset rules:
 * - 2500-1900: +0 steps
 * - 1800-1300: +1 step
 * - 1200-700:  +2 steps
 * - 600-100:   +3 steps
 */
function getBoldStepOffset(surfaceStep: Step): number {
  if (surfaceStep >= 1900) return 0;
  if (surfaceStep >= 1300) return 1;
  if (surfaceStep >= 700) return 2;
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
  if (ccHex && isValidHex(ccHex)) {
    const ccContrast = getContrastRatio(ccHex, surfaceHex);
    if (ccContrast >= 3.0) {
      return createScaleResult(ccHex, surfaceHex, undefined, ccStep);
    }
  }
  
  // Last resort: Use alpha blending to guarantee 3.0:1 contrast
  const pureContrastingColor = contrastDir === 'dark' ? '#000000' : '#ffffff';
  const alpha = findAlphaForContrast(pureContrastingColor, surfaceHex, 3.0);
  const blendedHex = blendWithAlpha(pureContrastingColor, surfaceHex, alpha);
  const rgbaDisplay = hexToRgba(pureContrastingColor, alpha);
  return createScaleResult(rgbaDisplay, surfaceHex, alpha, ccStep, blendedHex);
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
  if (ccHex && isValidHex(ccHex)) {
    const ccContrast = getContrastRatio(ccHex, surfaceHex);
    if (ccContrast >= 4.5) {
      return createScaleResult(ccHex, surfaceHex, undefined, ccStep);
    }
  }
  
  // Last resort: Use alpha blending to guarantee 4.5:1 contrast
  const pureContrastingColor = contrastDir === 'dark' ? '#000000' : '#ffffff';
  const alpha = findAlphaForContrast(pureContrastingColor, surfaceHex, 4.5);
  const blendedHex = blendWithAlpha(pureContrastingColor, surfaceHex, alpha);
  const rgbaDisplay = hexToRgba(pureContrastingColor, alpha);
  return createScaleResult(rgbaDisplay, surfaceHex, alpha, ccStep, blendedHex);
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
  boldA11YResult: ScaleResult
): ScaleResult {
  if (contrastDir === 'dark') {
    // Dark CC (light surface): step between Bold and step 200 (darkest)
    const boldStep = boldResult.sourceStep || surfaceStep;
    const boldIndex = getStepIndex(boldStep);
    const step200Index = getStepIndex(200);
    
    // Calculate midpoint
    const midIndex = Math.round((boldIndex + step200Index) / 2);
    let targetStep = getStepFromIndex(midIndex);
    
    // Cap at step 800
    if (targetStep && targetStep > 800) {
      targetStep = 800;
    }
    
    if (!targetStep) targetStep = 800;
    
    const hex = palette[targetStep];
    return createScaleResult(hex, surfaceHex, undefined, targetStep);
  } else {
    // Light CC (dark surface): same as BoldA11Y
    const boldA11YStep = boldA11YResult.sourceStep || surfaceStep;
    const surfaceIndex = getStepIndex(surfaceStep);
    const boldA11YIndex = getStepIndex(boldA11YStep);
    
    // Check if BoldA11Y is the contrasting color itself (step 2500 for light CC)
    const ccStep: Step = 2500;
    const ccIndex = getStepIndex(ccStep);
    
    // If BoldA11Y is the contrasting color, use it
    if (boldA11YStep === ccStep) {
      return { ...boldA11YResult };
    }
    
    // If BoldA11Y moved more than 3 steps away from base (in step values, not indices)
    // Calculate step value difference
    const stepValueDiff = Math.abs(boldA11YStep - surfaceStep);
    if (stepValueDiff > 300) { // More than 3 steps (300 step values)
      return createScaleResult(palette[2500], surfaceHex, undefined, 2500);
    }
    
    return { ...boldA11YResult };
  }
}

/**
 * Generate Minimal scale
 * 
 * Minimal step mapping:
 * - Steps 200-1100: Add 200 (move 2 steps forward)
 *   200→400, 300→500, 400→600, 500→700, 600→800, 700→900, 800→1000, 900→1100, 1000→1200, 1100→1300
 * - Steps 1200-2500: Subtract 200 (move 2 steps backward)
 *   1200→1000, 1300→1100, 1400→1200, 1500→1300, 1600→1400, 1700→1500, 1800→1600, 
 *   1900→1700, 2000→1800, 2100→1900, 2200→2000, 2300→2100, 2400→2200, 2500→2300
 */
function generateMinimal(
  surfaceStep: Step,
  surfaceHex: string,
  palette: PaletteSteps,
  contrastDir: 'dark' | 'light'
): ScaleResult {
  const surfaceIndex = getStepIndex(surfaceStep);
  
  // Transition point is at step 1200 (index 10)
  // Steps 200-1100 (indices 0-9): add 2 indices
  // Steps 1200-2500 (indices 10-23): subtract 2 indices
  const transitionIndex = 10; // Index of step 1200
  
  let targetIndex: number;
  if (surfaceIndex < transitionIndex) {
    // Steps 200-1100: add 2 indices (move forward)
    targetIndex = surfaceIndex + 2;
  } else {
    // Steps 1200-2500: subtract 2 indices (move backward)
    targetIndex = surfaceIndex - 2;
  }
  
  // Clamp to valid range
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
    heavy: generateHeavy(surfaceStep, surfaceHex, tempPalette, contrastDir, bold, boldA11Y),
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

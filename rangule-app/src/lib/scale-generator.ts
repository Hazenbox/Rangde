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
  
  // Find alpha to achieve exactly 4.5:1 contrast
  const alpha = findAlphaForContrast(ccHex, surfaceHex, 4.5);
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
  
  // Midpoint between 1.0 and Low's alpha
  const alpha = (1.0 + lowAlpha) / 2;
  const blendedHex = blendWithAlpha(ccHex, surfaceHex, alpha);
  
  // Store rgba for display, but keep blendedHex for contrast calculation
  const rgbaDisplay = hexToRgba(ccHex, alpha);
  return createScaleResult(rgbaDisplay, surfaceHex, alpha, targetStep, blendedHex);
}

/**
 * Generate Bold scale
 * Base value. If contrast < 3.0:1, find next step with contrast >= 3.0:1
 * MUST always achieve >= 3.0:1 contrast (Large Text AA / Graphics AA)
 * 
 * Strategy:
 * 1. Search palette for solid color with >= 3.0:1 contrast
 * 2. If none found, use alpha-blended contrasting color to guarantee 3.0:1
 */
function generateBold(
  surfaceStep: Step,
  surfaceHex: string,
  palette: PaletteSteps,
  contrastDir: 'dark' | 'light'
): ScaleResult {
  const surfaceIndex = getStepIndex(surfaceStep);
  // Step 200 = darkest, Step 2500 = lightest
  const ccStep: Step = contrastDir === 'dark' ? 200 : 2500;
  
  // Bold compares a color against the surface to be used ON the surface
  // Start with the base step and check if it has sufficient contrast
  let currentIndex = surfaceIndex;
  // Dark CC = move toward step 200 (lower indices), Light CC = move toward step 2500 (higher indices)
  const direction = contrastDir === 'dark' ? -1 : 1;
  
  // Step 1: Search for a solid palette color with >= 3.0:1 contrast
  while (currentIndex >= 0 && currentIndex < STEPS.length) {
    const step = getStepFromIndex(currentIndex);
    if (step === undefined) break;
    
    const hex = palette[step];
    if (!hex || !isValidHex(hex)) {
      currentIndex += direction;
      continue;
    }
    
    const contrast = getContrastRatio(hex, surfaceHex);
    
    // Use 3.05 threshold to account for floating-point precision
    if (contrast >= 3.05) {
      return createScaleResult(hex, surfaceHex, undefined, step);
    }
    
    currentIndex += direction;
  }
  
  // Step 2: Check contrasting color directly
  const ccHex = palette[ccStep];
  if (ccHex && isValidHex(ccHex)) {
    const ccContrast = getContrastRatio(ccHex, surfaceHex);
    if (ccContrast >= 3.05) {
      return createScaleResult(ccHex, surfaceHex, undefined, ccStep);
    }
  }
  
  // Step 3: Search ALL steps for any color with >= 3.0:1 contrast
  for (const step of STEPS) {
    const hex = palette[step];
    if (!hex || !isValidHex(hex)) continue;
    
    const contrast = getContrastRatio(hex, surfaceHex);
    if (contrast >= 3.05) {
      return createScaleResult(hex, surfaceHex, undefined, step);
    }
  }
  
  // Step 4: Use alpha blending to GUARANTEE 3.0:1 contrast
  // Always use pure black or white which will always have high contrast
  // Dark CC = black, Light CC = white
  const pureContrastingColor = contrastDir === 'dark' ? '#000000' : '#ffffff';
  
  // Pure black/white will always have sufficient contrast, so alpha blend to exactly 3.05:1
  const alpha = findAlphaForContrast(pureContrastingColor, surfaceHex, 3.05);
  const blendedHex = blendWithAlpha(pureContrastingColor, surfaceHex, alpha);
  const rgbaDisplay = hexToRgba(pureContrastingColor, alpha);
  return createScaleResult(rgbaDisplay, surfaceHex, alpha, ccStep, blendedHex);
}

/**
 * Generate BoldA11Y scale
 * Base value. If contrast < 4.5:1, find next step with contrast >= 4.5:1
 * MUST always achieve >= 4.5:1 contrast
 */
function generateBoldA11Y(
  surfaceStep: Step,
  surfaceHex: string,
  palette: PaletteSteps,
  contrastDir: 'dark' | 'light'
): ScaleResult {
  const surfaceIndex = getStepIndex(surfaceStep);
  let currentIndex = surfaceIndex;
  // Dark CC = move toward step 200 (lower indices), Light CC = move toward step 2500 (higher indices)
  const direction = contrastDir === 'dark' ? -1 : 1;
  
  let bestStep: Step = surfaceStep;
  let bestHex = palette[surfaceStep];
  let bestContrast = 0;
  
  while (currentIndex >= 0 && currentIndex < STEPS.length) {
    const step = getStepFromIndex(currentIndex);
    if (step === undefined) break;
    
    const hex = palette[step];
    if (!hex || !isValidHex(hex)) {
      currentIndex += direction;
      continue;
    }
    
    const contrast = getContrastRatio(hex, surfaceHex);
    
    // Track best contrast found
    if (contrast > bestContrast) {
      bestContrast = contrast;
      bestStep = step;
      bestHex = hex;
    }
    
    if (contrast >= 4.5) {
      return createScaleResult(hex, surfaceHex, undefined, step);
    }
    
    currentIndex += direction;
  }
  
  // Fallback: Check contrasting color
  // Step 200 = darkest, Step 2500 = lightest
  const fallbackStep: Step = contrastDir === 'dark' ? 200 : 2500;
  const fallbackHex = palette[fallbackStep];
  if (fallbackHex && isValidHex(fallbackHex)) {
    const fallbackContrast = getContrastRatio(fallbackHex, surfaceHex);
    if (fallbackContrast >= 4.5) {
      return createScaleResult(fallbackHex, surfaceHex, undefined, fallbackStep);
    }
    // Update best if fallback is better
    if (fallbackContrast > bestContrast) {
      bestContrast = fallbackContrast;
      bestStep = fallbackStep;
      bestHex = fallbackHex;
    }
  }
  
  // Last resort: search ALL steps for any color with >= 4.5:1 contrast
  for (const step of STEPS) {
    const hex = palette[step];
    if (!hex || !isValidHex(hex)) continue;
    
    const contrast = getContrastRatio(hex, surfaceHex);
    if (contrast >= 4.5) {
      return createScaleResult(hex, surfaceHex, undefined, step);
    }
    if (contrast > bestContrast) {
      bestContrast = contrast;
      bestStep = step;
      bestHex = hex;
    }
  }
  
  // Return best found (even if < 4.5, it's the best we have)
  return createScaleResult(bestHex, surfaceHex, undefined, bestStep);
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
  palette: PaletteSteps
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
  const bold = generateBold(surfaceStep, surfaceHex, tempPalette, contrastDir);
  const boldA11Y = generateBoldA11Y(surfaceStep, surfaceHex, tempPalette, contrastDir);
  
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
export function generateAllScales(palette: PaletteSteps): Record<Step, StepScales | null> {
  const result: Partial<Record<Step, StepScales | null>> = {};
  
  for (const step of STEPS) {
    result[step] = generateScalesForStep(step, palette);
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

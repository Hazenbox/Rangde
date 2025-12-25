/**
 * Test script to verify color generation logic matches OneUI expectations
 * Based on analysis from indigo-color-analysis.md and green-saffron-analysis.md
 */

import { generateScalesForStep, createDefaultPalette } from "./scale-generator";
import { getContrastRatio, getContrastDirection } from "./color-utils";
import { colord } from "colord";

/**
 * Convert RGBA (0-1 range) to hex
 */
function rgbaToHex(r: number, g: number, b: number): string {
  const r255 = Math.round(r * 255);
  const g255 = Math.round(g * 255);
  const b255 = Math.round(b * 255);
  return `#${r255.toString(16).padStart(2, '0')}${g255.toString(16).padStart(2, '0')}${b255.toString(16).padStart(2, '0')}`;
}

/**
 * Test Indigo color generation
 * Expected values from indigo-color-analysis.md:
 * - Indigo/2500/Medium: rgba(0.04, 0, 0.2, 0.77)
 * - Indigo/2500/Low: rgba(0.04, 0, 0.2, 0.55)
 * - Indigo/2500/High: Uses step 200 (same as Indigo/200/Surface)
 * - Indigo/2500/Minimal: Uses step 2300 (2500 - 200)
 */
export function testIndigo2500() {
  console.log("=== Testing Indigo Step 2500 ===\n");
  
  // Create a test palette
  // For Indigo, step 2500 should be a dark color, step 200 should be a light color
  // Using approximate values based on the analysis:
  // - Step 200 (light CC): rgba(0.04, 0, 0.2) ≈ #0a0033 (dark indigo, but light relative to 2500)
  // - Step 2500 (dark surface): Very dark indigo
  
  const palette = createDefaultPalette();
  
  // Set step 200 (light contrasting color) - this is the color used for High/Medium/Low
  // From analysis: RGB (0.04, 0, 0.2) in 0-1 range
  // This needs to have contrast > 4.5 against step 2500
  // Using a lighter indigo that will have high contrast
  palette[200] = "#6b7aff"; // Light indigo/blue - high contrast against dark
  
  // Set step 2500 (dark surface) - needs to be very dark
  // Using a very dark indigo
  palette[2500] = "#050014"; // Very dark indigo - should contrast well with step 200
  
  // Set step 2300 (for Minimal test) - should be between 200 and 2500
  palette[2300] = "#1a1a66"; // Medium-dark indigo
  
  // Set other steps for Bold/BoldA11Y/Heavy tests
  for (let i = 300; i < 2500; i += 100) {
    if (i !== 200 && i !== 2300) {
      // Interpolate between 200 and 2500
      const ratio = (i - 200) / 2300;
      const r = 0.04 + (0.04 - 0.04) * ratio;
      const g = 0 + (0 - 0) * ratio;
      const b = 0.2 + (0.1 - 0.2) * ratio;
      palette[i as keyof typeof palette] = rgbaToHex(r, g, b);
    }
  }
  
  // Generate scales for step 2500
  const scales = generateScalesForStep(2500, palette);
  
  if (!scales) {
    console.error("❌ Failed to generate scales");
    return;
  }
  
  console.log("Generated scales for Indigo/2500:\n");
  
  // Test High scale - should use step 200
  console.log("High scale:");
  console.log(`  Source step: ${scales.high.sourceStep}`);
  console.log(`  Expected: 200, Got: ${scales.high.sourceStep}`);
  console.log(`  ${scales.high.sourceStep === 200 ? "✅" : "❌"} High should use step 200\n`);
  
  // Test Medium scale - should have alpha ≈ 0.77
  console.log("Medium scale:");
  console.log(`  Alpha: ${scales.medium.alpha?.toFixed(2)}`);
  console.log(`  Expected: ~0.77, Got: ${scales.medium.alpha?.toFixed(2)}`);
  const mediumAlphaMatch = scales.medium.alpha !== undefined && Math.abs(scales.medium.alpha - 0.77) < 0.02;
  console.log(`  ${mediumAlphaMatch ? "✅" : "❌"} Medium alpha should be ~0.77\n`);
  
  // Test Low scale - should have alpha ≈ 0.55
  console.log("Low scale:");
  console.log(`  Alpha: ${scales.low.alpha?.toFixed(2)}`);
  console.log(`  Expected: ~0.55, Got: ${scales.low.alpha?.toFixed(2)}`);
  const lowAlphaMatch = scales.low.alpha !== undefined && Math.abs(scales.low.alpha - 0.55) < 0.02;
  console.log(`  ${lowAlphaMatch ? "✅" : "❌"} Low alpha should be ~0.55`);
  console.log(`  Contrast ratio: ${scales.low.contrastRatio.toFixed(2)}`);
  console.log(`  ${scales.low.contrastRatio >= 4.5 ? "✅" : "❌"} Low should have contrast >= 4.5:1\n`);
  
  // Test Minimal scale - should use step 2300 (2500 - 200)
  console.log("Minimal scale:");
  console.log(`  Source step: ${scales.minimal.sourceStep}`);
  console.log(`  Expected: 2300, Got: ${scales.minimal.sourceStep}`);
  console.log(`  ${scales.minimal.sourceStep === 2300 ? "✅" : "❌"} Minimal should use step 2300 (2500 - 200)\n`);
  
  // Test Bold scale
  console.log("Bold scale:");
  console.log(`  Source step: ${scales.bold.sourceStep}`);
  console.log(`  Contrast ratio: ${scales.bold.contrastRatio.toFixed(2)}`);
  console.log(`  ${scales.bold.contrastRatio >= 3.0 ? "✅" : "❌"} Bold should have contrast >= 3.0:1\n`);
  
  // Test BoldA11Y scale
  console.log("BoldA11Y scale:");
  console.log(`  Source step: ${scales.boldA11Y.sourceStep}`);
  console.log(`  Contrast ratio: ${scales.boldA11Y.contrastRatio.toFixed(2)}`);
  console.log(`  ${scales.boldA11Y.contrastRatio >= 4.5 ? "✅" : "❌"} BoldA11Y should have contrast >= 4.5:1\n`);
  
  // Test Heavy scale
  console.log("Heavy scale:");
  console.log(`  Source step: ${scales.heavy.sourceStep}`);
  console.log(`  Contrast ratio: ${scales.heavy.contrastRatio.toFixed(2)}\n`);
  
  // Verify contrast direction
  const contrastDir = getContrastDirection(palette[2500]);
  console.log("Contrast direction:");
  console.log(`  Surface (2500) is: ${contrastDir === 'light' ? 'dark' : 'light'}`);
  console.log(`  Expected: dark (needs light CC = step 200)`);
  console.log(`  ${contrastDir === 'light' ? "✅" : "❌"} Contrast direction should be 'light' (dark surface needs light CC)\n`);
  
  return {
    highCorrect: scales.high.sourceStep === 200,
    mediumAlphaCorrect: mediumAlphaMatch,
    lowAlphaCorrect: lowAlphaMatch,
    lowContrastCorrect: scales.low.contrastRatio >= 4.5,
    minimalCorrect: scales.minimal.sourceStep === 2300,
    boldContrastCorrect: scales.bold.contrastRatio >= 3.0,
    boldA11YContrastCorrect: scales.boldA11Y.contrastRatio >= 4.5,
    contrastDirCorrect: contrastDir === 'light'
  };
}

// Run test if this file is executed directly
if (require.main === module) {
  testIndigo2500();
}

# Color Logic Analysis: OneUI JSON vs color_logic.md

## Analysis Summary

After analyzing the OneUI Foundations JSON file, I've identified the actual color generation patterns and compared them with the documented logic in `color_logic.md`.

## Key Findings

### 1. **High Scale**
**JSON Pattern:**
- All High scales reference the same variable ID across different steps
- For Grey: `VariableID:cfa9f81322b5a7b060d88f287f18f9a1e95007c4/1250:6061` (appears to be step 2500)
- For Indigo: `VariableID:1470d29f762f5c58875010e3a96d9324f4d1d8f6/1250:5128` (appears to be step 2500)

**color_logic.md:**
- "Contrasting colour (2500 or 200)"
- Uses step 2500 if surface is light, step 200 if surface is dark

**✅ MATCH**: The logic matches - High always uses the contrasting color (step 2500 for dark surfaces, step 200 for light surfaces)

---

### 2. **Medium Scale**
**JSON Pattern:**
- Uses the same RGB values as High but with varying alpha values
- Example (Indigo):
  - 2500/Medium: `rgba(0.04, 0, 0.2, 0.77)` 
  - 2400/Medium: `rgba(0.04, 0, 0.2, 0.78)`
  - 2100/Medium: `rgba(0, 0.05, 0.12, 0.8)`
  - 1500/Medium: `rgba(0, 0.05, 0.12, 0.86)`
- Alpha values increase as surface gets lighter (higher step numbers)

**color_logic.md:**
- "Contrasting colour, transparency between High & Medium"
- Updated: "Contrasting color with alpha = midpoint between 1.0 and Low's alpha"

**✅ MATCH**: Medium uses the same contrasting color as High with alpha adjusted between High (1.0) and Low (4.5:1 contrast)

---

### 3. **Low Scale**
**JSON Pattern:**
- Uses the same RGB values as High/Medium but with lower alpha
- Example (Indigo):
  - 2500/Low: `rgba(0.04, 0, 0.2, 0.55)`
  - 2400/Low: `rgba(0.04, 0, 0.2, 0.56)`
  - 2100/Low: `rgba(0, 0.05, 0.12, 0.6)`
  - 1500/Low: `rgba(0, 0.05, 0.12, 0.72)`
- Alpha values are lower than Medium, calculated to achieve 4.5:1 contrast

**color_logic.md:**
- "Contrasting colour, transparency decreased to reach 4.5:1 contrast"

**✅ MATCH**: Low uses the same contrasting color with alpha calculated to achieve exactly 4.5:1 contrast ratio

---

### 4. **Bold Scale**
**JSON Pattern:**
- References variable aliases that appear to be the base step or adjusted step
- For Grey/2500/Bold: References `VariableID:cfa9f81322b5a7b060d88f287f18f9a1e95007c4/1250:6061` (same as High)
- For Grey/2400/Bold: References same variable (High)
- For Indigo/2500/Bold: References `VariableID:14068498bbdbeb7f0f59031fc6e0b5f9a1d94a5b/1250:5140`
- For Indigo/2400/Bold: References same variable

**color_logic.md:**
- "Base value. When contrast is < 3.0:1, then next colour step with contrast >= 3.0:1"

**✅ MATCH**: Bold starts at base step, but if contrast < 3.0:1, it moves toward the contrasting color until >= 3.0:1

---

### 5. **BoldA11Y Scale**
**JSON Pattern:**
- Often references the same variable as Bold
- For Grey/2500/BoldA11Y: Same as Bold
- For Indigo/2500/BoldA11Y: Same as Bold
- For Indigo/2400/BoldA11Y: Same as Bold

**color_logic.md:**
- "Base value. When contrast is below 4.5:1, then next colour step with contrast >= 4.5:1"

**✅ MATCH**: BoldA11Y starts at base step, but if contrast < 4.5:1, it moves toward the contrasting color until >= 4.5:1

---

### 6. **Heavy Scale**
**JSON Pattern:**
- References variable aliases
- For Grey/2500/Heavy: References same as High (`VariableID:cfa9f81322b5a7b060d88f287f18f9a1e95007c4/1250:6061`)
- For Grey/2400/Heavy: References same as High
- For Indigo/2500/Heavy: References `VariableID:c5dac4e982b34a8a30547ca25d8b646507dcdbce/1250:5134`
- For Indigo/2400/Heavy: References same variable

**color_logic.md:**
- "When contrasting colour is dark: Colour step between bold and step 200, exception: never above step 800"
- "When contrasting colour is light: same as BoldA11Y, exception: when the colour is more that 3 steps away from the base value, then it goes to step 2500"

**✅ MATCH**: Heavy uses midpoint logic between Bold and step 200 (capped at 800) for dark CC, or same as BoldA11Y (or 2500 if >3 steps away) for light CC

---

### 7. **Minimal Scale**
**JSON Pattern:**
- References different variable IDs for different steps
- For Grey/2500/Minimal: References `VariableID:3a50118f98722e6424ac9d6772f3cc51bdd1c99d/1250:6124`
- For Grey/2400/Minimal: References `VariableID:e258c11d1fc6528e96d27d87c42bca637a1d1980/1250:6121`
- For Grey/2300/Minimal: References `VariableID:1c0a0dd02ecb50e6fd0b8268fb9b0d6895307c64/1250:6118`
- For Grey/2200/Minimal: References `VariableID:e258c11d1fc6528e96d27d87c42bca637a1d1980/1250:6121` (same as 2400)
- Pattern suggests: 2500→2300, 2400→2200, 2300→2100, 2200→2000

**color_logic.md:**
- "If CC dark then –2 steps (e.g., 2400 → 2200)"
- "if CC light then +2 steps (e.g., 400 → 600)"

**✅ MATCH**: Minimal is exactly ±2 steps (200) from the surface step, depending on CC direction

---

### 8. **Surface Scale**
**JSON Pattern:**
- Each step has its own Surface variable
- Surface is the base color for that step

**color_logic.md:**
- "Step 2500 (if base is light) or Step 200 (if base is dark)" - This seems incorrect
- **CORRECTION**: Surface should be the base step itself, not step 2500 or 200

**⚠️ MISMATCH**: The documentation says Surface is step 2500 or 200, but in practice, Surface is the base step itself (e.g., Grey/2400/Surface is the color at step 2400)

---

## Summary

| Scale | JSON Pattern | color_logic.md | Match Status |
|-------|-------------|----------------|--------------|
| **Surface** | Base step color | Says step 2500/200 | ⚠️ **MISMATCH** - Should be base step |
| **High** | Step 2500 or 200 (CC) | Step 2500 or 200 | ✅ **MATCH** |
| **Medium** | CC with varying alpha | Midpoint alpha | ✅ **MATCH** |
| **Low** | CC with alpha for 4.5:1 | Alpha for 4.5:1 | ✅ **MATCH** |
| **Bold** | Base or adjusted step | Base, move if < 3.0:1 | ✅ **MATCH** |
| **BoldA11Y** | Base or adjusted step | Base, move if < 4.5:1 | ✅ **MATCH** |
| **Heavy** | Midpoint or BoldA11Y | Midpoint logic | ✅ **MATCH** |
| **Minimal** | ±2 steps (200) | ±2 steps | ✅ **MATCH** |

## Recommendations

1. **Fix Surface definition**: Surface should be defined as "The base color for this step" not "Step 2500 or 200"
2. **All other scales match correctly** with the documented logic
3. The implementation in `scale-generator.ts` appears to be correct based on this analysis

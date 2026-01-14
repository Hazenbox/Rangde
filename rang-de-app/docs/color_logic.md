# Rang De Color Logic

## Precise Contrast Calculation
Rang De uses a consistent, strict mathematical approach to ensure WCAG 2.1 compliance.

### 1. Truncation Logic (The Floor Method)
To ensure 100% mathematical certainty, all contrast ratios are **truncated (floored)** to two decimal places.
- **Formula:** `Math.floor(ratio * 100) / 100`
- **Impact:** A ratio of `4.499` becomes `4.49` (Fail). This forces the algorithm to select a safer, higher-contrast step or alpha instead of "rounding up" to compliance.

---

## Scale Generation Rules

### High
- **Purpose:** Maximum contrast for primary text.
- **Logic:** Uses the most contrasting color in the palette at 100% opacity.
- **Selection:** 
  - Light Surface (e.g., 2400) → High = Step 200 (Darkest)
  - Dark Surface (e.g., 400) → High = Step 2500 (Lightest)

### Medium
- **Purpose:** Balanced contrast for secondary elements.
- **Logic:** Uses the same contrasting color as High, but with reduced opacity.
- **Formula:** `alpha = round((1.0 + Low_alpha) / 2)` (Midpoint between 100% and Low's alpha).

### Low
- **Purpose:** Minimum decorative readable contrast.
- **Target:** ≥ 4.5:1 (WCAG AA).
- **Logic:** 
  - Uses the High contrasting color.
  - Linearly searches from 1% alpha upwards until truncated contrast ≥ 4.5:1.

### Bold
- **Purpose:** Strong emphasis for headings/UI.
- **Target:** ≥ 3.0:1 (WCAG Large Text).
- **Logic:** 
  - Starts from the user-selected **Base Step** (default 600).
  - If contrast < 3.0:1, moves one step at a time toward the surface until truncated contrast ≥ 3.0:1.

### Bold A11Y
- **Purpose:** Fully accessible emphasis.
- **Target:** ≥ 4.5:1 (WCAG Normal Text).
- **Logic:** 
  - Starts from the user-selected **Base Step**.
  - If contrast < 4.5:1, moves toward the surface until truncated contrast ≥ 4.5:1.
  - **Note:** Due to truncation logic, steps with raw ratios like `4.498` are rejected.

### Heavy
- **Purpose:** Deep emphasis.
- **Logic (Dark CC):** `(Bold_step + 200) / 2`, capped at **Step 800**.
- **Logic (Light CC):** Same as BoldA11Y.
  - **Exception:** If the resulting step is >3 steps away from the surface, it defaults to **Step 2500**.

### Minimal
- **Purpose:** Subtle decoration.
- **Logic:** Always moves 2 steps (200 units) away from the surface.
  - **Dark CC (Light Surface):** `Surface - 200` (e.g., 2400 → 2200).
  - **Light CC (Dark Surface):** `Surface + 200` (e.g., 400 → 600).

---

## Implementation Details
- **Contrast Formula:** Standard WCAG 2.1 Luminance-based contrast: `(L1 + 0.05) / (L2 + 0.05)`.
- **Gamut Mapping:** Palette colors are defined in OKLCH but normalized to Hex for precise blending and contrast calculations.
- **Blending:** Foreground color is blended over the background using the formula: `final = fg * alpha + bg * (1 - alpha)`.

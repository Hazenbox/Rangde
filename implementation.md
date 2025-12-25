Determining Contrasting Color (CC)
Calculate contrast ratio of surface step against white
If contrast >= 4.5:1 then CC is dark (use step 2500 as contrasting color)
If contrast < 4.5:1 then CC is light (use step 200 as contrasting color)


Scale Calculations (for each surface step)
High: CC color directly (step 2500 if dark, step 200 if light)
Medium: CC color with alpha = midpoint between 1.0 and Low alpha
Low: CC color with alpha adjusted to achieve exactly 4.5:1 contrast
Bold: Start at base step; if contrast vs surface < 3.0:1, move toward CC until >= 3.0:1
BoldA11Y: Start at base step; if contrast vs surface < 4.5:1, move toward CC until >= 4.5:1
Heavy: Dark CC uses midpoint between Bold step and 200, capped at 800. Light CC uses same as BoldA11Y (if more than 3 steps away, use 2500)
Minimal: Dark CC uses surface step - 200. Light CC uses surface step + 200

Scale Generation Engine
3.1 Implement High scale: return step 2500 or 200 based on CC
3.2 Implement Low scale: calculate alpha for 4.5:1 contrast
3.3 Implement Medium scale: midpoint alpha between High and Low
3.4 Implement Bold scale: find step with >= 3.0:1 contrast
3.5 Implement BoldA11Y scale: find step with >= 4.5:1 contrast
3.6 Implement Heavy scale: midpoint logic with 800 cap
3.7 Implement Minimal scale: ±2 steps from surface
3.8 Create generateAllScales function for full palette
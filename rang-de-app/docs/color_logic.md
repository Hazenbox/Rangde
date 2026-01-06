High:
Contrasting colour (2500 or 200).

Medium:
Contrasting colour, transaparancy between High & Medium.

Low:
Contrasting colour, transaparancy decreased to reach 4.5:1 contrast.

Heavy:
When contrasting colour is dark: 
    Colour step between bold and step 200
    exeption: never above step 800
When contrasting colour is light: 
    same as BoldA11Y
    exeption: when the colour is more that 3    steps away from the base value, then it goes to step 2500

Bold:
Base value. When contrast is < 3.0:1, then next colour step with contrast >= 3.0:1.

BoldA11Y:
Base value. When contrast is below 4.5:1, then next colour step with contrast >= 4.5:1.

Minimal:
If CC dark then –2 steps
if CC light then +2 steps 
CC means Contrasting color and -2 means if surface is 2400 then minimal is 2200 is CC is dark

Contrast 4.5:1 or more is dark color and less than that is light color

Surface	Step 2500 (if base is light) or Step 200 (if base is dark)
Medium	Contrasting color with alpha = midpoint between 1.0 and Low's alpha
Bold	Start at base step; if contrast < 3.0:1 → move towards Surface until >= 3.0:1
BoldA11Y	Start at base step; if contrast < 4.5:1 → move towards Surface until >= 4.5:1
Heavy	Dark CC: (Bold_step + 200) / 2, capped at 800. Light CC: same as BoldA11Y (if >3 steps away → use 2500)
Minimal	Dark CC: base - 200. Light CC: base + 200



minimals of following based color should be using the steps below
200 base color -  400 step
300 - 500
400 - 600
500 - 700
600 - 800
700 - 900
800 -1000
900 - 1100 
1000 - 1200
1100 - 1300
1200 - 1000
1300 - 1100
1400 - 1200
1500 - 1300
1600 - 1400
1700 - 1500
1800 - 1600
1900 - 1700
2000 - 1800
2100 - 1900
2200 - 2000
2300 - 2100
2400 - 2200
2500 - 2300



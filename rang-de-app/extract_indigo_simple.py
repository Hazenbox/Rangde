#!/usr/bin/env python3
"""
Extract Indigo color hex values (200-2500) from JSON by finding variables with direct RGB values
"""

import json
import re
from pathlib import Path

def extract_indigo_colors(json_path):
    """Extract Indigo color values from JSON"""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    colors = {}
    collections = data.get('collections', [])
    
    for collection in collections:
        variables = collection.get('variables', [])
        
        for var in variables:
            name = var.get('name', '')
            
            # Look for Indigo Surface variables
            match = re.search(r'Indigo/(\d+)/Surface', name)
            if match:
                step = int(match.group(1))
                        if 200 <= step <= 2500:
                    # Try to get RGB values directly or from alias
                    values = var.get('valuesByMode', {})
                    
                    for mode_id, mode_value in values.items():
                        if isinstance(mode_value, dict):
                            # Direct RGB values
                            if 'r' in mode_value and 'g' in mode_value and 'b' in mode_value:
                                r = mode_value['r']
                                g = mode_value['g']
                                b = mode_value['b']
                                
                                # Convert to 0-255 range if in 0-1 range
                                if r <= 1:
                                    r = int(round(r * 255))
                                    g = int(round(g * 255))
                                    b = int(round(b * 255))
                                else:
                                    r = int(round(r))
                                    g = int(round(g))
                                    b = int(round(b))
                                
                                hex_val = f"#{r:02x}{g:02x}{b:02x}".upper()
                                colors[step] = hex_val
                                break
    
    # If we didn't find direct values, try to infer from High/Medium/Low scales
    # which might have the base color information
    if len(colors) < 10:
        print("⚠️  Found few direct values. The PDF might be needed for complete extraction.")
        print("   You may need to manually extract colors from the PDF or use a PDF color picker tool.")
    
    return colors

def main():
    json_path = Path("Raw data/OneUI Foundationss [POC]-variables-full.json")
    
    if not json_path.exists():
        print(f"Error: {json_path} not found")
        return
    
    print(f"Extracting Indigo colors from {json_path}...")
    colors = extract_indigo_colors(json_path)
    
    if colors:
        sorted_colors = sorted(colors.items())
        
        print("\n=== Extracted Indigo Colors ===")
        print("const indigoColors = {")
        for step, hex_val in sorted_colors:
            print(f"  {step}: '{hex_val}',")
        print("};")
        
        # Show missing steps
        all_steps = [200, 300, 400, 500, 600, 700, 800, 900, 1000,
                     1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000,
                     2100, 2200, 2300, 2400, 2500]
        missing = [s for s in all_steps if s not in colors]
        if missing:
            print(f"\n⚠️  Missing steps ({len(missing)}): {missing}")
            print("\nTo extract from PDF, install pdfplumber:")
            print("  pip install pdfplumber")
            print("Then run: python3 extract_indigo_colors.py")
    else:
        print("\n❌ No colors found in JSON.")
        print("\nThe PDF appears to be image-based. Options:")
        print("1. Use a PDF viewer with color picker (e.g., Adobe Acrobat)")
        print("2. Convert PDF pages to images and use a color picker tool")
        print("3. Install pdfplumber: pip install pdfplumber")
        print("   Then run: python3 extract_indigo_colors.py")

if __name__ == "__main__":
    main()

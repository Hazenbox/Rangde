#!/usr/bin/env python3
"""
Extract Indigo color hex values (200-2500) from JSON file
by resolving variable aliases to actual color values
"""

import json
import re
from pathlib import Path

def extract_indigo_colors(json_path):
    """Extract Indigo color values from JSON"""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Step 1: Build a map of variable IDs to their definitions
    variable_map = {}
    indigo_surface_aliases = {}
    
    # Navigate the JSON structure: collections -> variables
    collections = data.get('collections', [])
    for collection in collections:
        variables = collection.get('variables', [])
        for var in variables:
            var_id = var.get('id', '')
            var_name = var.get('name', '')
            
            # Store variable definition
            variable_map[var_id] = var
            
            # Check if it's an Indigo Surface
            if '/Surface' in var_name and 'Indigo/' in var_name:
                match = re.search(r'Indigo/(\d+)/Surface', var_name)
                if match:
                    step = int(match.group(1))
                                if 200 <= step <= 2500:
                        # Get the variable alias ID
                        values = var.get('valuesByMode', {})
                        for mode_id, mode_value in values.items():
                            if isinstance(mode_value, dict) and mode_value.get('type') == 'VARIABLE_ALIAS':
                                alias_id = mode_value.get('id', '')
                                # Extract base ID (before /)
                                base_id = alias_id.split('/')[0] if '/' in alias_id else alias_id
                                indigo_surface_aliases[step] = base_id
    
    # Step 2: Resolve variable aliases to actual color values
    colors = {}
    
    for step, base_id in indigo_surface_aliases.items():
        # Find the variable definition
        var_def = variable_map.get(base_id)
        if var_def:
            # Get the actual color value
            values = var_def.get('valuesByMode', {})
            for mode_id, mode_value in values.items():
                if isinstance(mode_value, dict):
                    # Check if it has RGB values
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
                        
                        # Convert to hex
                        hex_val = f"#{r:02x}{g:02x}{b:02x}".upper()
                        colors[step] = hex_val
                        break
    
    return colors

def main():
    json_path = Path("Raw data/OneUI Foundationss [POC]-variables-full.json")
    
    if not json_path.exists():
        print(f"Error: {json_path} not found")
        return
    
    print(f"Extracting Indigo colors from {json_path}...")
    colors = extract_indigo_colors(json_path)
    
    if not colors:
        print("No colors found. The JSON might use a different structure.")
        return
    
    # Sort by step number
    sorted_colors = sorted(colors.items())
    
    # Output as JSON
    print("\n=== Extracted Indigo Colors (JSON format) ===")
    print("{")
    for step, hex_val in sorted_colors:
        print(f'  "{step}": "{hex_val}",')
    print("}")
    
    # Output as TypeScript/JavaScript object
    print("\n\n=== TypeScript/JavaScript format ===")
    print("const indigoColors = {")
    for step, hex_val in sorted_colors:
        print(f"  {step}: '{hex_val}',")
    print("};")
    
    # Show which steps are missing
    all_steps = [200, 300, 400, 500, 600, 700, 800, 900, 1000,
                 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000,
                 2100, 2200, 2300, 2400, 2500]
    missing = [s for s in all_steps if s not in colors]
    if missing:
        print(f"\n⚠️  Missing steps: {missing}")

if __name__ == "__main__":
    main()

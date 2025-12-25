#!/usr/bin/env python3
"""
Extract Indigo color hex values (200-2500) from indigo.pdf
"""

import sys
import re
from pathlib import Path

def extract_colors_from_pdf(pdf_path):
    """Extract color values from PDF"""
    colors = {}
    
    try:
        # Try pdfplumber first (better for tables and structured data)
        try:
            import pdfplumber
            
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    print(f"Processing page {page_num + 1}...")
                    
                    # Extract text
                    text = page.extract_text()
                    if text:
                        # Look for hex patterns
                        hex_pattern = r'#([0-9A-Fa-f]{6})'
                        hex_matches = re.findall(hex_pattern, text)
                        
                        # Look for step numbers followed by hex
                        step_hex_pattern = r'(\d{3,4})\s*[:\-]?\s*#?([0-9A-Fa-f]{6})'
                        step_matches = re.findall(step_hex_pattern, text)
                        
                        for step, hex_val in step_matches:
                            step_num = int(step)
                            if 200 <= step_num <= 2500:
                                colors[step_num] = f"#{hex_val.upper()}"
                        
                        # Also look for standalone hex values
                        for hex_val in hex_matches:
                            if hex_val not in colors.values():
                                # Try to find associated step number
                                pass
                    
                    # Extract tables
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            for cell in row:
                                if cell:
                                    # Look for step numbers
                                    step_match = re.search(r'(\d{3,4})', str(cell))
                                    hex_match = re.search(r'#?([0-9A-Fa-f]{6})', str(cell))
                                    if step_match and hex_match:
                                        step_num = int(step_match.group(1))
                                        if 200 <= step_num <= 2500:
                                            colors[step_num] = f"#{hex_match.group(1).upper()}"
        
        except ImportError:
            print("pdfplumber not available, trying PyPDF2...")
            import PyPDF2
            
            with open(pdf_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page_num, page in enumerate(reader.pages):
                    print(f"Processing page {page_num + 1}...")
                    text = page.extract_text()
                    
                    if text:
                        # Look for hex patterns
                        step_hex_pattern = r'(\d{3,4})\s*[:\-]?\s*#?([0-9A-Fa-f]{6})'
                        step_matches = re.findall(step_hex_pattern, text)
                        
                        for step, hex_val in step_matches:
                            step_num = int(step)
                            if 200 <= step_num <= 2500:
                                colors[step_num] = f"#{hex_val.upper()}"
    
    except Exception as e:
        print(f"Error extracting from PDF: {e}")
        print("\nTrying alternative method: extracting raw text...")
        
        # Fallback: try to extract from raw PDF text
        with open(pdf_path, 'rb') as f:
            content = f.read().decode('latin-1', errors='ignore')
            
            # Look for hex patterns in raw content
            hex_pattern = r'#([0-9A-Fa-f]{6})'
            hex_matches = re.findall(hex_pattern, content)
            
            step_hex_pattern = r'(\d{3,4})\s*[:\-]?\s*#?([0-9A-Fa-f]{6})'
            step_matches = re.findall(step_hex_pattern, content)
            
            for step, hex_val in step_matches:
                step_num = int(step)
                if 100 <= step_num <= 2500:
                    colors[step_num] = f"#{hex_val.upper()}"
    
    return colors

def main():
    pdf_path = Path("Raw data/indigo.pdf")
    
    if not pdf_path.exists():
        print(f"Error: {pdf_path} not found")
        sys.exit(1)
    
    print(f"Extracting colors from {pdf_path}...")
    colors = extract_colors_from_pdf(pdf_path)
    
    if not colors:
        print("\nNo colors found in PDF. The PDF might be image-based.")
        print("Please check if the PDF contains text or if colors are in images.")
        print("\nYou may need to:")
        print("1. Use a PDF viewer to manually extract colors")
        print("2. Convert PDF to images and use a color picker tool")
        print("3. Check if colors are available in the JSON file instead")
        sys.exit(1)
    
    # Sort by step number
    sorted_colors = sorted(colors.items())
    
    # Output as JSON
    print("\nExtracted colors:")
    print("{")
    for step, hex_val in sorted_colors:
        print(f'  "{step}": "{hex_val}",')
    print("}")
    
    # Also output as TypeScript/JavaScript object
    print("\n\nTypeScript/JavaScript format:")
    print("const indigoColors = {")
    for step, hex_val in sorted_colors:
        print(f"  {step}: '{hex_val}',")
    print("};")

if __name__ == "__main__":
    main()

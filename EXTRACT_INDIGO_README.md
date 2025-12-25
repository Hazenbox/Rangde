# Extracting Indigo Colors from PDF

The `indigo.pdf` file appears to be an image-based PDF (visual color palette) rather than text-based, which makes automatic extraction difficult.

## Option 1: Install pdfplumber (Recommended)

```bash
pip install pdfplumber
python3 extract_indigo_colors.py
```

This will attempt to extract text and tables from the PDF.

## Option 2: Manual Extraction

1. Open `indigo.pdf` in a PDF viewer (Adobe Acrobat, Preview, etc.)
2. Use a color picker tool to extract hex values for each step (200-2500)
3. Create a file with the colors in this format:

```javascript
const indigoColors = {
  100: '#HEXVAL',
  200: '#HEXVAL',
  // ... etc
  2500: '#HEXVAL'
};
```

## Option 3: Use Online Tools

1. Convert PDF to images using an online converter
2. Use a color picker tool (like ColorPick Eyedropper browser extension)
3. Extract colors from the images

## Option 4: Check if colors are in another format

The colors might be available in:
- Design tool exports (Figma, Sketch, etc.)
- CSS/SCSS files
- Other JSON files with resolved color values

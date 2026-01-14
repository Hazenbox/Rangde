# Quick Start: Three-Layer Token Architecture

## 🚀 What's New

Your Rangde collections now support a **three-layer semantic token architecture** that matches Figma Variables best practices.

## 🎨 The Three Layers

### 1. **Primitive** (Blue Badge - "P")
- **Purpose**: Base color palette
- **Contains**: Concrete hex values only (#FF0000, #00FF00, etc.)
- **Cannot**: Have aliases
- **Example**: "Brand Colors" with red-500, blue-700, etc.

### 2. **Semantic** (Purple Badge - "S")
- **Purpose**: Intent-based design tokens
- **Contains**: Aliases to Primitive colors
- **Can only alias**: Primitives
- **Example**: "States" with danger → red-500, success → green-500

### 3. **Theme** (Pink Badge - "T")
- **Purpose**: Brand/context-specific tokens
- **Contains**: Aliases to Semantic tokens
- **Can only alias**: Semantic
- **Example**: "Dark Theme" with button-primary → danger

## 📋 Step-by-Step Tutorial

### Step 1: Create Your Base Colors (Primitive)

1. Click the **"+"** button in Collections view
2. Enter name: `Brand Colors`
3. Click **Primitive** button (turns blue)
4. Click **Create**
5. Double-click the collection to open editor
6. Add concrete color values:
   - `red-500` = #EF4444
   - `blue-500` = #3B82F6
   - `green-500` = #10B981

### Step 2: Create Semantic Tokens

1. Click **"+"** again
2. Enter name: `Semantic`
3. Click **Semantic** button (turns purple)
4. Click **Create**
5. Open editor and add variables:
   - `danger` → Alias to "Brand Colors/red-500"
   - `info` → Alias to "Brand Colors/blue-500"
   - `success` → Alias to "Brand Colors/green-500"

### Step 3: Create Theme Tokens

1. Click **"+"** again
2. Enter name: `Light Theme`
3. Click **Theme** button (turns pink)
4. Click **Create**
5. Open editor and add variables:
   - `button-primary` → Alias to "Semantic/danger"
   - `button-secondary` → Alias to "Semantic/info"
   - `status-ok` → Alias to "Semantic/success"

### Step 4: Auto-Arrange

1. Click the **LayoutGrid** icon (📊) in toolbar
2. Collections automatically organize into columns:
   - Left column: Primitives
   - Middle column: Semantic
   - Right column: Theme

### Step 5: Validate

1. Click any collection node to open details panel
2. Check for validation alerts:
   - 🔴 **Red alerts** = Errors (must fix before export)
   - ⚠️ **Amber alerts** = Warnings (best practice recommendations)

### Step 6: Export

1. Click **Download** button
2. Select collections to export
3. Layer metadata is included in JSON
4. Import to Figma with full structure preserved

## 🎯 Visual Indicators

### Collection Node Badges
- **P** in blue = Primitive layer
- **S** in purple = Semantic layer
- **T** in pink = Theme layer
- No badge = No layer assigned (flexible)

### Details Panel
- Layer name shown next to collection name
- Validation section appears if issues found
- Errors prevent export, warnings are advisory

### Canvas Layout
```
[Primitive]     [Semantic]      [Theme]
   (Blue)        (Purple)        (Pink)
     |              |              |
     └──────────────┴──────────────┘
             Alias Flow →
```

## ❌ What Will Be Blocked

### Invalid Alias Attempts:
- ❌ Primitive → Any (primitives cannot have aliases)
- ❌ Semantic → Theme (semantic must alias primitives)
- ❌ Theme → Primitive (theme must alias semantic, not skip levels)
- ❌ Any layer → Self (no circular references)

When you try to create an invalid connection, you'll see:
```
Cannot create connection: Semantic collections can only alias 
Primitive collections (target is theme)
```

## ✅ Best Practices

1. **Start with Primitives**: Build your color palette first
2. **Use Semantic for Meaning**: danger, warning, success (not red, yellow, green)
3. **Theme for Context**: light/dark themes, brand variations
4. **Layer is Optional**: Existing collections work unchanged
5. **Auto-Arrange Often**: Keeps visual structure clean
6. **Check Validation**: Fix red errors before export

## 🔧 Advanced Features

### Multi-Mode Support
- Each layer can have multiple modes (Light, Dark, etc.)
- Aliases resolve per-mode automatically
- Mode mismatches show warnings

### Cross-Collection References
- Edges show alias relationships
- Animated edges for cross-collection refs
- Count badge shows number of references

### Backward Compatibility
- Collections without layers work as before
- No forced migration required
- Layer assignment is always optional

## 🆘 Troubleshooting

### "Cannot create connection" error
- **Check**: Are you connecting in the right direction?
- **Fix**: Semantic → Primitive, Theme → Semantic

### Warning: "variable has no aliases"
- **Meaning**: Semantic/Theme variables should use aliases
- **Fix**: Change from color to alias, or ignore if intentional

### Error: "primitive collections cannot have aliases"
- **Meaning**: You set a Primitive variable to alias another
- **Fix**: Either remove layer, or change value to concrete color

### Collections not arranging correctly
- **Check**: Are layers assigned?
- **Fix**: Edit collection and select appropriate layer

## 📊 Example System

```
Collection: "Colors" (Primitive)
  ├─ red-50: #FEF2F2
  ├─ red-500: #EF4444
  └─ red-900: #7F1D1D

Collection: "Semantic" (Semantic)
  ├─ danger: → Colors/red-500
  ├─ danger-light: → Colors/red-50
  └─ danger-dark: → Colors/red-900

Collection: "Light Theme" (Theme)
  ├─ button-primary: → Semantic/danger
  ├─ alert-bg: → Semantic/danger-light
  └─ alert-border: → Semantic/danger-dark
```

## 🎓 Learn More

- See `THREE_LAYER_IMPLEMENTATION.md` for technical details
- Check validation rules in `src/lib/collection-validator.ts`
- Review example exports in Figma JSON format

---

**Happy token building! 🎨**

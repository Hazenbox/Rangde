<div align="center">

# 🎨 Rang De

### **The Intelligent Color Scale Generator for Accessible Design Systems**

*Generate WCAG-compliant color scales automatically. Build beautiful, accessible interfaces with confidence.*

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)](https://react.dev/)

**[🌐 Live Demo](https://rang-de-one.vercel.app)** • **[📖 Documentation](./docs/)** • **[🤝 Contributing](./CONTRIBUTING.md)**

---

</div>

## 🎯 What is Rang De?

**Rang De** (meaning "Give Color" in Hindi) is a powerful, web-based tool that solves one of the biggest challenges in design system development: **creating accessible color scales that meet WCAG 2.1 standards**.

### The Problem

Designing color systems is hard. You need to:
- ✅ Ensure text is readable on every background
- ✅ Meet accessibility standards (WCAG AA/AAA)
- ✅ Generate consistent scales across 24 color steps
- ✅ Calculate contrast ratios accurately
- ✅ Handle both light and dark themes

**Doing this manually is time-consuming, error-prone, and often results in inconsistent designs.**

### The Solution

Rang De automates the entire process. Simply define your base colors, and the tool instantly generates **7 different scale types** (High, Medium, Low, Bold, BoldA11Y, Heavy, Minimal) for all 24 steps in your palette, each meeting WCAG 2.1 compliance standards.

---

## ✨ Why Choose Rang De?

### 🚀 **Instant Scale Generation**
Define your palette once, get all scales automatically. No manual calculations, no guesswork.

### ♿ **Built-in Accessibility**
Every generated color meets WCAG 2.1 standards. See contrast ratios and compliance levels at a glance.

### 🎨 **Smart Color Logic**
Automatically determines whether to use dark or light contrasting colors based on surface lightness.

### 📊 **Visual Scale Preview**
See all your scales in an organized grid. Understand how colors work together before implementing.

### 💾 **Persistent Storage**
Save multiple palettes, switch between them, and export as JSON or CSS variables.

### 🌓 **Theme Support**
Works seamlessly in light and dark modes.

---

## 🎬 How It Works

### Step 1: Define Your Palette
Set colors for steps 200-2500 (from darkest to lightest). These are your base colors.

### Step 2: Choose Primary Step
Select your primary color step (default: 600). This is used as the starting point for Bold calculations.

### Step 3: Automatic Generation
Rang De automatically generates **7 scale types** for each step:

| Scale | Purpose | Contrast Target |
|-------|---------|----------------|
| **Surface** | Base background color | - |
| **High** | Maximum contrast | Uses darkest/lightest step |
| **Medium** | Balanced contrast | Midpoint between High and Low |
| **Low** | Minimum readable contrast | 4.5:1 (WCAG AA) |
| **Bold** | Strong emphasis | 3.0:1 minimum |
| **BoldA11Y** | Accessible emphasis | 4.5:1 (WCAG AA) |
| **Heavy** | Enhanced contrast | Context-dependent |
| **Minimal** | Subtle variation | ±200 steps from surface |

### Step 4: Export & Use
Export your palette as JSON or CSS variables and integrate into your design system.

---

## 🎨 Scale Types Explained

### **High** - Maximum Contrast
Uses the darkest (step 200) or lightest (step 2500) color for maximum readability. Perfect for critical text and important UI elements.

### **Medium** - Balanced Contrast
A middle ground between maximum contrast and minimum readable contrast. Great for secondary text and balanced designs.

### **Low** - Minimum Readable
Calculated to achieve exactly 4.5:1 contrast ratio (WCAG AA standard). The most subtle readable option.

### **Bold** - Strong Emphasis
Starts from your primary step and ensures at least 3.0:1 contrast. Perfect for headings and emphasis.

### **BoldA11Y** - Accessible Emphasis
Like Bold, but ensures 4.5:1 contrast for full accessibility compliance. Ideal for important text.

### **Heavy** - Enhanced Contrast
Context-aware scale that provides enhanced contrast based on surface darkness. Adapts intelligently.

### **Minimal** - Subtle Variation
A gentle shift from the surface color (±200 steps). Perfect for subtle UI elements and borders.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18 or higher
- **npm**, **yarn**, **pnpm**, or **bun**

### Installation

```bash
# Clone the repository
git clone https://github.com/Hazenbox/Rangde.git
cd rang-de-app

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start creating!

---

## 📚 Features in Detail

### 🎨 Interactive Palette Editor
- Visual color picker for each step
- Real-time preview of changes
- Multiple palette management
- Rename, duplicate, and delete palettes

### ♿ WCAG 2.1 Compliance
- Automatic contrast ratio calculations
- Visual indicators for AA/AAA compliance
- Separate checks for normal text, large text, and graphics
- Real-time compliance feedback

### 📊 Comprehensive Scale Preview
- Grid view of all scales
- Color swatches with hex values
- Contrast ratio display
- WCAG compliance badges
- Copy individual colors or entire scales

### 💾 Export Options
- **JSON**: Export palette data for programmatic use
- **CSS Variables**: Ready-to-use CSS custom properties
- **SVG**: Export scale previews as SVG images

### 🔍 Built-in Documentation
- "How It Works" section explains the color logic
- Terminology guide
- WCAG standards reference
- Scale generation rules

---

## 🛠️ Tech Stack

Rang De is built with modern, production-ready technologies:

- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful UI components
- **[Zustand](https://github.com/pmndrs/zustand)** - Lightweight state management
- **[colord](https://github.com/omgovich/colord)** - Advanced color manipulation
- **[Vitest](https://vitest.dev/)** - Fast unit testing

---

## 📖 Documentation

- **[Color Logic Analysis](./docs/color-logic-analysis.md)** - Deep dive into color calculation algorithms
- **[Implementation Guide](./docs/implementation.md)** - Technical implementation details
- **[Green & Saffron Analysis](./docs/green-saffron-analysis.md)** - Case studies and examples

---

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report
```

### Project Structure

```
rang-de-app/
├── src/
│   ├── app/              # Next.js pages and routes
│   ├── components/       # React components
│   │   └── ui/          # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions
│   ├── store/           # State management
│   ├── types/           # TypeScript definitions
│   └── constants/       # App constants
├── __tests__/           # Test files
├── scripts/             # Build and utility scripts
├── docs/                # Documentation
└── assets/              # Static assets
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

---

## 📄 License

This project is private and proprietary.

---

## 🔗 Links

- **🌐 Live Application**: [rang-de-one.vercel.app](https://rang-de-one.vercel.app)
- **📦 Repository**: [GitHub](https://github.com/Hazenbox/Rangde)
- **📚 Documentation**: [docs/](./docs/)

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Color calculations based on [WCAG 2.1 guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- Icons from [Lucide](https://lucide.dev/)

---

<div align="center">

**Made with ❤️ for accessible design systems**

*Building better interfaces, one color at a time.*

[⬆ Back to Top](#-rang-de)

</div>

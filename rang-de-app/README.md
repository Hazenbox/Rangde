# Rang De - Color Scale Generator

A modern, accessible color scale generation tool for design systems with WCAG 2.1 compliance. Generate consistent, accessible color palettes with automatic contrast ratio calculations and scale generation.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)
![React](https://img.shields.io/badge/React-19.2-blue?style=flat&logo=react)

## ✨ Features

- 🎨 **Interactive Color Palette Editor** - Define base colors (steps 200-2500) and generate complete color scales
- ♿ **WCAG 2.1 Compliance** - Automatic contrast ratio calculations for accessibility
- 🌈 **Multiple Scale Types** - Generate High, Medium, Low, Bold, BoldA11Y, Heavy, and Minimal scales
- 💾 **Persistent Storage** - Save and manage multiple palettes with localStorage
- 🌓 **Theme Support** - Light and dark mode support
- 📊 **Visual Scale Preview** - See all generated scales in an organized grid view
- 📥 **Export Options** - Export palettes as JSON or CSS variables
- 🔍 **How It Works** - Built-in documentation explaining the color logic

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Hazenbox/Rangde.git
cd rang-de-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
rang-de-app/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   └── ui/          # shadcn/ui components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions
│   │   ├── color-utils.ts      # Color manipulation utilities
│   │   ├── scale-generator.ts  # Scale generation logic
│   │   └── utils.ts            # General utilities
│   ├── store/           # Zustand state management
│   ├── types/           # TypeScript type definitions
│   └── constants/      # App constants
├── __tests__/          # Test files
├── scripts/            # Build and utility scripts
├── docs/               # Documentation
├── assets/             # Static assets and raw data
└── public/             # Public static files
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage report

## 🎨 How It Works

Rang De generates color scales based on WCAG 2.1 accessibility guidelines:

1. **Define Base Colors**: Set colors for steps 200-2500 in your palette
2. **Select Primary Step**: Choose the primary color step (default: 600)
3. **Automatic Generation**: The tool automatically generates:
   - **High**: Maximum contrast using contrasting color
   - **Medium**: Mid-contrast with alpha blending
   - **Low**: Minimum 4.5:1 contrast for normal text
   - **Bold**: Minimum 3.0:1 contrast from primary step
   - **BoldA11Y**: Minimum 4.5:1 contrast for accessibility
   - **Heavy**: Enhanced contrast based on surface step
   - **Minimal**: Subtle contrast variation

Each scale is calculated to meet WCAG 2.1 compliance standards for:
- Normal text (AA: 4.5:1, AAA: 7:1)
- Large text (AA: 3:1, AAA: 4.5:1)
- Graphics/UI elements (AA: 3:1)

## 🧪 Testing

The project uses [Vitest](https://vitest.dev/) for testing:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📦 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Color Manipulation**: [colord](https://github.com/omgovich/colord)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react)

## 📚 Documentation

- [Color Logic Analysis](./docs/color-logic-analysis.md)
- [Implementation Guide](./docs/implementation.md)
- [Green & Saffron Analysis](./docs/green-saffron-analysis.md)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this project.

## 📄 License

This project is private and proprietary.

## 🔗 Links

- **Live Demo**: [rang-de-one.vercel.app](https://rang-de-one.vercel.app)
- **Repository**: [GitHub](https://github.com/Hazenbox/Rangde)

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Color calculations based on WCAG 2.1 guidelines

---

Made with ❤️ for accessible design systems

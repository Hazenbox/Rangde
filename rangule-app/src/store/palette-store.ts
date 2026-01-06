import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Step, PaletteSteps, StepScales } from "@/lib/color-utils";
import { generateAllScales, createDefaultPalette } from "@/lib/scale-generator";

export type GeneratedScalesMap = Record<Step, StepScales | null>;

export interface Palette {
  id: string;
  name: string;
  steps: PaletteSteps;
  primaryStep: Step;
  createdAt: number;
}

type ViewMode = "palette" | "how-it-works";

interface PaletteState {
  palettes: Palette[];
  activePaletteId: string | null;
  generatedScales: GeneratedScalesMap | null;
  viewMode: ViewMode;
  isFullscreen: boolean;
  
  // Actions
  createPalette: (name: string) => void;
  deletePalette: (id: string) => void;
  renamePalette: (id: string, name: string) => void;
  setActivePalette: (id: string) => void;
  updatePaletteStep: (paletteId: string, step: Step, hex: string) => void;
  updatePrimaryStep: (paletteId: string, step: Step) => void;
  regenerateScales: () => void;
  getActivePalette: () => Palette | null;
  setViewMode: (mode: ViewMode) => void;
  toggleFullscreen: () => void;
}

function generateId(): string {
  return `palette_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Default Indigo sample palette
const INDIGO_SAMPLE_PALETTE: Palette = {
  id: "sample_indigo_v2",
  name: "Sample - Indigo",
  primaryStep: 600,
  steps: {
    200: "#0b0034",
    300: "#170054",
    400: "#220071",
    500: "#2e008f",
    600: "#3900ad",
    700: "#421ebb",
    800: "#4c31cb",
    900: "#5540d8",
    1000: "#5f50e3",
    1100: "#685dec",
    1200: "#716bf3",
    1300: "#7c78f8",
    1400: "#8584fc",
    1500: "#8e90ff",
    1600: "#989bff",
    1700: "#a3a7ff",
    1800: "#aeb3ff",
    1900: "#b9beff",
    2000: "#c4c9ff",
    2100: "#d0d4ff",
    2200: "#dbdfff",
    2300: "#e7e9ff",
    2400: "#f3f4ff",
    2500: "#ffffff",
  } as PaletteSteps,
  createdAt: 0,
};

export const usePaletteStore = create<PaletteState>()(
  persist(
    (set, get) => ({
      palettes: [INDIGO_SAMPLE_PALETTE],
      activePaletteId: INDIGO_SAMPLE_PALETTE.id,
      generatedScales: generateAllScales(INDIGO_SAMPLE_PALETTE.steps, INDIGO_SAMPLE_PALETTE.primaryStep),
      viewMode: "palette" as ViewMode,
      isFullscreen: false,

      createPalette: (name: string) => {
        const newPalette: Palette = {
          id: generateId(),
          name,
          steps: createDefaultPalette(),
          primaryStep: 600,
          createdAt: Date.now()
        };

        set((state) => ({
          palettes: [...state.palettes, newPalette],
          activePaletteId: newPalette.id,
          generatedScales: generateAllScales(newPalette.steps, newPalette.primaryStep)
        }));
      },

      deletePalette: (id: string) => {
        set((state) => {
          const newPalettes = state.palettes.filter((p) => p.id !== id);
          const newActiveId = state.activePaletteId === id
            ? (newPalettes[0]?.id || null)
            : state.activePaletteId;
          
          const activePalette = newPalettes.find(p => p.id === newActiveId);
          
          return {
            palettes: newPalettes,
            activePaletteId: newActiveId,
            generatedScales: activePalette ? generateAllScales(activePalette.steps, activePalette.primaryStep) : null
          };
        });
      },

      renamePalette: (id: string, name: string) => {
        set((state) => ({
          palettes: state.palettes.map((p) =>
            p.id === id ? { ...p, name } : p
          )
        }));
      },

      setActivePalette: (id: string) => {
        const palette = get().palettes.find((p) => p.id === id);
        if (palette) {
          set({
            activePaletteId: id,
            generatedScales: generateAllScales(palette.steps, palette.primaryStep)
          });
        }
      },

      updatePaletteStep: (paletteId: string, step: Step, hex: string) => {
        set((state) => {
          const newPalettes = state.palettes.map((p) => {
            if (p.id === paletteId) {
              return {
                ...p,
                steps: { ...p.steps, [step]: hex }
              };
            }
            return p;
          });

          const updatedPalette = newPalettes.find((p) => p.id === paletteId);
          
          return {
            palettes: newPalettes,
            generatedScales: updatedPalette && state.activePaletteId === paletteId
              ? generateAllScales(updatedPalette.steps, updatedPalette.primaryStep)
              : state.generatedScales
          };
        });
      },

      updatePrimaryStep: (paletteId: string, step: Step) => {
        set((state) => {
          const newPalettes = state.palettes.map((p) => {
            if (p.id === paletteId) {
              return { ...p, primaryStep: step };
            }
            return p;
          });

          const updatedPalette = newPalettes.find((p) => p.id === paletteId);
          
          return {
            palettes: newPalettes,
            generatedScales: updatedPalette && state.activePaletteId === paletteId
              ? generateAllScales(updatedPalette.steps, updatedPalette.primaryStep)
              : state.generatedScales
          };
        });
      },

      regenerateScales: () => {
        const palette = get().getActivePalette();
        if (palette) {
          set({ generatedScales: generateAllScales(palette.steps, palette.primaryStep) });
        }
      },

      getActivePalette: () => {
        const state = get();
        return state.palettes.find((p) => p.id === state.activePaletteId) || null;
      },

      setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode });
      },

      toggleFullscreen: () => {
        set((state) => ({ isFullscreen: !state.isFullscreen }));
      }
    }),
    {
      name: "rangule-palettes",
      partialize: (state) => ({
        palettes: state.palettes,
        activePaletteId: state.activePaletteId
      }),
      // Merge function to ensure sample palette exists for existing users
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PaletteState>;
        let palettes = persisted.palettes || [];
        
        // Remove old sample palettes and add the fresh one
        const oldSampleIds = ["sample_indigo", "sample_indigo_v2"];
        palettes = palettes.filter(p => !oldSampleIds.includes(p.id));
        
        // Ensure all palettes have primaryStep (migration for existing palettes)
        palettes = palettes.map(p => ({
          ...p,
          primaryStep: p.primaryStep || 600
        }));
        
        const mergedPalettes = [INDIGO_SAMPLE_PALETTE, ...palettes];
        
        // Set active palette - use persisted if valid, otherwise use sample
        const activePaletteId = persisted.activePaletteId && mergedPalettes.some(p => p.id === persisted.activePaletteId)
          ? persisted.activePaletteId
          : INDIGO_SAMPLE_PALETTE.id;
        
        const activePalette = mergedPalettes.find(p => p.id === activePaletteId);
        
        return {
          ...currentState,
          palettes: mergedPalettes,
          activePaletteId,
          generatedScales: activePalette ? generateAllScales(activePalette.steps, activePalette.primaryStep) : null
        };
      }
    }
  )
);

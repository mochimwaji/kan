/**
 * Theme preset definitions for workspace color configuration
 */

export interface ThemeColors {
  preset: string;
  sidebar: string;
  pages: string;
  boardBackground: string;
  button: string;
  menu: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    light: Omit<ThemeColors, "preset">;
    dark: Omit<ThemeColors, "preset">;
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "default-light",
    name: "Default Light",
    description: "Clean and minimal light theme",
    colors: {
      light: {
        sidebar: "#ffffff",
        pages: "#f8f8f8",
        boardBackground: "#f5f5f5",
        button: "#e5e5e5",
        menu: "#ffffff",
      },
      dark: {
        sidebar: "#161616",
        pages: "#1c1c1c",
        boardBackground: "#232323",
        button: "#2a2a2a",
        menu: "#1c1c1c",
      },
    },
  },
  {
    id: "default-dark",
    name: "Default Dark",
    description: "Dark theme for reduced eye strain",
    colors: {
      light: {
        sidebar: "#1a1a2e",
        pages: "#16213e",
        boardBackground: "#1f2937",
        button: "#2a2a4e",
        menu: "#1a1a2e",
      },
      dark: {
        sidebar: "#0f0f1a",
        pages: "#12121f",
        boardBackground: "#1a1a2e",
        button: "#1f1f2f",
        menu: "#0f0f1a",
      },
    },
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    description: "Calm and professional blue tones",
    colors: {
      light: {
        sidebar: "#e0f2fe",
        pages: "#f0f9ff",
        boardBackground: "#e0f7fa",
        button: "#bae6fd",
        menu: "#e0f2fe",
      },
      dark: {
        sidebar: "#0c2d48",
        pages: "#0e3654",
        boardBackground: "#134b70",
        button: "#164e63",
        menu: "#0c2d48",
      },
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    description: "Nature-inspired green palette",
    colors: {
      light: {
        sidebar: "#dcfce7",
        pages: "#f0fdf4",
        boardBackground: "#ecfdf5",
        button: "#bbf7d0",
        menu: "#dcfce7",
      },
      dark: {
        sidebar: "#14532d",
        pages: "#166534",
        boardBackground: "#15803d",
        button: "#166534",
        menu: "#14532d",
      },
    },
  },
  {
    id: "sunset-warm",
    name: "Sunset Warm",
    description: "Warm orange and coral accents",
    colors: {
      light: {
        sidebar: "#fff7ed",
        pages: "#fffbeb",
        boardBackground: "#fef3c7",
        button: "#fed7aa",
        menu: "#fff7ed",
      },
      dark: {
        sidebar: "#431407",
        pages: "#451a03",
        boardBackground: "#78350f",
        button: "#7c2d12",
        menu: "#431407",
      },
    },
  },
  {
    id: "lavender-dream",
    name: "Lavender Dream",
    description: "Soft purple and violet hues",
    colors: {
      light: {
        sidebar: "#f3e8ff",
        pages: "#faf5ff",
        boardBackground: "#f5f3ff",
        button: "#e9d5ff",
        menu: "#f3e8ff",
      },
      dark: {
        sidebar: "#2e1065",
        pages: "#3b0764",
        boardBackground: "#4c1d95",
        button: "#581c87",
        menu: "#2e1065",
      },
    },
  },
  {
    id: "slate-gray",
    name: "Slate Gray",
    description: "Modern neutral gray palette",
    colors: {
      light: {
        sidebar: "#f1f5f9",
        pages: "#f8fafc",
        boardBackground: "#e2e8f0",
        button: "#cbd5e1",
        menu: "#f1f5f9",
      },
      dark: {
        sidebar: "#1e293b",
        pages: "#0f172a",
        boardBackground: "#334155",
        button: "#475569",
        menu: "#1e293b",
      },
    },
  },
];

export const DEFAULT_THEME_COLORS: ThemeColors = {
  preset: "default-light",
  sidebar: "#ffffff",
  pages: "#f8f8f8",
  boardBackground: "#f5f5f5",
  button: "#e5e5e5",
  menu: "#ffffff",
};

export function getPresetById(presetId: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === presetId);
}

export function getPresetColors(
  presetId: string,
  mode: "light" | "dark",
): Omit<ThemeColors, "preset"> {
  const preset = getPresetById(presetId);
  if (!preset) {
    return DEFAULT_THEME_COLORS;
  }
  return preset.colors[mode];
}

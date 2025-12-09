import type { ReactNode } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ThemeColors } from "~/utils/themePresets";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { getContrastColor } from "~/utils/colorUtils";
import {
  DEFAULT_THEME_COLORS,
  getPresetColors,
  THEME_PRESETS,
} from "~/utils/themePresets";

interface ColorThemeContextProps {
  themeColors: ThemeColors;
  setThemeColors: (colors: ThemeColors) => void;
  applyPreset: (presetId: string) => void;
  saveThemeColors: () => Promise<void>;
  isSaving: boolean;
  isDirty: boolean;
  presets: typeof THEME_PRESETS;
  activeTheme: "light" | "dark";
}

const ColorThemeContext = createContext<ColorThemeContextProps | undefined>(
  undefined,
);

const STORAGE_KEY = "kan-theme-colors";

function applyColorsToDocument(colors: ThemeColors, isDark: boolean) {
  const root = document.documentElement;

  // Get colors based on preset or custom
  const isCustom = colors.preset === "custom";
  const presetColors = !isCustom
    ? getPresetColors(colors.preset, isDark ? "dark" : "light")
    : null;

  const sidebar = isCustom
    ? colors.sidebar
    : (presetColors?.sidebar ?? colors.sidebar);
  const pages = isCustom ? colors.pages : (presetColors?.pages ?? colors.pages);
  const boardBackground = isCustom
    ? colors.boardBackground
    : (presetColors?.boardBackground ?? colors.boardBackground);
  const button = isCustom
    ? colors.button
    : (presetColors?.button ?? colors.button);
  const menu = isCustom ? colors.menu : (presetColors?.menu ?? colors.menu);

  // Set background colors
  root.style.setProperty("--kan-sidebar-bg", sidebar);
  root.style.setProperty("--kan-pages-bg", pages);
  root.style.setProperty("--kan-board-bg", boardBackground);
  root.style.setProperty("--kan-button-bg", button);
  root.style.setProperty("--kan-menu-bg", menu);

  // Set text contrast colors
  root.style.setProperty("--kan-sidebar-text", getContrastColor(sidebar));
  root.style.setProperty("--kan-pages-text", getContrastColor(pages));
  root.style.setProperty("--kan-board-text", getContrastColor(boardBackground));
  root.style.setProperty("--kan-button-text", getContrastColor(button));
  root.style.setProperty("--kan-menu-text", getContrastColor(menu));
}

export const ColorThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [themeColors, setThemeColorsState] =
    useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const [savedColors, setSavedColors] =
    useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">("light");

  const { workspace } = useWorkspace();

  const utils = api.useUtils();

  const updateThemeMutation = api.workspace.updateThemeColors.useMutation({
    onSuccess: () => {
      setSavedColors(themeColors);
      utils.workspace.byId.invalidate({
        workspacePublicId: workspace.publicId,
      });
    },
  });

  // Check for workspace theme colors
  const { data: workspaceData } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId },
  );

  // Detect system/user dark mode preference
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setActiveTheme(isDark ? "dark" : "light");
    };

    checkDarkMode();

    // Watch for class changes on document
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Load theme colors from workspace or localStorage
  useEffect(() => {
    if (workspaceData?.themeColors) {
      const colors = workspaceData.themeColors as ThemeColors;
      setThemeColorsState(colors);
      setSavedColors(colors);
    } else {
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const colors = JSON.parse(stored) as ThemeColors;
          setThemeColorsState(colors);
          setSavedColors(colors);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [workspaceData]);

  // Apply colors when they change or theme mode changes
  useEffect(() => {
    applyColorsToDocument(themeColors, activeTheme === "dark");
  }, [themeColors, activeTheme]);

  const setThemeColors = useCallback((colors: ThemeColors) => {
    setThemeColorsState(colors);
    // Also update localStorage for immediate local persistence
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, []);

  const applyPreset = useCallback(
    (presetId: string) => {
      const presetColors = getPresetColors(presetId, activeTheme);
      setThemeColors({
        preset: presetId,
        ...presetColors,
      });
    },
    [activeTheme, setThemeColors],
  );

  const saveThemeColors = useCallback(async () => {
    if (!workspace.publicId) return;

    setIsSaving(true);
    try {
      await updateThemeMutation.mutateAsync({
        workspacePublicId: workspace.publicId,
        themeColors,
      });
    } finally {
      setIsSaving(false);
    }
  }, [workspace.publicId, themeColors, updateThemeMutation]);

  const isDirty = JSON.stringify(themeColors) !== JSON.stringify(savedColors);

  return (
    <ColorThemeContext.Provider
      value={{
        themeColors,
        setThemeColors,
        applyPreset,
        saveThemeColors,
        isSaving,
        isDirty,
        presets: THEME_PRESETS,
        activeTheme,
      }}
    >
      {children}
    </ColorThemeContext.Provider>
  );
};

export const useColorTheme = (): ColorThemeContextProps => {
  const context = useContext(ColorThemeContext);
  if (!context) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider");
  }
  return context;
};

/**
 * Theme utility functions for applying workspace theme colors to the document.
 * Consolidates duplicate logic from colorTheme.tsx and useApplyThemeColors.ts
 */

import type { ThemeColors } from "./themePresets";
import { getContrastColor } from "./colorUtils";
import { getPresetColors } from "./themePresets";

/**
 * Resolves theme colors based on preset or custom configuration.
 * If using a preset, returns the appropriate light/dark variant.
 * If using custom colors, returns the custom colors directly.
 */
export function resolveThemeColors(
  colors: ThemeColors,
  isDark: boolean,
): Omit<ThemeColors, "preset"> {
  const isCustom = colors.preset === "custom";

  if (isCustom) {
    return {
      sidebar: colors.sidebar,
      pages: colors.pages,
      boardBackground: colors.boardBackground,
      button: colors.button,
      menu: colors.menu,
    };
  }

  const presetColors = getPresetColors(
    colors.preset,
    isDark ? "dark" : "light",
  );
  return {
    sidebar: presetColors?.sidebar ?? colors.sidebar,
    pages: presetColors?.pages ?? colors.pages,
    boardBackground: presetColors?.boardBackground ?? colors.boardBackground,
    button: presetColors?.button ?? colors.button,
    menu: presetColors?.menu ?? colors.menu,
  };
}

/**
 * Applies theme colors to the document root as CSS custom properties.
 * Also calculates and sets appropriate contrast text colors.
 */
export function applyColorsToDocument(
  colors: ThemeColors,
  isDark: boolean,
): void {
  const root = document.documentElement;
  const resolved = resolveThemeColors(colors, isDark);

  // Set background colors
  root.style.setProperty("--kan-sidebar-bg", resolved.sidebar);
  root.style.setProperty("--kan-pages-bg", resolved.pages);
  root.style.setProperty("--kan-board-bg", resolved.boardBackground);
  root.style.setProperty("--kan-button-bg", resolved.button);
  root.style.setProperty("--kan-menu-bg", resolved.menu);

  // Set text contrast colors for readability
  root.style.setProperty(
    "--kan-sidebar-text",
    getContrastColor(resolved.sidebar),
  );
  root.style.setProperty("--kan-pages-text", getContrastColor(resolved.pages));
  root.style.setProperty(
    "--kan-board-text",
    getContrastColor(resolved.boardBackground),
  );
  root.style.setProperty(
    "--kan-button-text",
    getContrastColor(resolved.button),
  );
  root.style.setProperty("--kan-menu-text", getContrastColor(resolved.menu));

  // Cache theme colors in localStorage for faster initial load (prevents flash)
  try {
    localStorage.setItem("kan-theme-cache", JSON.stringify(resolved));
  } catch {
    // Ignore localStorage errors (e.g., private browsing)
  }

  // Mark body as theme-ready to show content (CSS hides until this class is added)
  document.body.classList.add("theme-ready");
}

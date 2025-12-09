/**
 * Hook to load and apply workspace theme colors on app initialization
 */
import { useEffect } from "react";

import type { ThemeColors } from "~/utils/themePresets";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { getContrastColor } from "~/utils/colorUtils";
import { DEFAULT_THEME_COLORS, getPresetColors } from "~/utils/themePresets";

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

/**
 * Hook that loads workspace theme colors and applies them to the document.
 * Should be called once at the app root level (e.g., in Dashboard).
 */
export function useApplyThemeColors() {
  const { workspace } = useWorkspace();

  const { data: workspaceData } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId },
  );

  useEffect(() => {
    if (!workspaceData?.themeColors) {
      // Apply default theme if no custom theme is set
      const isDark = document.documentElement.classList.contains("dark");
      applyColorsToDocument(DEFAULT_THEME_COLORS, isDark);
      return;
    }

    const colors = workspaceData.themeColors as ThemeColors;
    const isDark = document.documentElement.classList.contains("dark");
    applyColorsToDocument(colors, isDark);

    // Re-apply on theme mode changes (light/dark toggle)
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      applyColorsToDocument(colors, isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [workspaceData]);
}

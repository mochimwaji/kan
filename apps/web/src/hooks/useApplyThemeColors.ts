/**
 * Hook to load and apply workspace theme colors on app initialization.
 * Uses shared applyColorsToDocument from themeUtils for consistency.
 */
import { useEffect } from "react";

import type { ThemeColors } from "~/utils/themePresets";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { DEFAULT_THEME_COLORS } from "~/utils/themePresets";
import { applyColorsToDocument } from "~/utils/themeUtils";

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

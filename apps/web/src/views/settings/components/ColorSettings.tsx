import { useCallback, useEffect, useState } from "react";

import type { ThemeColors } from "~/utils/themePresets";
import Button from "~/components/Button";
import ColorWheelPicker from "~/components/ColorWheelPicker";
import ThemePresetSelector from "~/components/ThemePresetSelector";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { getContrastColor } from "~/utils/colorUtils";
import {
  DEFAULT_THEME_COLORS,
  getPresetColors,
  THEME_PRESETS,
} from "~/utils/themePresets";

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

  // Set background colors
  root.style.setProperty("--kan-sidebar-bg", sidebar);
  root.style.setProperty("--kan-pages-bg", pages);
  root.style.setProperty("--kan-board-bg", boardBackground);

  // Set text contrast colors
  root.style.setProperty("--kan-sidebar-text", getContrastColor(sidebar));
  root.style.setProperty("--kan-pages-text", getContrastColor(pages));
  root.style.setProperty("--kan-board-text", getContrastColor(boardBackground));
}

export default function ColorSettings() {
  const { workspace } = useWorkspace();

  const [themeColors, setThemeColors] =
    useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const [savedColors, setSavedColors] =
    useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">("light");

  const utils = api.useUtils();

  const { data: workspaceData, isLoading } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId },
  );

  const updateThemeMutation = api.workspace.updateThemeColors.useMutation({
    onSuccess: () => {
      setSavedColors(themeColors);
      utils.workspace.byId.invalidate({
        workspacePublicId: workspace.publicId,
      });
    },
  });

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setActiveTheme(isDark ? "dark" : "light");
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Load theme colors from workspace
  useEffect(() => {
    if (workspaceData?.themeColors) {
      const colors = workspaceData.themeColors as ThemeColors;
      setThemeColors(colors);
      setSavedColors(colors);
    }
  }, [workspaceData]);

  // Note: Colors are applied globally by useApplyThemeColors in Dashboard
  // Only apply colors here when user actively changes them (in handlePresetSelect/handleColorChange)

  const isCustom = themeColors.preset === "custom";
  const isDirty = JSON.stringify(themeColors) !== JSON.stringify(savedColors);

  const handlePresetSelect = useCallback(
    async (presetId: string) => {
      let newColors: typeof themeColors;

      if (presetId === "custom") {
        // For custom, just change the preset and keep current colors
        newColors = {
          ...themeColors,
          preset: "custom",
        };
      } else {
        const presetColors = getPresetColors(presetId, activeTheme);
        newColors = {
          preset: presetId,
          ...presetColors,
        };
      }

      setThemeColors(newColors);

      // Auto-save immediately
      if (workspace.publicId) {
        await updateThemeMutation.mutateAsync({
          workspacePublicId: workspace.publicId,
          themeColors: newColors,
        });
      }
    },
    [activeTheme, themeColors, workspace.publicId, updateThemeMutation],
  );

  const handleColorChange = (
    key: "sidebar" | "pages" | "boardBackground" | "button" | "menu",
  ) => {
    return async (color: string) => {
      const newColors = {
        ...themeColors,
        preset: "custom",
        [key]: color,
      };
      setThemeColors(newColors);

      // Apply colors immediately to document
      applyColorsToDocument(newColors, activeTheme === "dark");

      // Auto-save to database
      if (workspace.publicId) {
        await updateThemeMutation.mutateAsync({
          workspacePublicId: workspace.publicId,
          themeColors: newColors,
        });
      }
    };
  };

  const handleSave = async () => {
    if (!workspace.publicId) return;

    await updateThemeMutation.mutateAsync({
      workspacePublicId: workspace.publicId,
      themeColors,
    });
  };

  if (isLoading) {
    return (
      <div className="h-32 animate-pulse rounded-lg bg-light-200 dark:bg-dark-200" />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ThemePresetSelector
        presets={THEME_PRESETS}
        selectedPresetId={themeColors.preset}
        onSelect={handlePresetSelect}
        activeTheme={activeTheme}
      />

      {isCustom && (
        <div className="flex flex-col gap-4 rounded-lg border border-light-300 bg-light-100 p-4 dark:border-dark-400 dark:bg-dark-100">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-dark-1000">
            {"Custom Colors"}
          </h3>
          <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
            <ColorWheelPicker
              label={"Sidebar"}
              value={themeColors.sidebar}
              onChange={handleColorChange("sidebar")}
            />
            <ColorWheelPicker
              label={"Pages"}
              value={themeColors.pages}
              onChange={handleColorChange("pages")}
            />
            <ColorWheelPicker
              label={"Board Background"}
              value={themeColors.boardBackground}
              onChange={handleColorChange("boardBackground")}
            />
            <ColorWheelPicker
              label={"Buttons"}
              value={themeColors.button}
              onChange={handleColorChange("button")}
            />
            <ColorWheelPicker
              label={"Menus"}
              value={themeColors.menu}
              onChange={handleColorChange("menu")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

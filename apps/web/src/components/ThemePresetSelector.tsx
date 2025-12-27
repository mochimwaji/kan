import { HiCheck } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import type { ThemePreset } from "~/utils/themePresets";

interface ThemePresetSelectorProps {
  presets: ThemePreset[];
  selectedPresetId: string;
  onSelect: (presetId: string) => void;
  activeTheme: "light" | "dark";
  className?: string;
}

export default function ThemePresetSelector({
  presets,
  selectedPresetId,
  onSelect,
  activeTheme,
  className,
}: ThemePresetSelectorProps) {
  return (
    <div className={twMerge("flex flex-col gap-3", className)}>
      <h3
        className="text-sm font-medium"
        style={{ color: "var(--kan-menu-text)" }}
      >
        {"Theme Presets"}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {presets.map((preset) => {
          const colors = preset.colors[activeTheme];
          const isSelected = selectedPresetId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              className={twMerge(
                "relative flex flex-col overflow-hidden rounded-lg border-2 transition-all",
                "hover:shadow-md",
                isSelected
                  ? "border-blue-500 ring-2 ring-blue-500/30"
                  : "border-light-300 hover:border-light-500 dark:border-dark-400 dark:hover:border-dark-500",
              )}
            >
              {/* Color preview */}
              <div className="flex h-16 w-full">
                <div
                  style={{
                    backgroundColor: colors.sidebar,
                    width: "25%",
                    height: "4rem",
                    display: "block",
                  }}
                  title={"Sidebar"}
                >
                  &nbsp;
                </div>
                <div
                  style={{
                    backgroundColor: colors.pages,
                    width: "50%",
                    height: "4rem",
                    display: "block",
                  }}
                  title={"Pages"}
                >
                  &nbsp;
                </div>
                <div
                  style={{
                    backgroundColor: colors.boardBackground,
                    width: "25%",
                    height: "4rem",
                    display: "block",
                  }}
                  title={"Board"}
                >
                  &nbsp;
                </div>
              </div>

              {/* Label */}
              <div
                className={twMerge(
                  "flex items-center justify-between px-2 py-1.5",
                  "bg-light-100 dark:bg-dark-200",
                )}
              >
                <span className="truncate text-xs font-medium text-light-900 dark:text-dark-1000">
                  {preset.name}
                </span>
                {isSelected && (
                  <HiCheck className="h-4 w-4 flex-shrink-0 text-blue-500" />
                )}
              </div>
            </button>
          );
        })}

        {/* Custom option */}
        <button
          type="button"
          onClick={() => onSelect("custom")}
          className={twMerge(
            "relative flex flex-col overflow-hidden rounded-lg border-2 transition-all",
            "hover:shadow-md",
            selectedPresetId === "custom"
              ? "border-blue-500 ring-2 ring-blue-500/30"
              : "border-light-300 hover:border-light-500 dark:border-dark-400 dark:hover:border-dark-500",
          )}
        >
          {/* Custom preview with gradient */}
          <div
            style={{
              width: "100%",
              height: "4rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(to right, #f9a8d4, #c4b5fd, #a5b4fc)",
            }}
          >
            <span className="text-sm font-medium text-white drop-shadow-md">
              {"Custom"}
            </span>
          </div>

          {/* Label */}
          <div
            className={twMerge(
              "flex items-center justify-between px-2 py-1.5",
              "bg-light-100 dark:bg-dark-200",
            )}
          >
            <span className="text-xs font-medium text-light-900 dark:text-dark-1000">
              {"Custom Colors"}
            </span>
            {selectedPresetId === "custom" && (
              <HiCheck className="h-4 w-4 flex-shrink-0 text-blue-500" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

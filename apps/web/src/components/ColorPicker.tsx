import type { ChangeEvent } from "react";
import { t } from "@lingui/core/macro";
import { useCallback, useState } from "react";
import { HiCheck } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { isValidHexColor } from "~/utils/colorUtils";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  presetColors?: string[];
  className?: string;
}

const DEFAULT_PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
  "#000000", // black
];

export default function ColorPicker({
  value,
  onChange,
  label,
  presetColors = DEFAULT_PRESET_COLORS,
  className,
}: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;

      // Add # if not present
      if (newValue && !newValue.startsWith("#")) {
        newValue = "#" + newValue;
      }

      setInputValue(newValue);

      if (isValidHexColor(newValue)) {
        setIsValid(true);
        onChange(newValue);
      } else if (newValue === "" || newValue === "#") {
        setIsValid(true);
      } else {
        setIsValid(false);
      }
    },
    [onChange],
  );

  const handlePresetClick = useCallback(
    (color: string) => {
      setInputValue(color);
      setIsValid(true);
      onChange(color);
    },
    [onChange],
  );

  return (
    <div className={twMerge("flex flex-col gap-2", className)}>
      {label && (
        <label className="text-sm font-medium text-neutral-900 dark:text-dark-1000">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 flex-shrink-0 rounded-md border border-light-400 dark:border-dark-400"
          style={{ backgroundColor: isValid ? value : "#ffffff" }}
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          className={twMerge(
            "w-24 rounded-md border px-2 py-1 text-sm",
            "bg-light-50 text-neutral-900 dark:bg-dark-200 dark:text-dark-1000",
            isValid
              ? "border-light-400 dark:border-dark-400"
              : "border-red-500 dark:border-red-500",
            "focus:outline-none focus:ring-1 focus:ring-blue-500",
          )}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presetColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => handlePresetClick(color)}
            className={twMerge(
              "relative h-6 w-6 rounded-md border-2 transition-transform hover:scale-110",
              value.toLowerCase() === color.toLowerCase()
                ? "border-blue-500"
                : "border-transparent",
            )}
            style={{ backgroundColor: color }}
            title={color}
          >
            {value.toLowerCase() === color.toLowerCase() && (
              <HiCheck
                className={twMerge(
                  "absolute inset-0 m-auto h-4 w-4",
                  // Use white check for dark colors, dark for light colors
                  parseInt(color.slice(1, 3), 16) +
                    parseInt(color.slice(3, 5), 16) +
                    parseInt(color.slice(5, 7), 16) <
                    382
                    ? "text-white"
                    : "text-black",
                )}
              />
            )}
          </button>
        ))}
      </div>
      {!isValid && (
        <p className="text-xs text-red-500">{t`Enter a valid hex color (e.g., #FF5733)`}</p>
      )}
    </div>
  );
}

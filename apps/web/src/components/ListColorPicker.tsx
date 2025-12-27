import { useState } from "react";
import { HiXMark } from "react-icons/hi2";

import { useColorWheel } from "~/hooks/useColorWheel";
import { isValidHexColor } from "~/utils/colorUtils";

interface ListColorPickerProps {
  currentColor: string | null;
  onColorSelect: (color: string | null) => void;
  onClose: () => void;
}

/**
 * Color picker component specifically designed for list color selection.
 * Features a color wheel, lightness slider, hex input, and remove color option.
 * Uses shared useColorWheel hook for canvas logic.
 */
export default function ListColorPicker({
  currentColor,
  onColorSelect,
  onClose,
}: ListColorPickerProps) {
  const [hexInput, setHexInput] = useState(currentColor ?? "");

  const {
    lightness,
    selectedColor,
    handleCanvasClick,
    handleMouseMove,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleLightnessChange,
    handleCanvasRef,
  } = useColorWheel({
    initialColor: currentColor,
    onColorSelect: (color) => {
      // Clicking on color wheel selects and closes
      onColorSelect(color);
      onClose();
    },
    onColorPreview: (color) => {
      // Slider preview updates color but doesn't close
      onColorSelect(color);
      setHexInput(color);
    },
    canvasSize: 100,
  });

  // Handle hex input change
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexInput(value);
  };

  // Handle hex input submit (Enter key or blur)
  const handleHexSubmit = () => {
    if (hexInput && isValidHexColor(hexInput)) {
      onColorSelect(hexInput);
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div className="fixed inset-0 z-40 md:hidden" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-50 w-auto -translate-y-1/2 rounded-lg border border-light-300 bg-light-50 p-3 shadow-lg dark:border-dark-400 dark:bg-dark-200 md:absolute md:inset-x-auto md:left-0 md:top-full md:mt-1 md:w-56 md:translate-y-0">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-700 dark:text-dark-900">
            {"List color"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 hover:bg-light-200 dark:hover:bg-dark-300"
          >
            <HiXMark className="h-4 w-4 text-neutral-500 dark:text-dark-800" />
          </button>
        </div>

        {/* Color wheel */}
        <div className="flex flex-col items-center gap-2">
          <canvas
            ref={handleCanvasRef}
            width={100}
            height={100}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="cursor-crosshair touch-none rounded-full"
          />

          {/* Current color preview and hex input */}
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-md border border-light-400 dark:border-dark-400"
              style={{
                backgroundColor: selectedColor ?? currentColor ?? "#cccccc",
              }}
            />
            <input
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleHexSubmit();
                }
              }}
              onBlur={handleHexSubmit}
              className="w-20 rounded-md border border-light-400 bg-light-50 px-2 py-1 text-xs dark:border-dark-400 dark:bg-dark-300"
              placeholder="#000000"
            />
          </div>

          {/* Lightness slider */}
          <div className="flex w-full items-center gap-2">
            <span className="text-[10px] text-neutral-500 dark:text-dark-800">
              Dark
            </span>
            <input
              type="range"
              min="20"
              max="80"
              value={lightness}
              onChange={handleLightnessChange}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-gray-800 via-gray-500 to-gray-200"
            />
            <span className="text-[10px] text-neutral-500 dark:text-dark-800">
              Light
            </span>
          </div>
        </div>

        <div className="mt-3 border-t border-light-300 pt-2 dark:border-dark-400">
          <button
            type="button"
            onClick={() => {
              onColorSelect(null);
              onClose();
            }}
            className="w-full rounded-md px-2 py-1.5 text-left text-xs text-neutral-700 transition-colors hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-300"
          >
            {"Remove color"}
          </button>
        </div>
      </div>
    </>
  );
}

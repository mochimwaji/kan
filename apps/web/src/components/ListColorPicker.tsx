import { t } from "@lingui/core/macro";
import { HiXMark } from "react-icons/hi2";

import { useColorWheel } from "~/hooks/useColorWheel";

interface ListColorPickerProps {
  currentColor: string | null;
  onColorSelect: (color: string | null) => void;
  onClose: () => void;
}

/**
 * Color picker component specifically designed for list color selection.
 * Features a color wheel, lightness slider, and remove color option.
 * Uses shared useColorWheel hook for canvas logic.
 */
export default function ListColorPicker({
  currentColor,
  onColorSelect,
  onClose,
}: ListColorPickerProps) {
  const {
    lightness,
    handleCanvasClick,
    handleLightnessChange,
    handleCanvasRef,
  } = useColorWheel({
    initialColor: currentColor,
    onColorChange: (color) => {
      onColorSelect(color);
      onClose();
    },
    canvasSize: 100,
  });

  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-light-300 bg-light-50 p-3 shadow-lg dark:border-dark-400 dark:bg-dark-200">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-700 dark:text-dark-900">
          {t`List color`}
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
          className="cursor-crosshair rounded-full"
        />

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
          {t`Remove color`}
        </button>
      </div>
    </div>
  );
}

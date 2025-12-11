import { useColorWheel } from "~/hooks/useColorWheel";
import { isValidHexColor } from "~/utils/colorUtils";

interface ColorWheelPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

/**
 * Color wheel picker component that allows users to select colors
 * by clicking on a color wheel and adjusting lightness with a slider.
 * Uses shared useColorWheel hook for canvas logic.
 */
export default function ColorWheelPicker({
  label,
  value,
  onChange,
}: ColorWheelPickerProps) {
  const {
    lightness,
    handleCanvasClick,
    handleMouseMove,
    handleMouseLeave,
    handleLightnessChange,
    handleCanvasRef,
  } = useColorWheel({
    initialColor: value,
    onColorChange: onChange,
    canvasSize: 120,
  });

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-neutral-900 dark:text-dark-1000">
        {label}
      </label>

      {/* Color wheel */}
      <div className="flex flex-col items-center gap-4">
        <canvas
          ref={handleCanvasRef}
          width={120}
          height={120}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair rounded-full"
        />

        <div className="flex flex-col gap-2">
          {/* Current color preview */}
          <div
            className="h-10 w-20 rounded-md border border-light-400 dark:border-dark-400"
            style={{ backgroundColor: value }}
          />

          {/* Hex input */}
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const newValue = e.target.value;
              if (isValidHexColor(newValue)) {
                onChange(newValue);
              }
            }}
            className="w-20 rounded-md border border-light-400 bg-light-50 px-2 py-1 text-xs dark:border-dark-400 dark:bg-dark-200"
            placeholder="#000000"
          />
        </div>
      </div>

      {/* Lightness slider */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-600 dark:text-dark-800">
          Dark
        </span>
        <input
          type="range"
          min="10"
          max="90"
          value={lightness}
          onChange={handleLightnessChange}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-gray-900 via-gray-500 to-gray-100"
        />
        <span className="text-xs text-neutral-600 dark:text-dark-800">
          Light
        </span>
      </div>
    </div>
  );
}

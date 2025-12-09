import { useCallback, useRef, useState } from "react";

import { hexToHsl, hslToHex, isValidHexColor } from "~/utils/colorUtils";

interface ColorWheelPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

/**
 * Color wheel picker component that allows users to select colors
 * by clicking on a color wheel and adjusting lightness with a slider
 */
export default function ColorWheelPicker({
  label,
  value,
  onChange,
}: ColorWheelPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lightness, setLightness] = useState(() => {
    if (isValidHexColor(value)) {
      return hexToHsl(value).l;
    }
    return 50;
  });

  // Draw the color wheel
  const drawColorWheel = useCallback(
    (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 2;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw color wheel
      for (let angle = 0; angle < 360; angle++) {
        const startAngle = ((angle - 1) * Math.PI) / 180;
        const endAngle = ((angle + 1) * Math.PI) / 180;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        // Use current lightness in the wheel
        ctx.fillStyle = `hsl(${angle}, 100%, ${lightness}%)`;
        ctx.fill();
      }

      // Draw center circle (shows currently selected color)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.25, 0, 2 * Math.PI);
      ctx.fillStyle = value;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    [lightness, value],
  );

  // Handle canvas click to select color
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 2;

    // Calculate distance from center
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only register clicks within the wheel (but not in center preview)
    if (distance <= radius && distance > radius * 0.25) {
      // Calculate angle (hue)
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      // Calculate saturation based on distance from center
      const saturation = Math.min(
        100,
        Math.max(0, ((distance - radius * 0.25) / (radius * 0.75)) * 100),
      );

      const newColor = hslToHex(
        Math.round(angle),
        Math.round(saturation),
        lightness,
      );
      onChange(newColor);
    }
  };

  // Handle lightness slider change
  const handleLightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLightness = parseInt(e.target.value, 10);
    setLightness(newLightness);

    // Update current color with new lightness
    if (isValidHexColor(value)) {
      const hsl = hexToHsl(value);
      const newColor = hslToHex(hsl.h, hsl.s, newLightness);
      onChange(newColor);
    }
  };

  // Draw wheel when component mounts or updates
  const handleCanvasRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (canvas) {
        // @ts-expect-error - ref assignment
        canvasRef.current = canvas;
        drawColorWheel(canvas);
      }
    },
    [drawColorWheel],
  );

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-neutral-900 dark:text-dark-1000">
        {label}
      </label>

      {/* Color wheel */}
      <div className="flex items-center gap-4">
        <canvas
          ref={handleCanvasRef}
          width={120}
          height={120}
          onClick={handleCanvasClick}
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

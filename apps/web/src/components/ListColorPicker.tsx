import { t } from "@lingui/core/macro";
import { useCallback, useRef, useState } from "react";
import { HiXMark } from "react-icons/hi2";

import { hexToHsl, hslToHex, isValidHexColor } from "~/utils/colorUtils";

interface ListColorPickerProps {
  currentColor: string | null;
  onColorSelect: (color: string | null) => void;
  onClose: () => void;
}

export default function ListColorPicker({
  currentColor,
  onColorSelect,
  onClose,
}: ListColorPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lightness, setLightness] = useState(() => {
    if (currentColor && isValidHexColor(currentColor)) {
      return hexToHsl(currentColor).l;
    }
    return 50;
  });
  const [selectedColor, setSelectedColor] = useState<string | null>(
    currentColor,
  );

  // Draw the color wheel
  const drawColorWheel = useCallback(
    (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw color wheel
      for (let angle = 0; angle < 360; angle++) {
        const startAngle = ((angle - 1) * Math.PI) / 180;
        const endAngle = ((angle + 1) * Math.PI) / 180;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = `hsl(${angle}, 100%, ${lightness}%)`;
        ctx.fill();
      }

      // Draw center circle with selected color
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.25, 0, 2 * Math.PI);
      ctx.fillStyle = selectedColor || "#cccccc";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    [lightness, selectedColor],
  );

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 2;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= radius && distance > radius * 0.25) {
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      const saturation = Math.min(
        100,
        Math.max(50, ((distance - radius * 0.25) / (radius * 0.75)) * 100),
      );

      const newColor = hslToHex(
        Math.round(angle),
        Math.round(saturation),
        lightness,
      );
      setSelectedColor(newColor);
      onColorSelect(newColor);
      onClose();
    }
  };

  const handleLightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLightness = parseInt(e.target.value, 10);
    setLightness(newLightness);

    if (selectedColor && isValidHexColor(selectedColor)) {
      const hsl = hexToHsl(selectedColor);
      const newColor = hslToHex(hsl.h, hsl.s, newLightness);
      setSelectedColor(newColor);
    }
  };

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

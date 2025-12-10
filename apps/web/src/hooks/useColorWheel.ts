/**
 * Shared hook for color wheel functionality.
 * Consolidates duplicate logic from ListColorPicker and ColorWheelPicker.
 */
import { useCallback, useRef, useState } from "react";

import { hexToHsl, hslToHex, isValidHexColor } from "~/utils/colorUtils";

interface UseColorWheelOptions {
  /** Initial color value (hex string or null) */
  initialColor: string | null;
  /** Callback when a color is selected from the wheel */
  onColorChange?: (color: string) => void;
  /** Canvas size in pixels (width and height) */
  canvasSize?: number;
}

interface UseColorWheelReturn {
  /** Ref to attach to the canvas element */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Current lightness value (0-100) */
  lightness: number;
  /** Currently selected color (hex string or null) */
  selectedColor: string | null;
  /** Handle canvas click to select a color */
  handleCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  /** Handle lightness slider change */
  handleLightnessChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Callback ref for canvas initialization */
  handleCanvasRef: (canvas: HTMLCanvasElement | null) => void;
  /** Update selected color directly (e.g., from hex input) */
  setSelectedColor: (color: string | null) => void;
}

/**
 * Hook that provides color wheel state and handlers.
 * Includes canvas drawing, click detection, and lightness adjustment.
 */
export function useColorWheel({
  initialColor,
  onColorChange,
  canvasSize = 100,
}: UseColorWheelOptions): UseColorWheelReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [lightness, setLightness] = useState(() => {
    if (initialColor && isValidHexColor(initialColor)) {
      return hexToHsl(initialColor).l;
    }
    return 50;
  });

  const [selectedColor, setSelectedColor] = useState<string | null>(
    initialColor,
  );

  // Draw the color wheel on canvas
  const drawColorWheel = useCallback(
    (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw color wheel segments
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

      // Draw center circle with currently selected color
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

  // Handle canvas click to select color
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
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

      // Only register clicks within the wheel (outside center preview area)
      if (distance <= radius && distance > radius * 0.25) {
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        // Calculate saturation based on distance from center
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
        onColorChange?.(newColor);
      }
    },
    [lightness, onColorChange],
  );

  // Handle lightness slider change
  const handleLightnessChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newLightness = parseInt(e.target.value, 10);
      setLightness(newLightness);

      // Update current color with new lightness if we have a selected color
      if (selectedColor && isValidHexColor(selectedColor)) {
        const hsl = hexToHsl(selectedColor);
        const newColor = hslToHex(hsl.h, hsl.s, newLightness);
        setSelectedColor(newColor);
        onColorChange?.(newColor);
      }
    },
    [selectedColor, onColorChange],
  );

  // Canvas ref callback for initialization
  const handleCanvasRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (canvas) {
        canvasRef.current = canvas;
        drawColorWheel(canvas);
      }
    },
    [drawColorWheel],
  );

  return {
    canvasRef,
    lightness,
    selectedColor,
    handleCanvasClick,
    handleLightnessChange,
    handleCanvasRef,
    setSelectedColor,
  };
}

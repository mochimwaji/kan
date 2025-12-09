/**
 * Color utility functions for theme management
 */

/**
 * Validate hex color format
 */
export function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * Convert hex color to HSL values
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Parse hex values
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL values to hex color
 */
export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Derive a pastel color from a base hex color
 * Increases lightness and reduces saturation for a softer appearance
 */
export function derivePastelColor(hex: string): string {
  if (!isValidHexColor(hex)) {
    return hex;
  }

  const hsl = hexToHsl(hex);

  // Pastel: high lightness (85-92%), low saturation (30-50%)
  const pastelL = Math.max(85, Math.min(92, hsl.l + 30));
  const pastelS = Math.min(50, Math.max(30, hsl.s * 0.5));

  return hslToHex(hsl.h, pastelS, pastelL);
}

/**
 * Derive a lighter background color from a base color for list backgrounds
 * Less aggressive than pastel - maintains more color identity
 */
export function deriveListBackground(hex: string): string {
  if (!isValidHexColor(hex)) {
    return hex;
  }

  const hsl = hexToHsl(hex);

  // List background: lighter (75-85%), reduced saturation
  const bgL = Math.max(75, Math.min(88, hsl.l + 25));
  const bgS = Math.min(60, Math.max(35, hsl.s * 0.6));

  return hslToHex(hsl.h, bgS, bgL);
}

/**
 * Get contrasting text color (black or white) for a given background
 */
export function getContrastColor(hex: string): string {
  if (!isValidHexColor(hex)) {
    return "#000000";
  }

  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Adjust color opacity by blending with a base color
 */
export function blendWithOpacity(
  foreground: string,
  background: string,
  opacity: number,
): string {
  if (!isValidHexColor(foreground) || !isValidHexColor(background)) {
    return foreground;
  }

  const fg = foreground.replace("#", "");
  const bg = background.replace("#", "");

  const fgR = parseInt(fg.slice(0, 2), 16);
  const fgG = parseInt(fg.slice(2, 4), 16);
  const fgB = parseInt(fg.slice(4, 6), 16);

  const bgR = parseInt(bg.slice(0, 2), 16);
  const bgG = parseInt(bg.slice(2, 4), 16);
  const bgB = parseInt(bg.slice(4, 6), 16);

  const r = Math.round(fgR * opacity + bgR * (1 - opacity));
  const g = Math.round(fgG * opacity + bgG * (1 - opacity));
  const b = Math.round(fgB * opacity + bgB * (1 - opacity));

  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

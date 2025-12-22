import { useCallback, useEffect, useState } from "react";

/**
 * Manages component mount/unmount transitions with opacity fade.
 *
 * Use for SIMPLE transitions only. Do NOT use in board view
 * (which uses BoardTransitionProvider with morphing animations).
 *
 * @example
 * const { opacity, triggerExit } = useTransitionState(300);
 *
 * // In click handler:
 * triggerExit(() => router.push('/next-page'));
 *
 * // In JSX:
 * <div style={{ opacity, transition: 'opacity 300ms ease' }}>
 */
export function useTransitionState(duration = 300): {
  opacity: number;
  triggerExit: (callback: () => void) => void;
} {
  const [opacity, setOpacity] = useState(0);

  // Fade in on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setOpacity(1);
    });
  }, []);

  const triggerExit = useCallback(
    (callback: () => void) => {
      setOpacity(0);
      setTimeout(callback, duration);
    },
    [duration],
  );

  return {
    opacity,
    triggerExit,
  };
}

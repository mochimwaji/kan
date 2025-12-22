import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Two-phase visual state hook that decouples UI rendering from server state.
 *
 * Critical guarantee: When frozen, serverData changes are IGNORED.
 * Local state takes absolute precedence during freeze (e.g., while dragging).
 *
 * @example
 * const { visualData, setVisualData, freeze, unfreeze, isFrozen } = useVisualState(serverData);
 *
 * // During drag-drop:
 * onDragStart: freeze()
 * onDragEnd: setVisualData(newOrder); setTimeout(() => unfreeze(), 300);
 */
export function useVisualState<T>(serverData: T | undefined): {
  visualData: T | undefined;
  setVisualData: React.Dispatch<React.SetStateAction<T | undefined>>;
  freeze: () => void;
  unfreeze: (opts?: { discardLocal?: boolean }) => void;
  isFrozen: boolean;
} {
  const [visualData, setVisualData] = useState<T | undefined>(serverData);
  const [isFrozen, setIsFrozen] = useState(false);

  // Track server data for sync on unfreeze
  const serverDataRef = useRef(serverData);
  serverDataRef.current = serverData;

  // Sync visual state from server data ONLY when NOT frozen
  useEffect(() => {
    if (!isFrozen && serverData !== undefined) {
      setVisualData(serverData);
    }
  }, [serverData, isFrozen]);

  const freeze = useCallback(() => {
    setIsFrozen(true);
  }, []);

  const unfreeze = useCallback((opts?: { discardLocal?: boolean }) => {
    setIsFrozen(false);
    // If discardLocal is true, immediately sync with server data
    if (opts?.discardLocal && serverDataRef.current !== undefined) {
      setVisualData(serverDataRef.current);
    }
    // Otherwise, the useEffect will sync on next serverData change
  }, []);

  return {
    visualData,
    setVisualData,
    freeze,
    unfreeze,
    isFrozen,
  };
}

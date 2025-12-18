import { t } from "@lingui/core/macro";
import { useCallback } from "react";

import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";

interface List {
  publicId: string;
}

/**
 * Register keyboard shortcuts for toggling list collapse (1-9 keys).
 * Uses array mapping internally to avoid repetitive hook calls.
 */
export function useBoardKeyboardShortcuts(lists: List[] | undefined): void {
  // Helper to toggle list collapse via custom event
  const toggleListCollapse = useCallback(
    (listIndex: number) => {
      if (!lists || listIndex >= lists.length) return;
      const list = lists[listIndex];
      if (!list) return;
      // Dispatch custom event for List component to handle with animation
      window.dispatchEvent(
        new CustomEvent("toggle-list-collapse", {
          detail: { listPublicId: list.publicId },
        }),
      );
    },
    [lists],
  );

  // Shortcuts for keys 1-9 to toggle list collapse
  // Unfortunately useKeyboardShortcut must be called at top level,
  // so we use individual calls with stable callbacks
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "1" },
    action: () => toggleListCollapse(0),
    description: t`Toggle list 1`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "2" },
    action: () => toggleListCollapse(1),
    description: t`Toggle list 2`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "3" },
    action: () => toggleListCollapse(2),
    description: t`Toggle list 3`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "4" },
    action: () => toggleListCollapse(3),
    description: t`Toggle list 4`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "5" },
    action: () => toggleListCollapse(4),
    description: t`Toggle list 5`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "6" },
    action: () => toggleListCollapse(5),
    description: t`Toggle list 6`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "7" },
    action: () => toggleListCollapse(6),
    description: t`Toggle list 7`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "8" },
    action: () => toggleListCollapse(7),
    description: t`Toggle list 8`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "9" },
    action: () => toggleListCollapse(8),
    description: t`Toggle list 9`,
    group: "BOARD_VIEW",
  });
}

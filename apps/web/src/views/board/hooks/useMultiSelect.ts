import { useCallback, useState } from "react";

import type { RouterOutputs } from "@kan/api";

type BoardData = RouterOutputs["board"]["byId"];
type BoardList = NonNullable<BoardData>["lists"][number];

/**
 * Manages multi-select state for cards and lists on the board.
 *
 * Supports:
 * - Single selection (click)
 * - Range selection (shift+click)
 * - Toggle selection
 *
 * @example
 * const {
 *   selectedCardIds,
 *   toggleCardSelection,
 *   selectCardRange,
 *   clearSelection,
 *   hasSelection
 * } = useMultiSelect(listsToRender);
 */
export function useMultiSelect(listsToRender: BoardList[]) {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(
    new Set(),
  );
  const [lastSelectedCardId, setLastSelectedCardId] = useState<string | null>(
    null,
  );

  // Toggle single card selection
  const toggleCardSelection = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  // Toggle single list selection
  const toggleListSelection = useCallback((listId: string) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  }, []);

  // Range selection (shift+click)
  const selectCardRange = useCallback(
    (fromId: string, toId: string) => {
      const allCardIds = listsToRender.flatMap((list) =>
        list.cards.map((c) => c.publicId),
      );
      const fromIdx = allCardIds.indexOf(fromId);
      const toIdx = allCardIds.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return;

      const [start, end] =
        fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      setSelectedCardIds(new Set(allCardIds.slice(start, end + 1)));
      setLastSelectedCardId(toId);
    },
    [listsToRender],
  );

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedCardIds(new Set());
    setSelectedListIds(new Set());
    setLastSelectedCardId(null);
  }, []);

  // Get ordered selected cards (for multi-drag)
  const getOrderedSelectedCards = useCallback(
    (draggedId: string): string[] => {
      const allCards = listsToRender.flatMap((l) => l.cards);
      return allCards
        .filter((c) => selectedCardIds.has(c.publicId))
        .sort((a, b) => {
          if (a.publicId === draggedId) return -1;
          if (b.publicId === draggedId) return 1;
          return a.index - b.index;
        })
        .map((c) => c.publicId);
    },
    [listsToRender, selectedCardIds],
  );

  const hasSelection = selectedCardIds.size > 0 || selectedListIds.size > 0;

  return {
    selectedCardIds,
    setSelectedCardIds,
    selectedListIds,
    setSelectedListIds,
    lastSelectedCardId,
    setLastSelectedCardId,
    toggleCardSelection,
    toggleListSelection,
    selectCardRange,
    clearSelection,
    getOrderedSelectedCards,
    hasSelection,
  };
}

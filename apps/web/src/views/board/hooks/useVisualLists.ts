import { useCallback, useEffect, useMemo, useState } from "react";

import type { RouterOutputs } from "@kan/api";

type BoardData = RouterOutputs["board"]["byId"];
type BoardList = NonNullable<BoardData>["lists"][number];

/**
 * Encapsulates two-phase visual state for board lists.
 *
 * Critical guarantee: When isDragging is true, server data changes are IGNORED.
 * Visual state takes absolute precedence during drag operations.
 *
 * @example
 * const { listsToRender, isDragging, setIsDragging, reorderLists, reorderCards } =
 *   useVisualLists(boardData);
 */
export function useVisualLists(boardData: BoardData | undefined) {
  const [visualLists, setVisualLists] = useState<BoardList[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sync visual state from server data ONLY when NOT actively dragging
  useEffect(() => {
    if (boardData?.lists && !isDragging) {
      setVisualLists(boardData.lists);
    }
  }, [boardData?.lists, isDragging]);

  // Use visual lists for rendering, fallback to boardData
  const listsToRender = useMemo(
    () => visualLists ?? boardData?.lists ?? [],
    [visualLists, boardData?.lists],
  );

  // Reorder lists visually (for drag-drop)
  const reorderLists = useCallback(
    (sourceIndex: number, destinationIndex: number) => {
      setVisualLists((prev) => {
        if (!prev) return prev;
        const updated = [...prev];
        const [removed] = updated.splice(sourceIndex, 1);
        if (removed) updated.splice(destinationIndex, 0, removed);
        return updated.map((list, idx) => ({ ...list, index: idx }));
      });
    },
    [],
  );

  // Reorder cards within/between lists visually (for drag-drop)
  const reorderCards = useCallback(
    (params: {
      cardIds: string[];
      sourceListId: string;
      destinationListId: string;
      destinationIndex: number;
    }) => {
      const { cardIds, destinationListId, destinationIndex } = params;

      setVisualLists((prev) => {
        if (!prev) return prev;

        // Deep copy lists and cards to avoid mutation
        const updated = prev.map((list) => ({
          ...list,
          cards: [...list.cards],
        }));

        // Remove all cards to move from their source lists
        const movedCards: (typeof updated)[0]["cards"] = [];
        for (const list of updated) {
          for (let i = list.cards.length - 1; i >= 0; i--) {
            const cardId = list.cards[i]?.publicId;
            if (cardId && cardIds.includes(cardId)) {
              movedCards.push(...list.cards.splice(i, 1));
            }
          }
        }

        // Sort moved cards to maintain order (by original selection order)
        movedCards.sort((a, b) => {
          const aIdx = cardIds.indexOf(a.publicId);
          const bIdx = cardIds.indexOf(b.publicId);
          return aIdx - bIdx;
        });

        // Insert at destination
        const destList = updated.find((l) => l.publicId === destinationListId);
        if (destList) {
          destList.cards.splice(destinationIndex, 0, ...movedCards);
        }

        // Update indices
        return updated.map((list) => ({
          ...list,
          cards: list.cards.map((card, idx) => ({ ...card, index: idx })),
        }));
      });
    },
    [],
  );

  // Update cards in visual state (for calendar drag-drop with dueDate changes)
  const updateCardsInVisualState = useCallback(
    (
      cardUpdates: {
        cardId: string;
        updates: Partial<{
          dueDate: Date | null;
          calendarOrder: number;
        }>;
      }[],
    ) => {
      setVisualLists((prev) => {
        if (!prev) return prev;
        const updateMap = new Map(
          cardUpdates.map((u) => [u.cardId, u.updates]),
        );
        return prev.map((list) => ({
          ...list,
          cards: list.cards.map((card) => {
            const updates = updateMap.get(card.publicId);
            if (updates) {
              return { ...card, ...updates };
            }
            return card;
          }),
        }));
      });
    },
    [],
  );

  return {
    visualLists,
    listsToRender,
    isDragging,
    setIsDragging,
    reorderLists,
    reorderCards,
    updateCardsInVisualState,
    setVisualLists,
  };
}

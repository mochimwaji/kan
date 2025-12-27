import type { DropResult } from "@hello-pangea/dnd";
import { useCallback } from "react";

import type { RouterOutputs } from "@kan/api";

type BoardData = RouterOutputs["board"]["byId"];
type BoardList = NonNullable<BoardData>["lists"][number];

interface CardWithCalendarOrder {
  calendarOrder: number | null;
  index?: number;
}

export function useBoardDragAndDrop({
  listsToRender,
  selectedCardIds,
  setSelectedCardIds,
  setLastSelectedCardId,
  getOrderedSelectedCards,
  setVisualLists,
  setIsDragging,
  mutations,
}: {
  listsToRender: BoardList[];
  selectedCardIds: Set<string>;
  setSelectedCardIds: (ids: Set<string>) => void;
  setLastSelectedCardId: (id: string | null) => void;
  getOrderedSelectedCards: (draggedId: string) => string[];
  setVisualLists: React.Dispatch<React.SetStateAction<BoardList[] | null>>;
  setIsDragging: (isDragging: boolean) => void;
  mutations: {
    bulkMoveMutation: {
      mutate: (args: {
        cardPublicIds: string[];
        listPublicId: string;
        startIndex: number;
      }) => void;
    };
    updateCardMutation: {
      mutate: (args: {
        cardPublicId: string;
        listPublicId?: string;
        index?: number;
      }) => void;
    };
    bulkUpdateCardMutation: {
      mutate: (
        args: {
          cardPublicId: string;
          dueDate?: Date | null;
          calendarOrder?: number;
        }[],
      ) => void;
    };
    updateListMutation: {
      mutate: (args: { listPublicId: string; index?: number }) => void;
    };
  };
}) {
  const onDragStart = useCallback(
    (start: { draggableId: string; type: string }) => {
      setIsDragging(true);

      // Multi-drag: if we start dragging a card that isn't selected,
      // clear selection and select just that card.
      if (start.type === "CARD" && !selectedCardIds.has(start.draggableId)) {
        setSelectedCardIds(new Set([start.draggableId]));
        setLastSelectedCardId(start.draggableId);
      }
    },
    [selectedCardIds, setIsDragging, setSelectedCardIds, setLastSelectedCardId],
  );

  const onDragEnd = useCallback(
    ({ source, destination, draggableId, type }: DropResult) => {
      setIsDragging(false);

      if (!destination) return;

      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      if (type === "LIST") {
        setVisualLists((prev) => {
          if (!prev) return prev;
          const updated = [...prev];
          const [removed] = updated.splice(source.index, 1);
          if (removed) updated.splice(destination.index, 0, removed);
          return updated.map((list, idx) => ({ ...list, index: idx }));
        });

        mutations.updateListMutation.mutate({
          listPublicId: draggableId,
          index: destination.index,
        });
        return;
      }

      const isUnscheduledDrop =
        destination.droppableId === "unscheduled" ||
        destination.droppableId === "calendar-unscheduled";
      const isCalendarDrop =
        destination.droppableId.startsWith("calendar-") && !isUnscheduledDrop;

      if (isCalendarDrop || isUnscheduledDrop) {
        let newDueDate: Date | null = null;
        let year = 0,
          month = 0,
          day = 0;

        if (isCalendarDrop) {
          const dateStr = destination.droppableId.replace("calendar-", "");
          const parts = dateStr.split("-").map(Number);
          year = parts[0] ?? 2024;
          month = parts[1] ?? 1;
          day = parts[2] ?? 1;
          newDueDate = new Date(year, month - 1, day, 12, 0, 0, 0);
        }

        const cardsToMove = selectedCardIds.has(draggableId)
          ? getOrderedSelectedCards(draggableId)
          : [draggableId];

        const allCards = listsToRender.flatMap((l, listIndex) =>
          l.cards.map((c) => ({ ...c, listIndex })),
        );
        const targetCards = allCards
          .filter((c) => {
            if (cardsToMove.includes(c.publicId)) return false;
            if (isUnscheduledDrop) return !c.dueDate;
            if (!c.dueDate) return false;
            return (
              c.dueDate.getFullYear() === year &&
              c.dueDate.getMonth() === month - 1 &&
              c.dueDate.getDate() === day
            );
          })
          .sort((a, b) => {
            const aExt = a as CardWithCalendarOrder;
            const bExt = b as CardWithCalendarOrder;
            const orderA =
              aExt.calendarOrder ??
              a.listIndex * 100000 + (aExt.index ?? 0) * 1000;
            const orderB =
              bExt.calendarOrder ??
              b.listIndex * 100000 + (bExt.index ?? 0) * 1000;
            return orderA - orderB;
          });

        const prevCard = targetCards[destination.index - 1];
        const nextCard = targetCards[destination.index];

        const prevExt = prevCard as CardWithCalendarOrder | undefined;
        const nextExt = nextCard as CardWithCalendarOrder | undefined;

        const prevOrder =
          prevExt?.calendarOrder ??
          (prevCard?.listIndex !== undefined
            ? prevCard.listIndex * 100000 + (prevExt?.index ?? 0) * 1000
            : 0);
        const nextOrder =
          nextExt?.calendarOrder ??
          (nextCard?.listIndex !== undefined
            ? nextCard.listIndex * 100000 + (nextExt?.index ?? 0) * 1000
            : prevOrder + 10000);

        const step = (nextOrder - prevOrder) / (cardsToMove.length + 1);

        const newOrders = new Map<string, number>();
        cardsToMove.forEach((cardId, index) => {
          newOrders.set(cardId, Math.round(prevOrder + step * (index + 1)));
        });

        setVisualLists((prev) => {
          if (!prev) return prev;
          return prev.map((list) => ({
            ...list,
            cards: list.cards.map((card) => {
              if (cardsToMove.includes(card.publicId)) {
                return {
                  ...card,
                  dueDate: newDueDate,
                  calendarOrder:
                    newOrders.get(card.publicId) ?? card.calendarOrder,
                };
              }
              return card;
            }),
          }));
        });

        if (cardsToMove.length > 0) {
          mutations.bulkUpdateCardMutation.mutate(
            cardsToMove.map((cardId) => ({
              cardPublicId: cardId,
              dueDate: newDueDate,
              calendarOrder: newOrders.get(cardId),
            })),
          );
        }

        setSelectedCardIds(new Set());
        setLastSelectedCardId(null);
        return;
      }

      const cardsToMove = selectedCardIds.has(draggableId)
        ? getOrderedSelectedCards(draggableId)
        : [draggableId];

      setVisualLists((prev) => {
        if (!prev) return prev;
        const updated = prev.map((list) => ({
          ...list,
          cards: [...list.cards],
        }));

        const movedCards: (typeof updated)[0]["cards"] = [];
        for (const list of updated) {
          for (let i = list.cards.length - 1; i >= 0; i--) {
            const cardId = list.cards[i]?.publicId;
            if (cardId && cardsToMove.includes(cardId)) {
              movedCards.push(...list.cards.splice(i, 1));
            }
          }
        }

        movedCards.sort((a, b) => {
          const aIdx = cardsToMove.indexOf(a.publicId);
          const bIdx = cardsToMove.indexOf(b.publicId);
          return aIdx - bIdx;
        });

        const destList = updated.find(
          (l) => l.publicId === destination.droppableId,
        );
        if (destList) {
          destList.cards.splice(destination.index, 0, ...movedCards);
        }

        return updated.map((list) => ({
          ...list,
          cards: list.cards.map((card, idx) => ({ ...card, index: idx })),
        }));
      });

      if (cardsToMove.length > 1) {
        mutations.bulkMoveMutation.mutate({
          cardPublicIds: cardsToMove,
          listPublicId: destination.droppableId,
          startIndex: destination.index,
        });
      } else {
        mutations.updateCardMutation.mutate({
          cardPublicId: draggableId,
          listPublicId: destination.droppableId,
          index: destination.index,
        });
      }

      setSelectedCardIds(new Set());
      setLastSelectedCardId(null);
    },
    [
      setIsDragging,
      getOrderedSelectedCards,
      listsToRender,
      mutations,
      selectedCardIds,
      setLastSelectedCardId,
      setSelectedCardIds,
      setVisualLists,
    ],
  );

  return { onDragStart, onDragEnd };
}

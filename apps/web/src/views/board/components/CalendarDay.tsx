import type { DroppableProvided } from "@hello-pangea/dnd";
import { Draggable } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { useCallback, useState } from "react";
import { HiArrowsPointingOut } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { derivePastelColor, getContrastColor } from "~/utils/colorUtils";

interface CardData {
  publicId: string;
  title: string;
  index: number;
  dueDate: Date | null;
  labels: { name: string; colourCode: string | null }[];
  members: {
    publicId: string;
    email: string;
    user: { name: string | null; email: string; image: string | null } | null;
  }[];
  checklists: {
    publicId: string;
    name: string;
    items: {
      publicId: string;
      title: string;
      completed: boolean;
      index: number;
    }[];
  }[];
  description: string | null;
  comments: { publicId: string }[];
  attachments?: { publicId: string }[];
}

interface CalendarDayProps {
  day: Date;
  cards: { card: CardData; listColor: string | null }[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isDraggingOver: boolean;
  onCardClick: (e: React.MouseEvent, cardPublicId: string) => void;
  onExpandCard: (cardPublicId: string) => void;
  selectedCardIds: Set<string>;
  deletingIds: Set<string>;
  draggingCardId: string | null;
  selectedCardCount?: number; // For multi-drag badge
  provided: DroppableProvided;
}

const MAX_VISIBLE_CARDS = 3;

export default function CalendarDay({
  day,
  cards,
  isCurrentMonth,
  isToday,
  isDraggingOver,
  onCardClick,
  onExpandCard,
  selectedCardIds,
  deletingIds,
  draggingCardId,
  selectedCardCount = 0,
  provided,
}: CalendarDayProps) {
  const dayNumber = format(day, "d");
  const [isExpanded, setIsExpanded] = useState(false);

  // Removed auto-collapse on drag start to fix bug

  const visibleCards = isExpanded ? cards : cards.slice(0, MAX_VISIBLE_CARDS);
  const overflowCount = cards.length - MAX_VISIBLE_CARDS;
  const hasOverflow = overflowCount > 0;

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div
      className={twMerge(
        "flex flex-col rounded-md border p-1.5 transition-colors",
        isExpanded ? "min-h-fit" : "min-h-[100px]",
        isCurrentMonth
          ? "border-light-300 bg-light-100 dark:border-dark-300 dark:bg-dark-100"
          : "border-light-200 bg-light-50 opacity-50 dark:border-dark-200 dark:bg-dark-50",
        isDraggingOver && "border-blue-400 bg-blue-50 dark:bg-blue-900/20",
      )}
    >
      {/* Day number */}
      <div className="mb-1.5 flex justify-end">
        <span
          className={twMerge(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
            isToday
              ? "bg-blue-500 text-white"
              : isCurrentMonth
                ? "text-light-800 dark:text-dark-900"
                : "text-light-500 dark:text-dark-600",
          )}
        >
          {dayNumber}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={twMerge(
          "flex flex-1 flex-col gap-1",
          isExpanded && "max-h-[300px] overflow-y-auto",
        )}
      >
        {visibleCards.map(({ card, listColor }, index) => {
          const isSelected = selectedCardIds.has(card.publicId);
          const isDeleting = deletingIds.has(card.publicId);
          const isGhosting =
            draggingCardId !== null &&
            selectedCardIds.has(card.publicId) &&
            card.publicId !== draggingCardId;
          const isDragging = draggingCardId === card.publicId;

          // Card styling based on list color
          const cardBackground = listColor
            ? derivePastelColor(listColor)
            : null;
          const cardStyle = cardBackground
            ? { backgroundColor: cardBackground }
            : undefined;
          const cardTextColor = cardBackground
            ? getContrastColor(cardBackground)
            : "var(--kan-pages-text)";

          return (
            <Draggable
              key={card.publicId}
              draggableId={card.publicId}
              index={index}
            >
              {(dragProvided, dragSnapshot) => (
                <div
                  ref={dragProvided.innerRef}
                  {...dragProvided.draggableProps}
                  {...dragProvided.dragHandleProps}
                  onClick={(e) => onCardClick(e, card.publicId)}
                  className={twMerge(
                    "transition-dnd-safe group relative flex items-center rounded-md px-2 py-1 text-xs",
                    listColor
                      ? ""
                      : "bg-light-200 hover:bg-light-300 dark:bg-dark-200 dark:hover:bg-dark-300",
                    // Gentler selection highlight
                    isSelected &&
                      "ring-1 ring-blue-400/60 ring-offset-1 ring-offset-transparent",
                    isDeleting && "delete-fade-out",
                    isGhosting && "multi-drag-ghost pointer-events-none",
                    dragSnapshot.isDragging && "z-50 shadow-lg",
                  )}
                  style={{
                    ...dragProvided.draggableProps.style,
                    ...cardStyle,
                    color: cardTextColor,
                  }}
                  title={card.title}
                >
                  <span className="flex-1 truncate pr-5">{card.title}</span>
                  {/* Expand button - shows on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onExpandCard(card.publicId);
                    }}
                    className={twMerge(
                      "absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-opacity",
                      "hover:bg-black/10 dark:hover:bg-white/10",
                      "group-hover:opacity-60 hover:!opacity-100",
                      isSelected && "opacity-60",
                    )}
                    aria-label="Open card"
                  >
                    <HiArrowsPointingOut className="h-3 w-3" />
                  </button>
                  {/* Multi-drag count badge */}
                  {isDragging && selectedCardCount > 1 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                      {selectedCardCount}
                    </span>
                  )}
                </div>
              )}
            </Draggable>
          );
        })}
        {provided.placeholder}

        {/* Expandable overflow button */}
        {hasOverflow && (
          <button
            onClick={toggleExpand}
            className="mt-0.5 rounded px-1 py-0.5 text-center text-[10px] font-medium transition-colors hover:bg-light-200 dark:hover:bg-dark-300"
            style={{ color: "var(--kan-pages-text)", opacity: 0.6 }}
          >
            {isExpanded ? "Show less" : `+${overflowCount} more`}
          </button>
        )}
      </div>
    </div>
  );
}

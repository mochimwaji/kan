import type { DroppableProvided } from "@hello-pangea/dnd";
import { Draggable } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { HiArrowsPointingOut } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { useLocalisation } from "~/hooks/useLocalisation";
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

interface MobileCalendarRowProps {
  day: Date;
  cards: { card: CardData; listColor: string | null }[];
  isToday: boolean;
  isDraggingOver: boolean;
  onCardClick: (e: React.MouseEvent, cardPublicId: string) => void;
  onExpandCard: (cardPublicId: string) => void;
  selectedCardIds: Set<string>;
  deletingIds: Set<string>;
  draggingCardId: string | null;
  selectedCardCount?: number;
  provided: DroppableProvided;
}

/**
 * Mobile-optimized calendar day row component.
 * Displays a single day as a full-width row with cards listed horizontally.
 */
export default function MobileCalendarRow({
  day,
  cards,
  isToday,
  isDraggingOver,
  onCardClick,
  onExpandCard,
  selectedCardIds,
  deletingIds,
  draggingCardId,
  selectedCardCount = 0,
  provided,
}: MobileCalendarRowProps) {
  const { dateLocale } = useLocalisation();
  const dayOfWeek = format(day, "EEE", { locale: dateLocale });
  const dayNumber = format(day, "d");
  const monthName = format(day, "MMM", { locale: dateLocale });

  return (
    <div
      className={twMerge(
        "flex min-h-[60px] gap-3 border-b border-light-200 px-3 py-2 dark:border-dark-300",
        isDraggingOver && "bg-blue-50 dark:bg-blue-900/20",
      )}
    >
      {/* Date column */}
      <div className="flex w-12 flex-shrink-0 flex-col items-center justify-start pt-1">
        <span
          className="text-xs uppercase"
          style={{ color: "var(--kan-pages-text)", opacity: 0.6 }}
        >
          {dayOfWeek}
        </span>
        <span
          className={twMerge(
            "flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold",
            isToday
              ? "bg-blue-500 text-white"
              : "text-light-900 dark:text-dark-900",
          )}
        >
          {dayNumber}
        </span>
        <span
          className="text-[10px]"
          style={{ color: "var(--kan-pages-text)", opacity: 0.5 }}
        >
          {monthName}
        </span>
      </div>

      {/* Cards column - horizontal scroll */}
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className="flex flex-1 items-center gap-2 overflow-x-auto"
      >
        {cards.length === 0 ? (
          <span
            className="text-xs italic"
            style={{ color: "var(--kan-pages-text)", opacity: 0.4 }}
          >
            No cards
          </span>
        ) : (
          cards.map(({ card, listColor }, index) => {
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
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onExpandCard(card.publicId);
                    }}
                    className={twMerge(
                      "transition-dnd-safe group relative flex flex-shrink-0 items-center rounded-lg px-3 py-2 text-xs",
                      "max-w-[200px]",
                      listColor
                        ? ""
                        : "bg-light-200 hover:bg-light-300 dark:bg-dark-200 dark:hover:bg-dark-300",
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
                    {/* Expand button */}
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
          })
        )}
        {provided.placeholder}
      </div>
    </div>
  );
}

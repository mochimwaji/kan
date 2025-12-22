import { Draggable, Droppable } from "@hello-pangea/dnd";
import { useCallback, useState } from "react";
import {
  HiArrowsPointingOut,
  HiChevronLeft,
  HiChevronRight,
  HiOutlineClipboardDocumentList,
} from "react-icons/hi2";
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

interface UnscheduledSidebarProps {
  cards: { card: CardData; listColor: string | null }[];
  onCardClick: (e: React.MouseEvent, cardPublicId: string) => void;
  onExpandCard: (cardPublicId: string) => void;
  selectedCardIds: Set<string>;
  deletingIds: Set<string>;
  draggingCardId: string | null;
}

export default function UnscheduledSidebar({
  cards,
  onCardClick,
  onExpandCard,
  selectedCardIds,
  deletingIds,
  draggingCardId,
}: UnscheduledSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className={twMerge(
        "flex flex-col rounded-md border transition-all",
        isCollapsed ? "w-10" : "w-64",
      )}
      style={{
        backgroundColor: "var(--kan-pages-bg)",
        borderColor: "var(--kan-menu-border, var(--kan-pages-bg))",
      }}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 border-b border-light-300 p-2 dark:border-dark-300"
        onClick={toggleCollapse}
      >
        <button
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded hover:bg-light-300 dark:hover:bg-dark-200"
          aria-label={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? (
            <HiChevronLeft
              className="h-4 w-4"
              style={{ color: "var(--kan-pages-text)" }}
            />
          ) : (
            <HiChevronRight
              className="h-4 w-4"
              style={{ color: "var(--kan-pages-text)" }}
            />
          )}
        </button>
        {!isCollapsed && (
          <>
            <HiOutlineClipboardDocumentList
              className="h-4 w-4 flex-shrink-0"
              style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
            />
            <span
              className="flex-1 text-sm font-medium"
              style={{ color: "var(--kan-pages-text)" }}
            >
              {"Unscheduled"}
            </span>
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-light-400 px-1.5 text-[10px] font-medium dark:bg-dark-300"
              style={{ color: "var(--kan-pages-text)" }}
            >
              {cards.length}
            </span>
          </>
        )}
      </div>

      {/* Cards list - collapsible */}
      {!isCollapsed && (
        <Droppable droppableId="unscheduled" type="CARD">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={twMerge(
                "flex-1 space-y-1.5 overflow-y-auto p-2",
                snapshot.isDraggingOver && "bg-blue-50 dark:bg-blue-900/20",
              )}
            >
              {cards.map(({ card, listColor }, index) => {
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
                          "transition-dnd-safe group relative cursor-pointer rounded-md border px-2 py-1.5 text-sm",
                          listColor
                            ? "border-opacity-30"
                            : "border-light-300 bg-light-50 hover:bg-light-100 dark:border-dark-300 dark:bg-dark-200 dark:hover:bg-dark-300",
                          // Gentler selection highlight
                          isSelected &&
                            "ring-1 ring-blue-400/60 ring-offset-1 ring-offset-transparent",
                          isDeleting && "delete-fade-out",
                          isGhosting && "multi-drag-ghost pointer-events-none",
                          dragSnapshot.isDragging && "shadow-lg",
                        )}
                        style={{
                          ...dragProvided.draggableProps.style,
                          ...cardStyle,
                          color: cardTextColor,
                        }}
                      >
                        <div className="line-clamp-2 pr-5">{card.title}</div>
                        {/* Expand button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onExpandCard(card.publicId);
                          }}
                          className={twMerge(
                            "absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-opacity",
                            "hover:bg-black/10 dark:hover:bg-white/10",
                            "group-hover:opacity-60 hover:!opacity-100",
                            isSelected && "opacity-60",
                          )}
                          aria-label="Open card"
                        >
                          <HiArrowsPointingOut className="h-3 w-3" />
                        </button>
                        {/* Multi-drag count badge */}
                        {isDragging && selectedCardIds.size > 1 && (
                          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                            {selectedCardIds.size}
                          </span>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
              {cards.length === 0 && (
                <div
                  className="py-4 text-center text-sm"
                  style={{ color: "var(--kan-pages-text)", opacity: 0.5 }}
                >
                  {"No unscheduled cards"}
                </div>
              )}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
}

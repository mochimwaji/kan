import { Draggable, Droppable } from "@hello-pangea/dnd";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
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

interface MobileUnscheduledRowProps {
  cards: { card: CardData; listColor: string | null }[];
  onCardClick: (e: React.MouseEvent, cardPublicId: string) => void;
  onExpandCard: (cardPublicId: string) => void;
  selectedCardIds: Set<string>;
  deletingIds: Set<string>;
  draggingCardId: string | null;
}

/**
 * Horizontal scrollable row for unscheduled cards on mobile.
 * Cards are displayed as pill-shaped elements with truncated titles.
 */
export default function MobileUnscheduledRow({
  cards,
  onCardClick,
  onExpandCard,
  selectedCardIds,
  deletingIds,
  draggingCardId,
}: MobileUnscheduledRowProps) {
  return (
    <div className="border-b border-light-200 dark:border-dark-300">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2">
        <HiOutlineClipboardDocumentList
          className="h-4 w-4"
          style={{ color: "var(--kan-pages-text)", opacity: 0.6 }}
        />
        <span
          className="text-xs font-medium"
          style={{ color: "var(--kan-pages-text)", opacity: 0.6 }}
        >
          Unscheduled ({cards.length})
        </span>
      </div>

      {/* Horizontal scrollable cards */}
      <Droppable
        droppableId="calendar-unscheduled"
        type="CARD"
        direction="horizontal"
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={twMerge(
              "flex gap-2 overflow-x-auto px-4 pb-3",
              snapshot.isDraggingOver && "bg-blue-50 dark:bg-blue-900/20",
            )}
          >
            {cards.length === 0 ? (
              <span
                className="py-2 text-xs italic"
                style={{ color: "var(--kan-pages-text)", opacity: 0.4 }}
              >
                No unscheduled cards
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
                        className={twMerge(
                          "transition-dnd-safe relative flex flex-shrink-0 items-center rounded-full px-3 py-1.5 text-xs",
                          "max-w-[150px]",
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
                        <span className="truncate">{card.title}</span>
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
              })
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

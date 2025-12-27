import { Droppable } from "@hello-pangea/dnd";
import { addDays, format, isSameDay, subDays } from "date-fns";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { HiOutlineCalendarDays } from "react-icons/hi2";

import { useLocalisation } from "~/hooks/useLocalisation";
import MobileCalendarRow from "./MobileCalendarRow";

interface CardData {
  publicId: string;
  title: string;
  index: number;
  calendarOrder?: number | null;
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

interface ListData {
  publicId: string;
  name: string;
  color?: string | null;
  cards: CardData[];
}

interface MobileCalendarViewProps {
  lists: ListData[];
  onCardClick: (e: React.MouseEvent, cardPublicId: string) => void;
  onExpandCard: (cardPublicId: string) => void;
  selectedCardIds: Set<string>;
  deletingIds: Set<string>;
  draggingCardId: string | null;
}

// Initial cache: 60 days each direction (2 months)
const INITIAL_PAST_DAYS = 60;
const INITIAL_FUTURE_DAYS = 60;
// Buffer threshold: load more when within 30 days of edge
const BUFFER_THRESHOLD = 30;
// Load 30 days at a time
const LOAD_MORE_DAYS = 30;

/**
 * Mobile calendar view with bi-directional infinite scroll.
 * Maintains scroll position when prepending past days.
 */
export default function MobileCalendarView({
  lists,
  onCardClick,
  onExpandCard,
  selectedCardIds,
  deletingIds,
  draggingCardId,
}: MobileCalendarViewProps) {
  const { dateLocale } = useLocalisation();
  const today = useMemo(() => new Date(), []);
  const [pastDays, setPastDays] = useState(INITIAL_PAST_DAYS);
  const [futureDays, setFutureDays] = useState(INITIAL_FUTURE_DAYS);
  const [headerDate, setHeaderDate] = useState(today);
  const containerRef = useRef<HTMLDivElement>(null);
  const todayRowRef = useRef<HTMLDivElement>(null);
  const hasScrolledToToday = useRef(false);

  // For scroll anchoring when prepending
  const scrollHeightBeforeUpdate = useRef<number | null>(null);
  const scrollTopBeforeUpdate = useRef<number>(0);

  // Generate the list of days to display (past + today + future)
  const visibleDays = useMemo(() => {
    const days: Date[] = [];
    // Add past days (oldest first)
    for (let i = pastDays; i > 0; i--) {
      days.push(subDays(today, i));
    }
    // Add today and future days
    for (let i = 0; i < futureDays; i++) {
      days.push(addDays(today, i));
    }
    return days;
  }, [today, pastDays, futureDays]);

  // Build a map of date -> cards for quick lookup
  const cardsByDate = useMemo(() => {
    const map = new Map<
      string,
      { card: CardData; listColor: string | null; listIndex: number }[]
    >();

    for (let listIndex = 0; listIndex < lists.length; listIndex++) {
      const list = lists[listIndex];
      if (!list) continue;

      for (const card of list.cards) {
        if (card.dueDate) {
          const dateKey = format(card.dueDate, "yyyy-MM-dd");
          const existing = map.get(dateKey) ?? [];
          existing.push({ card, listColor: list.color ?? null, listIndex });
          map.set(dateKey, existing);
        }
      }
    }

    // Sort cards by calendarOrder
    for (const [, cards] of map) {
      cards.sort((a, b) => {
        const orderA =
          a.card.calendarOrder ?? a.listIndex * 100000 + a.card.index * 1000;
        const orderB =
          b.card.calendarOrder ?? b.listIndex * 100000 + b.card.index * 1000;
        return orderA - orderB;
      });
    }

    return map;
  }, [lists]);

  // Adjust scroll position after prepending past days
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container && scrollHeightBeforeUpdate.current !== null) {
      // Calculate how much content was added at the top
      const heightDiff =
        container.scrollHeight - scrollHeightBeforeUpdate.current;
      // Restore scroll position by adding the height difference
      container.scrollTop = scrollTopBeforeUpdate.current + heightDiff;
      scrollHeightBeforeUpdate.current = null;
    }
  }, [pastDays]);

  // Scroll to today on initial mount
  useEffect(() => {
    if (!hasScrolledToToday.current && todayRowRef.current) {
      todayRowRef.current.scrollIntoView({ block: "start" });
      hasScrolledToToday.current = true;
    }
  }, [visibleDays]);

  // Handle scroll to load more days and update header
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Update header based on first visible row
    const rows = container.querySelectorAll("[data-date]");
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      if (rect.top >= containerRect.top) {
        const dateStr = row.getAttribute("data-date");
        if (dateStr) {
          setHeaderDate(new Date(dateStr));
        }
        break;
      }
    }

    // Check if we need to load more past days (within buffer of top)
    if (container.scrollTop < BUFFER_THRESHOLD * 60) {
      // Save current scroll state BEFORE updating
      scrollHeightBeforeUpdate.current = container.scrollHeight;
      scrollTopBeforeUpdate.current = container.scrollTop;
      setPastDays((prev) => prev + LOAD_MORE_DAYS);
    }

    // Check if we need to load more future days (within buffer of bottom)
    const scrollBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (scrollBottom < BUFFER_THRESHOLD * 60) {
      setFutureDays((prev) => prev + LOAD_MORE_DAYS);
    }
  }, []);

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Scroll to today
  const scrollToToday = useCallback(() => {
    const todayRow = todayRowRef.current;
    if (todayRow) {
      todayRow.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <HiOutlineCalendarDays className="h-5 w-5 text-light-600 dark:text-dark-800" />
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--kan-pages-text)" }}
          >
            {format(headerDate, "MMMM yyyy", { locale: dateLocale })}
          </h2>
        </div>
        <button
          onClick={scrollToToday}
          className="rounded px-2 py-1 text-sm active:bg-light-300 dark:active:bg-dark-200"
          style={{ color: "var(--kan-pages-text)" }}
        >
          Today
        </button>
      </div>

      {/* Scrollable day rows */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {visibleDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const cardsForDay = cardsByDate.get(dateKey) ?? [];
          const isToday = isSameDay(day, today);

          return (
            <Droppable
              key={dateKey}
              droppableId={`calendar-${dateKey}`}
              type="CARD"
              direction="horizontal"
            >
              {(provided, snapshot) => (
                <div
                  data-date={dateKey}
                  ref={isToday ? todayRowRef : undefined}
                >
                  <MobileCalendarRow
                    day={day}
                    cards={cardsForDay}
                    isToday={isToday}
                    isDraggingOver={snapshot.isDraggingOver}
                    onCardClick={onCardClick}
                    onExpandCard={onExpandCard}
                    selectedCardIds={selectedCardIds}
                    deletingIds={deletingIds}
                    draggingCardId={draggingCardId}
                    selectedCardCount={selectedCardIds.size}
                    provided={provided}
                  />
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </div>
  );
}

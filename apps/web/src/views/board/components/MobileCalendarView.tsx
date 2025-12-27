import { Droppable } from "@hello-pangea/dnd";
import { addDays, format, isSameDay, subDays } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Cache 2 months (60 days) in each direction initially
const INITIAL_PAST_DAYS = 60;
const INITIAL_FUTURE_DAYS = 60;
// Load 1 month (30 days) more when approaching the edge
const LOAD_MORE_DAYS = 30;

/**
 * Mobile calendar view with bi-directional infinite scroll.
 * Caches 2 months in each direction for smooth scrolling.
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
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const todayRowRef = useRef<HTMLDivElement>(null);
  const hasScrolledToToday = useRef(false);

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

  // Load more past days
  const loadMorePastDays = useCallback(() => {
    setPastDays((prev) => prev + LOAD_MORE_DAYS);
  }, []);

  // Load more future days
  const loadMoreFutureDays = useCallback(() => {
    setFutureDays((prev) => prev + LOAD_MORE_DAYS);
  }, []);

  // Scroll to today on initial mount
  useEffect(() => {
    if (!hasScrolledToToday.current && todayRowRef.current) {
      todayRowRef.current.scrollIntoView({ block: "start" });
      hasScrolledToToday.current = true;
    }
  }, [visibleDays]);

  // Intersection observer for top sentinel (past days)
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMorePastDays();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMorePastDays]);

  // Intersection observer for bottom sentinel (future days)
  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreFutureDays();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreFutureDays]);

  // Track scroll to update header date
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Find the first visible day row
      const rows = container.querySelectorAll("[data-date]");
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (rect.top >= 0) {
          const dateStr = row.getAttribute("data-date");
          if (dateStr) {
            setHeaderDate(new Date(dateStr));
          }
          break;
        }
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to today
  const scrollToToday = useCallback(() => {
    const todayRow = todayRowRef.current;
    if (todayRow) {
      todayRow.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
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
        {/* Top sentinel for loading past days */}
        <div ref={topSentinelRef} className="h-1" />

        {visibleDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const cardsForDay = cardsByDate.get(dateKey) ?? [];
          const isToday = isSameDay(day, today);

          return (
            <Droppable
              key={dateKey}
              droppableId={`calendar-${dateKey}`}
              type="CARD"
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

        {/* Bottom sentinel for loading future days */}
        <div ref={bottomSentinelRef} className="h-4" />
      </div>
    </div>
  );
}

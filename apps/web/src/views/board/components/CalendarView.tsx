import { Droppable } from "@hello-pangea/dnd";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiChevronLeft,
  HiChevronRight,
  HiOutlineCalendarDays,
} from "react-icons/hi2";

import { useLocalisation } from "~/hooks/useLocalisation";
import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";
import CalendarDay from "./CalendarDay";
import MobileCalendarView from "./MobileCalendarView";
import MobileUnscheduledRow from "./MobileUnscheduledRow";
import UnscheduledSidebar from "./UnscheduledSidebar";

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

interface CalendarViewProps {
  lists: ListData[];
  onCardClick: (e: React.MouseEvent, cardPublicId: string) => void;
  onExpandCard: (cardPublicId: string) => void;
  selectedCardIds: Set<string>;
  deletingIds: Set<string>;
  draggingCardId: string | null;
}

export default function CalendarView({
  lists,
  onCardClick,
  onExpandCard,
  selectedCardIds,
  deletingIds,
  draggingCardId,
}: CalendarViewProps) {
  const { dateLocale } = useLocalisation();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Hydration-safe mobile detection
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentMonth(new Date());
  }, []);

  // Keyboard shortcuts for calendar navigation
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "ArrowLeft" },
    action: goToPreviousMonth,
    description: "Previous month",
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "ArrowRight" },
    action: goToNextMonth,
    description: "Next month",
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "T" },
    action: goToToday,
    description: "Go to today",
    group: "BOARD_VIEW",
  });

  // Calculate calendar days (including days from adjacent months to fill the grid)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

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
          // Pass listIndex down or use it for sorting immediately?
          // We can't easily store it on the card object without mutating or wrapping.
          // Wrapping is better.
          existing.push({ card, listColor: list.color ?? null, listIndex });
          map.set(dateKey, existing);
        }
      }
    }

    // Sort cards by calendarOrder (or defaultRank as fallback)
    for (const [_, cards] of map) {
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

  // Get unscheduled cards (no due date)
  const unscheduledCards = useMemo(() => {
    const cards: {
      card: CardData;
      listColor: string | null;
      listIndex: number;
    }[] = [];

    for (let listIndex = 0; listIndex < lists.length; listIndex++) {
      const list = lists[listIndex];
      if (!list) continue;

      for (const card of list.cards) {
        if (!card.dueDate) {
          cards.push({ card, listColor: list.color ?? null, listIndex });
        }
      }
    }

    return cards.sort((a, b) => {
      const orderA =
        a.card.calendarOrder ?? a.listIndex * 100000 + a.card.index * 1000;
      const orderB =
        b.card.calendarOrder ?? b.listIndex * 100000 + b.card.index * 1000;
      return orderA - orderB;
    });
  }, [lists]);

  // Week day headers
  const weekDays = useMemo(() => {
    const days = [];
    const startDate = startOfWeek(new Date(), { weekStartsOn: 0 });
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(format(day, "EEE", { locale: dateLocale }));
    }
    return days;
  }, [dateLocale]);

  const today = new Date();

  // Render mobile layout after hydration
  if (isMounted && isMobile) {
    return (
      <div className="flex h-full flex-col px-2">
        <MobileUnscheduledRow
          cards={unscheduledCards}
          onCardClick={onCardClick}
          onExpandCard={onExpandCard}
          selectedCardIds={selectedCardIds}
          deletingIds={deletingIds}
          draggingCardId={draggingCardId}
        />
        <MobileCalendarView
          lists={lists}
          onCardClick={onCardClick}
          onExpandCard={onExpandCard}
          selectedCardIds={selectedCardIds}
          deletingIds={deletingIds}
          draggingCardId={draggingCardId}
        />
      </div>
    );
  }

  // Desktop layout (also rendered on server for SSR)
  return (
    <div className="flex h-full gap-4">
      {/* Main Calendar Grid */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with navigation */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiOutlineCalendarDays className="h-5 w-5 text-light-600 dark:text-dark-800" />
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--kan-pages-text)" }}
            >
              {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousMonth}
              className="rounded p-1.5 hover:bg-light-300 dark:hover:bg-dark-200"
              aria-label={"Previous month"}
            >
              <HiChevronLeft
                className="h-5 w-5"
                style={{ color: "var(--kan-pages-text)" }}
              />
            </button>
            <button
              onClick={goToToday}
              className="rounded px-2 py-1 text-sm hover:bg-light-300 dark:hover:bg-dark-200"
              style={{ color: "var(--kan-pages-text)" }}
            >
              {"Today"}
            </button>
            <button
              onClick={goToNextMonth}
              className="rounded p-1.5 hover:bg-light-300 dark:hover:bg-dark-200"
              aria-label={"Next month"}
            >
              <HiChevronRight
                className="h-5 w-5"
                style={{ color: "var(--kan-pages-text)" }}
              />
            </button>
          </div>
        </div>

        {/* Week day headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {weekDays.map((day, idx) => (
            <div
              key={idx}
              className="py-2 text-center text-xs font-medium uppercase"
              style={{ color: "var(--kan-pages-text)", opacity: 0.6 }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div
          key={currentMonth.toISOString()}
          className="animate-view-fade grid flex-1 grid-cols-7 gap-1 overflow-auto"
        >
          {calendarDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const cardsForDay = cardsByDate.get(dateKey) ?? [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);

            return (
              <Droppable
                key={dateKey}
                droppableId={`calendar-${dateKey}`}
                type="CARD"
              >
                {(provided, snapshot) => (
                  <CalendarDay
                    day={day}
                    cards={cardsForDay}
                    isCurrentMonth={isCurrentMonth}
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
                )}
              </Droppable>
            );
          })}
        </div>
      </div>

      {/* Unscheduled sidebar */}
      <UnscheduledSidebar
        cards={unscheduledCards}
        onCardClick={onCardClick}
        onExpandCard={onExpandCard}
        selectedCardIds={selectedCardIds}
        deletingIds={deletingIds}
        draggingCardId={draggingCardId}
      />
    </div>
  );
}

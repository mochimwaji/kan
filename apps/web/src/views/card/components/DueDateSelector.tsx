import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { HiMiniPlus } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import DateSelector from "~/components/DateSelector";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface DueDateSelectorProps {
  cardPublicId: string;
  dueDate: Date | null | undefined;
  isLoading?: boolean;
  isCollapsed?: boolean;
  children?: React.ReactNode;
}

export function DueDateSelector({
  cardPublicId,
  dueDate,
  isLoading = false,
  isCollapsed = false,
  children,
}: DueDateSelectorProps) {
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // For DOM presence
  const [animateIn, setAnimateIn] = useState(false); // For CSS transition
  const [pendingDate, setPendingDate] = useState<Date | null | undefined>(
    dueDate,
  );
  const animationFrameRef = useRef<number>();

  // Sync pendingDate with dueDate when it changes externally
  useEffect(() => {
    if (!isOpen) {
      setPendingDate(dueDate);
    }
  }, [dueDate, isOpen]);

  // Handle fade in/out animation with proper sequencing
  useEffect(() => {
    if (isOpen) {
      // Opening: First make visible, then trigger animation on next frame
      setIsVisible(true);
      // Use double rAF to ensure DOM is painted before transition starts
      animationFrameRef.current = requestAnimationFrame(() => {
        animationFrameRef.current = requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    } else {
      // Closing: First animate out, then hide after transition
      setAnimateIn(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 150); // Match transition duration
      return () => clearTimeout(timer);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  const updateDueDate = api.card.update.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel();

      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;

        return {
          ...oldCard,
          dueDate:
            update.dueDate !== undefined
              ? (update.dueDate)
              : oldCard.dueDate,
        };
      });

      return { previousCard };
    },
    onError: (_error, _update, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: "Unable to update due date",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId });
      await utils.board.byId.invalidate();
    },
  });

  const handleDateSelect = (date: Date | undefined) => {
    // Only update local state, don't fire mutation
    setPendingDate(date ?? null);
  };

  const handleBackdropClick = () => {
    // Only fire mutation if date actually changed
    const pendingIsNull = pendingDate === null || pendingDate === undefined;
    const dueIsNull = dueDate === null || dueDate === undefined;

    let dateChanged = false;
    if (pendingIsNull && !dueIsNull) {
      dateChanged = true;
    } else if (!pendingIsNull && dueIsNull) {
      dateChanged = true;
    } else if (!pendingIsNull && !dueIsNull) {
      // Both are non-null at this point
      if (pendingDate instanceof Date && dueDate instanceof Date) {
        dateChanged = pendingDate.getTime() !== dueDate.getTime();
      }
    }

    // Close popover with animation
    setIsOpen(false);

    // Fire mutation if date changed (optimistic update will handle UI)
    if (dateChanged) {
      updateDueDate.mutate({
        cardPublicId,
        dueDate: pendingDate ?? null,
      });
    }
  };

  // When children are provided, use them as the trigger (clickable header pattern)
  // IMPORTANT: w-full ensures the hover highlight extends full width
  const triggerElement = children ? (
    <div
      onClick={() => setIsOpen(!isOpen)}
      className="w-full cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setIsOpen(!isOpen);
        }
      }}
    >
      {children}
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      disabled={isLoading}
      className="flex h-full w-full items-center rounded-[5px] border-[1px] border-light-50 py-1 pl-2 text-left text-xs hover:border-light-300 hover:bg-light-200 dark:border-dark-50 dark:hover:border-dark-200 dark:hover:bg-dark-100"
    >
      {dueDate ? (
        <span>{format(dueDate, "MMM d, yyyy")}</span>
      ) : (
        <>
          <HiMiniPlus size={22} className="pr-2" />
          {"Set due date"}
        </>
      )}
    </button>
  );

  return (
    <div
      className={`relative flex w-full items-center ${isCollapsed ? "justify-center" : "text-left"}`}
    >
      {triggerElement}
      {isVisible && (
        <>
          {/* Backdrop with fade */}
          <div
            className={twMerge(
              "fixed inset-0 z-40 transition-opacity duration-150",
              animateIn ? "opacity-100" : "opacity-0",
            )}
            onClick={handleBackdropClick}
          />
          {/* Calendar popup with fade - uses absolute positioning relative to button */}
          <div
            className={twMerge(
              "absolute left-0 top-full z-50 mt-2 rounded-md border border-light-200 shadow-lg transition-all duration-150 dark:border-dark-200",
              animateIn
                ? "scale-100 opacity-100"
                : "pointer-events-none scale-95 opacity-0",
            )}
            style={{ backgroundColor: "var(--kan-menu-bg)" }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <DateSelector
              selectedDate={pendingDate ?? undefined}
              onDateSelect={handleDateSelect}
            />
          </div>
        </>
      )}
    </div>
  );
}

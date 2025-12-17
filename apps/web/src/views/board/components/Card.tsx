import {
  differenceInDays,
  format,
  isBefore,
  isSameDay,
  isSameYear,
  startOfDay,
} from "date-fns";
import { HiOutlinePaperClip } from "react-icons/hi";
import {
  HiArrowsPointingOut,
  HiBars3BottomLeft,
  HiChatBubbleLeft,
  HiOutlineClock,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import CircularProgress from "~/components/CircularProgress";
import LabelIcon from "~/components/LabelIcon";
import { useLocalisation } from "~/hooks/useLocalisation";
import { derivePastelColor, getContrastColor } from "~/utils/colorUtils";
import { getAvatarUrl } from "~/utils/helpers";

// Due date urgency levels for visual feedback
type DueDateUrgency = "overdue" | "today" | "thisWeek" | "default";

const getDueDateUrgency = (dueDate: Date): DueDateUrgency => {
  const now = new Date();
  const today = startOfDay(now);
  const dueDateStart = startOfDay(dueDate);

  if (isBefore(dueDateStart, today)) return "overdue";
  if (isSameDay(dueDateStart, today)) return "today";
  if (differenceInDays(dueDateStart, today) <= 7) return "thisWeek";
  return "default";
};

// Tailwind classes for each urgency level (supports dark mode)
const dueDateUrgencyStyles: Record<
  DueDateUrgency,
  { className: string; useThemeColor: boolean }
> = {
  overdue: {
    className: "text-red-600 dark:text-red-400",
    useThemeColor: false,
  },
  today: {
    className: "text-orange-500 dark:text-orange-400",
    useThemeColor: false,
  },
  thisWeek: {
    className: "text-yellow-600 dark:text-yellow-500",
    useThemeColor: false,
  },
  default: { className: "", useThemeColor: true },
};

const Card = ({
  title,
  labels,
  members,
  checklists,
  description,
  comments,
  attachments,
  dueDate,
  listColor,
  isSelected,
  isDeleting,
  isGhosting,
  onExpand,
}: {
  title: string;
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
  dueDate?: Date | null;
  listColor?: string | null;
  isSelected?: boolean;
  isDeleting?: boolean;
  isGhosting?: boolean;
  onExpand?: () => void;
}) => {
  const { dateLocale } = useLocalisation();
  const showYear = dueDate ? !isSameYear(dueDate, new Date()) : false;

  // Calculate due date urgency for color coding
  const dueDateUrgency = dueDate ? getDueDateUrgency(dueDate) : "default";
  const urgencyStyle = dueDateUrgencyStyles[dueDateUrgency];

  const completedItems = checklists.reduce((acc, checklist) => {
    return acc + checklist.items.filter((item) => item.completed).length;
  }, 0);

  const totalItems = checklists.reduce((acc, checklist) => {
    return acc + checklist.items.length;
  }, 0);

  const progress =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const hasDescription =
    description && description.replace(/<[^>]*>/g, "").trim().length > 0;
  const hasAttachments = attachments && attachments.length > 0;
  const hasDueDate = !!dueDate;

  // Compute card background and text color from list color
  const cardBackground = listColor ? derivePastelColor(listColor) : null;
  const cardStyle = cardBackground
    ? { backgroundColor: cardBackground }
    : undefined;
  // Use contrast color for text when card has a background color
  const cardTextColor = cardBackground
    ? getContrastColor(cardBackground)
    : "var(--kan-pages-text)";

  return (
    <div
      className={twMerge(
        "transition-dnd-safe group relative flex flex-col rounded-md border px-3 py-2 text-sm",
        listColor
          ? "border-opacity-30"
          : "border-light-200 bg-light-50 dark:border-dark-200 dark:bg-dark-200 dark:hover:bg-dark-300",
        isSelected ? "selected-item" : "",
        isDeleting ? "delete-fade-out" : "",
        isGhosting ? "multi-drag-ghost pointer-events-none" : "",
      )}
      style={{ ...cardStyle, color: cardTextColor }}
    >
      {/* Expand button - fades in on hover or when selected */}
      {onExpand && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onExpand();
          }}
          className={twMerge(
            "absolute right-1.5 top-1.5 z-10 rounded p-1 opacity-0 transition-opacity duration-150",
            "hover:bg-light-300 dark:hover:bg-dark-400",
            "group-hover:opacity-60 hover:!opacity-100",
            isSelected && "opacity-60",
          )}
          aria-label="Open card"
        >
          <HiArrowsPointingOut className="h-3.5 w-3.5" />
        </button>
      )}
      {/* Card title */}
      <div className="flex items-start">
        <span className="flex-1 pr-6">{title}</span>
      </div>
      {labels.length ||
      members.length ||
      checklists.length > 0 ||
      hasDescription ||
      comments.length > 0 ||
      hasDueDate ||
      hasAttachments ? (
        <div className="mt-2 flex flex-col justify-end">
          <div className="space-x-0.5">
            {labels.map((label) => (
              <Badge
                value={label.name}
                iconLeft={<LabelIcon colourCode={label.colourCode} />}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              {hasDescription && (
                <div
                  className="flex items-center gap-1"
                  style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
                >
                  <HiBars3BottomLeft className="h-4 w-4" />
                </div>
              )}
              {hasDueDate && dueDate && (
                <div
                  className={twMerge(
                    "flex items-center gap-1",
                    urgencyStyle.className,
                  )}
                  style={{
                    color: urgencyStyle.useThemeColor
                      ? "var(--kan-pages-text)"
                      : undefined,
                    opacity: urgencyStyle.useThemeColor ? 0.7 : 1,
                  }}
                >
                  <HiOutlineClock className="h-4 w-4" />
                  <span className="text-[11px]">
                    {format(dueDate, showYear ? "do MMM yyyy" : "do MMM", {
                      locale: dateLocale,
                    })}
                  </span>
                </div>
              )}
              {comments.length > 0 && (
                <div
                  className="flex items-center gap-1"
                  style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
                >
                  <HiChatBubbleLeft className="h-4 w-4" />
                </div>
              )}
              {hasAttachments && (
                <div
                  className="flex items-center gap-1"
                  style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
                >
                  <HiOutlinePaperClip className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-1">
              {checklists.length > 0 && (
                <div className="flex items-center gap-1 rounded-full border-[1px] border-light-300 px-2 py-1 dark:border-dark-600">
                  <CircularProgress
                    progress={progress || 2}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--kan-pages-text)" }}
                  >
                    {completedItems}/{totalItems}
                  </span>
                </div>
              )}
              {members.length > 0 && (
                <div className="isolate flex justify-end -space-x-1 overflow-hidden">
                  {members.map(({ user, email }) => {
                    const avatarUrl = user?.image
                      ? getAvatarUrl(user.image)
                      : undefined;

                    return (
                      <Avatar
                        name={user?.name ?? ""}
                        email={user?.email ?? email}
                        imageUrl={avatarUrl}
                        size="sm"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Card;

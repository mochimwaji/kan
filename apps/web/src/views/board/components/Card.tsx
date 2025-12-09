import { format, isBefore, isSameYear, startOfDay } from "date-fns";
import { HiOutlinePaperClip } from "react-icons/hi";
import {
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
import { derivePastelColor } from "~/utils/colorUtils";
import { getAvatarUrl } from "~/utils/helpers";

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
}) => {
  const { dateLocale } = useLocalisation();
  const showYear = dueDate ? !isSameYear(dueDate, new Date()) : false;
  const isOverdue = dueDate ? isBefore(dueDate, startOfDay(new Date())) : false;
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

  // Compute card background color from list color
  const cardStyle = listColor
    ? { backgroundColor: derivePastelColor(listColor) }
    : undefined;

  return (
    <div
      className={twMerge(
        "flex flex-col rounded-md border px-3 py-2 text-sm",
        listColor
          ? "border-opacity-30"
          : "border-light-200 bg-light-50 dark:border-dark-200 dark:bg-dark-200 dark:hover:bg-dark-300",
      )}
      style={{ ...cardStyle, color: "var(--kan-pages-text)" }}
    >
      <span>{title}</span>
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
                    isOverdue ? "text-red-600 dark:text-red-400" : "",
                  )}
                  style={{
                    color: isOverdue ? undefined : "var(--kan-pages-text)",
                    opacity: isOverdue ? 1 : 0.7,
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

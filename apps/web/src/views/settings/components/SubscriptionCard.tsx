import {
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineEnvelope,
  HiOutlinePause,
  HiOutlinePencil,
  HiOutlinePlay,
  HiOutlineTrash,
} from "react-icons/hi2";

import Button from "~/components/Button";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface SubscriptionCardProps {
  subscription: {
    publicId: string;
    type: string;
    enabled: boolean;
    timezone: string | null;
    notifyAtHour: number | null;
    frequencyDays: number | null;
    dueDateWithinDays: number | null;
    board?: { publicId: string; name: string } | null;
    list?: { publicId: string; name: string } | null;
    label?: { publicId: string; name: string } | null;
    member?: { publicId: string } | null;
  };
  onEdit: () => void;
}

export default function SubscriptionCard({
  subscription,
  onEdit,
}: SubscriptionCardProps) {
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const deleteMutation = api.notification.subscription.delete.useMutation({
    onSuccess: () => {
      void utils.notification.subscription.list.invalidate();
      showPopup({
        header: "Subscription deleted",
        message: "The notification subscription has been removed.",
        icon: "success",
      });
    },
    onError: (error) => {
      showPopup({
        header: "Delete failed",
        message: error.message,
        icon: "error",
      });
    },
  });

  const toggleMutation = api.notification.subscription.update.useMutation({
    onSuccess: () => {
      void utils.notification.subscription.list.invalidate();
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this subscription?")) {
      deleteMutation.mutate({ subscriptionPublicId: subscription.publicId });
    }
  };

  const handleToggle = () => {
    toggleMutation.mutate({
      subscriptionPublicId: subscription.publicId,
      enabled: !subscription.enabled,
    });
  };

  // Test digest mutation
  const testDigestMutation = api.notification.testDigest.useMutation({
    onSuccess: (data) => {
      showPopup({
        header: "Test digest sent",
        message: `Email sent to ${data.email} with ${data.cardCount} card(s)`,
        icon: "success",
      });
    },
    onError: (error) => {
      showPopup({
        header: "Test failed",
        message: error.message,
        icon: "error",
      });
    },
  });

  const handleTestDigest = () => {
    testDigestMutation.mutate({ subscriptionPublicId: subscription.publicId });
  };

  // Build filter description
  const filters: string[] = [];
  if (subscription.board?.name) {
    filters.push(`Board: ${subscription.board.name}`);
  }
  if (subscription.list?.name) {
    filters.push(`List: ${subscription.list.name}`);
  }
  if (subscription.label?.name) {
    filters.push(`Label: ${subscription.label.name}`);
  }
  if (subscription.dueDateWithinDays) {
    filters.push(`Due within ${subscription.dueDateWithinDays} days`);
  }

  // Format schedule description
  const scheduleDesc =
    subscription.type === "digest"
      ? `Every ${subscription.frequencyDays === 1 ? "day" : `${subscription.frequencyDays} days`} at ${subscription.notifyAtHour}:00 (${subscription.timezone})`
      : "Immediate notifications";

  return (
    <div
      className="flex flex-col items-center rounded-lg border border-light-300 p-4 dark:border-dark-300"
      style={{ backgroundColor: "var(--kan-bg-default)" }}
    >
      {/* Content wrapper for consistent width - all rows left-aligned */}
      <div className="inline-flex flex-col items-start">
        {/* Row 1: Type with icon and status badge */}
        <div className="mb-2 flex items-center gap-2">
          {subscription.type === "digest" ? (
            <HiOutlineCalendarDays
              className="h-5 w-5"
              style={{ color: "var(--kan-pages-text)" }}
            />
          ) : (
            <HiOutlineClock
              className="h-5 w-5"
              style={{ color: "var(--kan-pages-text)" }}
            />
          )}
          <span
            className="font-medium"
            style={{ color: "var(--kan-pages-text)" }}
          >
            {subscription.type === "digest"
              ? "Digest Summary"
              : "Change Notifications"}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              subscription.enabled
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            {subscription.enabled ? "Active" : "Paused"}
          </span>
        </div>

        {/* Row 2: Schedule */}
        <p
          className="mb-1 text-sm"
          style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
        >
          {scheduleDesc}
        </p>

        {/* Row 3: Filters */}
        {filters.length > 0 && (
          <p
            className="mb-3 text-xs"
            style={{ color: "var(--kan-pages-text)", opacity: 0.5 }}
          >
            Filters: {filters.join(" • ")}
          </p>
        )}

        {/* Row 4: Action buttons */}
        <div className="flex items-center gap-1">
          {subscription.type === "digest" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTestDigest}
              disabled={testDigestMutation.isPending}
              title="Send test digest email"
            >
              {testDigestMutation.isPending ? (
                "..."
              ) : (
                <HiOutlineEnvelope className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            disabled={toggleMutation.isPending}
            title={subscription.enabled ? "Pause" : "Resume"}
          >
            {subscription.enabled ? (
              <HiOutlinePause className="h-4 w-4" />
            ) : (
              <HiOutlinePlay className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
            <HiOutlinePencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            title="Delete"
          >
            <HiOutlineTrash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

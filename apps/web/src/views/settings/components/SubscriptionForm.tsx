import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HiOutlineXMark } from "react-icons/hi2";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface SubscriptionFormProps {
  workspacePublicId: string;
  subscriptionPublicId: string | null;
  onClose: () => void;
}

interface FormData {
  type: "digest" | "changes";
  boardPublicId: string;
  listPublicId: string;
  labelPublicId: string;
  memberPublicId: string;
  dueDateWithinDays: string;
  timezone: string;
  notifyAtHour: string;
  frequencyDays: string;
}

// Comprehensive US timezones with friendly labels
const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "America/Adak", label: "Hawaii-Aleutian (HST)" },
  { value: "Pacific/Honolulu", label: "Hawaii (no DST)" },
  // Additional US territories
  { value: "America/Puerto_Rico", label: "Puerto Rico (AST)" },
  { value: "Pacific/Guam", label: "Guam (ChST)" },
  // Other common timezones
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
];

export default function SubscriptionForm({
  workspacePublicId,
  subscriptionPublicId,
  onClose,
}: SubscriptionFormProps) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const isEditing = !!subscriptionPublicId;

  // Fetch workspace boards for dropdown
  const { data: boards } = api.board.all.useQuery(
    { workspacePublicId },
    { enabled: !!workspacePublicId },
  );

  // Fetch existing subscription if editing
  const { data: existingSubscription } =
    api.notification.subscription.byId.useQuery(
      { subscriptionPublicId: subscriptionPublicId ?? "" },
      { enabled: isEditing },
    );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      type: "digest",
      boardPublicId: "",
      listPublicId: "",
      labelPublicId: "",
      memberPublicId: "",
      dueDateWithinDays: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      notifyAtHour: "9",
      frequencyDays: "1",
    },
  });

  const subscriptionType = watch("type");
  const selectedBoardPublicId = watch("boardPublicId");

  // Fetch selected board details for lists/labels
  const { data: selectedBoard } = api.board.byId.useQuery(
    {
      boardPublicId: selectedBoardPublicId,
      members: [],
      labels: [],
      lists: [],
    },
    { enabled: !!selectedBoardPublicId },
  );

  // Populate form when editing
  useEffect(() => {
    if (existingSubscription) {
      reset({
        type: existingSubscription.type,
        boardPublicId: existingSubscription.board?.publicId ?? "",
        listPublicId: existingSubscription.list?.publicId ?? "",
        labelPublicId: existingSubscription.label?.publicId ?? "",
        memberPublicId: existingSubscription.member?.publicId ?? "",
        dueDateWithinDays:
          existingSubscription.dueDateWithinDays?.toString() ?? "",
        timezone: existingSubscription.timezone ?? "UTC",
        notifyAtHour: existingSubscription.notifyAtHour?.toString() ?? "9",
        frequencyDays: existingSubscription.frequencyDays?.toString() ?? "1",
      });
    }
  }, [existingSubscription, reset]);

  const createMutation = api.notification.subscription.create.useMutation({
    onSuccess: () => {
      void utils.notification.subscription.list.invalidate();
      showPopup({
        header: "Subscription created",
        message: "You will receive email notifications based on your settings.",
        icon: "success",
      });
      closeModal();
      onClose();
    },
    onError: (error) => {
      showPopup({
        header: "Failed to create subscription",
        message: error.message,
        icon: "error",
      });
    },
  });

  const updateMutation = api.notification.subscription.update.useMutation({
    onSuccess: () => {
      void utils.notification.subscription.list.invalidate();
      showPopup({
        header: "Subscription updated",
        message: "Your notification settings have been saved.",
        icon: "success",
      });
      closeModal();
      onClose();
    },
    onError: (error) => {
      showPopup({
        header: "Failed to update subscription",
        message: error.message,
        icon: "error",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const payload = {
      type: data.type,
      boardPublicId: data.boardPublicId || undefined,
      listPublicId: data.listPublicId || undefined,
      labelPublicId: data.labelPublicId || undefined,
      memberPublicId: data.memberPublicId || undefined,
      dueDateWithinDays: data.dueDateWithinDays
        ? parseInt(data.dueDateWithinDays, 10)
        : undefined,
      timezone: data.timezone,
      notifyAtHour: parseInt(data.notifyAtHour, 10),
      frequencyDays: parseInt(data.frequencyDays, 10),
    };

    if (isEditing && subscriptionPublicId) {
      updateMutation.mutate({
        subscriptionPublicId,
        ...payload,
      });
    } else {
      createMutation.mutate({
        workspacePublicId,
        ...payload,
      });
    }
  };

  const handleClose = () => {
    closeModal();
    onClose();
  };

  return (
    <div
      className="rounded-lg p-6"
      style={{ backgroundColor: "var(--kan-bg-default)" }}
    >
      <div className="mb-6 flex items-center justify-between">
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--kan-pages-text)" }}
        >
          {isEditing ? "Edit Subscription" : "New Notification Subscription"}
        </h2>
        <button
          onClick={handleClose}
          className="rounded p-1 hover:bg-light-200 dark:hover:bg-dark-200"
        >
          <HiOutlineXMark
            className="h-5 w-5"
            style={{ color: "var(--kan-pages-text)" }}
          />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Subscription Type */}
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: "var(--kan-pages-text)" }}
          >
            Notification Type
          </label>
          <select
            {...register("type")}
            className="w-full rounded-lg border border-light-300 bg-light-50 px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-50"
            style={{ color: "var(--kan-pages-text)" }}
          >
            <option value="digest">Digest Summary</option>
            <option value="changes">Immediate Changes</option>
          </select>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--kan-pages-text)", opacity: 0.6 }}
          >
            {subscriptionType === "digest"
              ? "Receive scheduled email summaries of matching cards"
              : "Get notified immediately when cards are changed"}
          </p>
        </div>

        {/* Board Filter */}
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: "var(--kan-pages-text)" }}
          >
            Filter by Board (optional)
          </label>
          <select
            {...register("boardPublicId")}
            className="w-full rounded-lg border border-light-300 bg-light-50 px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-50"
            style={{ color: "var(--kan-pages-text)" }}
          >
            <option value="">All boards</option>
            {boards?.map((board) => (
              <option key={board.publicId} value={board.publicId}>
                {board.name}
              </option>
            ))}
          </select>
        </div>

        {/* List Filter (only shown when board is selected) */}
        {selectedBoardPublicId && selectedBoard?.lists && (
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: "var(--kan-pages-text)" }}
            >
              Filter by List (optional)
            </label>
            <select
              {...register("listPublicId")}
              className="w-full rounded-lg border border-light-300 bg-light-50 px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-50"
              style={{ color: "var(--kan-pages-text)" }}
            >
              <option value="">All lists</option>
              {selectedBoard.lists.map((list) => (
                <option key={list.publicId} value={list.publicId}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Label Filter (shown when board is selected) */}
        {selectedBoardPublicId && selectedBoard?.labels && (
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: "var(--kan-pages-text)" }}
            >
              Filter by Label (optional)
            </label>
            <select
              {...register("labelPublicId")}
              className="w-full rounded-lg border border-light-300 bg-light-50 px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-50"
              style={{ color: "var(--kan-pages-text)" }}
            >
              <option value="">All labels</option>
              {selectedBoard.labels.map((label) => (
                <option key={label.publicId} value={label.publicId}>
                  {label.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Due Date Filter */}
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: "var(--kan-pages-text)" }}
          >
            Due Date Filter (optional)
          </label>
          <div className="flex items-center gap-2">
            <span
              className="text-sm"
              style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
            >
              Cards due within
            </span>
            <input
              type="number"
              {...register("dueDateWithinDays")}
              placeholder="7"
              min="1"
              max="365"
              className="w-20 rounded-lg border border-light-300 bg-light-50 px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-50"
              style={{ color: "var(--kan-pages-text)" }}
            />
            <span
              className="text-sm"
              style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
            >
              days
            </span>
          </div>
        </div>

        {/* Schedule Options (for digest only) */}
        {subscriptionType === "digest" && (
          <>
            <div className="border-t border-light-300 pt-4 dark:border-dark-300">
              <h3
                className="mb-3 text-sm font-medium"
                style={{ color: "var(--kan-pages-text)" }}
              >
                Schedule
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="mb-1 block text-sm"
                    style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
                  >
                    Timezone
                  </label>
                  <select
                    {...register("timezone")}
                    className="w-full rounded-lg border border-light-300 bg-light-50 px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-50"
                    style={{ color: "var(--kan-pages-text)" }}
                  >
                    {US_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="mb-1 block text-sm"
                    style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
                  >
                    Time of day
                  </label>
                  <select
                    {...register("notifyAtHour")}
                    className="w-full rounded-lg border border-light-300 bg-light-50 px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-50"
                    style={{ color: "var(--kan-pages-text)" }}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label
                  className="mb-1 block text-sm"
                  style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
                >
                  Frequency
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm"
                    style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
                  >
                    Every
                  </span>
                  <select
                    {...register("frequencyDays")}
                    className="w-24 rounded-lg border border-light-300 bg-light-50 px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-50"
                    style={{ color: "var(--kan-pages-text)" }}
                  >
                    <option value="1">1 day</option>
                    <option value="2">2 days</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 border-t border-light-300 pt-4 dark:border-dark-300">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              isSubmitting ||
              createMutation.isPending ||
              updateMutation.isPending
            }
          >
            {isEditing ? "Save Changes" : "Create Subscription"}
          </Button>
        </div>
      </form>
    </div>
  );
}

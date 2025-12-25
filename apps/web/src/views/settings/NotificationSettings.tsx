import { useState } from "react";
import {
  HiOutlineBell,
  HiOutlineEnvelope,
  HiOutlinePlus,
} from "react-icons/hi2";

import Button from "~/components/Button";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import SubscriptionCard from "./components/SubscriptionCard";
import SubscriptionForm from "./components/SubscriptionForm";

export default function NotificationSettings() {
  const { modalContentType, openModal, isOpen, closeModal } = useModal();
  const { showPopup } = usePopup();
  const [editingSubscription, setEditingSubscription] = useState<string | null>(
    null,
  );

  // Get current workspace from context or route
  const { data: workspaces } = api.workspace.all.useQuery();
  const currentWorkspace = workspaces?.[0];

  const { data: subscriptions, isLoading } =
    api.notification.subscription.list.useQuery(
      { workspacePublicId: currentWorkspace?.workspace.publicId ?? "" },
      { enabled: !!currentWorkspace?.workspace.publicId },
    );

  // SMTP test mutation
  const testSmtpMutation = api.notification.testSmtp.useMutation({
    onSuccess: (data) => {
      showPopup({
        header: "SMTP test successful",
        message: `Test email sent to ${data.email}`,
        icon: "success",
      });
    },
    onError: (error) => {
      showPopup({
        header: "SMTP test failed",
        message: error.message,
        icon: "error",
      });
    },
  });

  const handleAddSubscription = () => {
    setEditingSubscription(null);
    openModal("ADD_SUBSCRIPTION");
  };

  const handleEditSubscription = (publicId: string) => {
    setEditingSubscription(publicId);
    openModal("EDIT_SUBSCRIPTION");
  };

  const handleCloseForm = () => {
    setEditingSubscription(null);
    closeModal();
  };

  const handleTestSmtp = () => {
    testSmtpMutation.mutate();
  };

  if (isLoading) {
    return (
      <>
        <PageHead title={"Settings | Notifications"} />
        <div className="mb-8 border-t border-light-300 dark:border-dark-300" />
      </>
    );
  }

  return (
    <>
      <PageHead title={"Settings | Notifications"} />

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        <div className="mb-4 mt-8 flex items-center justify-between">
          <h2
            className="text-[14px] font-bold"
            style={{ color: "var(--kan-pages-text)" }}
          >
            {"Email Notifications"}
          </h2>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleTestSmtp}
              disabled={testSmtpMutation.isPending}
            >
              {testSmtpMutation.isPending ? "Sending..." : "Test SMTP"}
            </Button>
            <Button variant="secondary" onClick={handleAddSubscription}>
              {"Add Subscription"}
            </Button>
          </div>
        </div>

        <p
          className="mb-6 text-sm"
          style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
        >
          {
            "Subscribe to email notifications for cards in this workspace. You can receive digest summaries or immediate change alerts."
          }
        </p>

        {subscriptions && subscriptions.length > 0 ? (
          <div className="space-y-3">
            {subscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.publicId}
                subscription={subscription}
                onEdit={() => handleEditSubscription(subscription.publicId)}
              />
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-light-300 py-12 dark:border-dark-300"
            style={{ backgroundColor: "var(--kan-bg-subtle)" }}
          >
            <HiOutlineBell
              className="mb-3 h-12 w-12"
              style={{ color: "var(--kan-pages-text)", opacity: 0.3 }}
            />
            <p
              className="mb-4 text-sm"
              style={{ color: "var(--kan-pages-text)", opacity: 0.6 }}
            >
              {"No notification subscriptions yet"}
            </p>
            <Button variant="secondary" onClick={handleAddSubscription}>
              {"Create your first subscription"}
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Subscription Modal */}
      <Modal
        modalSize="md"
        isVisible={
          isOpen &&
          (modalContentType === "ADD_SUBSCRIPTION" ||
            modalContentType === "EDIT_SUBSCRIPTION")
        }
      >
        <SubscriptionForm
          workspacePublicId={currentWorkspace?.workspace.publicId ?? ""}
          subscriptionPublicId={editingSubscription}
          onClose={handleCloseForm}
        />
      </Modal>

      {/* Global modals */}
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
      >
        <NewWorkspaceForm />
      </Modal>
    </>
  );
}

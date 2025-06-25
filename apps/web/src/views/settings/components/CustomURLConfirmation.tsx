import { t } from "@lingui/core/macro";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";

export function CustomURLConfirmation({
  workspacePublicId,
}: {
  workspacePublicId: string;
}) {
  const { closeModal, entityId } = useModal();

  const handleUpgrade = async () => {
    try {
      const response = await fetch("/api/stripe/create_checkout_session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: entityId,
          workspacePublicId: workspacePublicId,
          cancelUrl: "/settings",
          successUrl: "/settings",
        }),
      });

      const { url } = (await response.json()) as { url: string };

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    }
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {t`Confirm URL change`}
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {t`Custom URLs are a premium feature. You'll be directed to upgrade your account.`}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button onClick={() => closeModal()} variant="secondary">
          {t`Cancel`}
        </Button>
        <Button onClick={handleUpgrade}>{t`Upgrade`}</Button>
      </div>
    </div>
  );
}

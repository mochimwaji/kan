import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useState } from "react";

import Button from "~/components/Button";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import ColorSettings from "./components/ColorSettings";
import { DeleteWorkspaceConfirmation } from "./components/DeleteWorkspaceConfirmation";
import UpdateWorkspaceDescriptionForm from "./components/UpdateWorkspaceDescriptionForm";
import UpdateWorkspaceNameForm from "./components/UpdateWorkspaceNameForm";
import UpdateWorkspaceUrlForm from "./components/UpdateWorkspaceUrlForm";

export default function WorkspaceSettings() {
  const { modalContentType, openModal, isOpen } = useModal();
  const { workspace } = useWorkspace();
  const router = useRouter();
  const { data } = api.user.getUser.useQuery();
  const [hasOpenedDeleteModal, setHasOpenedDeleteModal] = useState(false);

  return (
    <>
      <PageHead title={t`Settings | Workspace`} />

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        <h2
          className="mb-4 mt-8 text-[14px] font-bold"
          style={{ color: "var(--kan-pages-text)" }}
        >
          {t`Workspace name`}
        </h2>
        <UpdateWorkspaceNameForm
          workspacePublicId={workspace.publicId}
          workspaceName={workspace.name}
        />

        <h2
          className="mb-4 mt-8 text-[14px] font-bold"
          style={{ color: "var(--kan-pages-text)" }}
        >
          {t`Workspace URL`}
        </h2>
        <UpdateWorkspaceUrlForm
          workspacePublicId={workspace.publicId}
          workspaceUrl={workspace.slug ?? ""}
          workspacePlan={workspace.plan ?? "free"}
        />

        <h2
          className="mb-4 mt-8 text-[14px] font-bold"
          style={{ color: "var(--kan-pages-text)" }}
        >
          {t`Workspace description`}
        </h2>
        <UpdateWorkspaceDescriptionForm
          workspacePublicId={workspace.publicId}
          workspaceDescription={workspace.description ?? ""}
        />

        <div className="mb-8 border-t border-light-300 dark:border-dark-300">
          <h2
            className="mb-4 mt-8 text-[14px] font-bold"
            style={{ color: "var(--kan-pages-text)" }}
          >
            {t`Colors`}
          </h2>
          <p
            className="mb-4 text-sm"
            style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
          >
            {t`Customize the appearance of your workspace with preset themes or custom colors.`}
          </p>
          <ColorSettings />
        </div>

        <div className="border-t border-light-300 dark:border-dark-300">
          <h2
            className="mb-4 mt-8 text-[14px] font-bold"
            style={{ color: "var(--kan-pages-text)" }}
          >
            {t`Delete workspace`}
          </h2>
          <p
            className="mb-8 text-sm"
            style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
          >
            {t`Once you delete your workspace, there is no going back. This action cannot be undone.`}
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => openModal("DELETE_WORKSPACE")}
              disabled={workspace.role !== "admin"}
            >
              {t`Delete workspace`}
            </Button>
          </div>
        </div>
      </div>

      {/* Workspace-specific modals */}
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_WORKSPACE"}
      >
        <DeleteWorkspaceConfirmation />
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

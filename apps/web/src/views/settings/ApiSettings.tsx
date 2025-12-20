import Button from "~/components/Button";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import ApiKeyList from "./components/ApiKeyList";
import NewApiKeyModal from "./components/NewApiKeyModal";
import { RevokeApiKeyConfirmation } from "./components/RevokeApiKeyConfirmation";

export default function ApiSettings() {
  const { modalContentType, openModal, isOpen } = useModal();

  return (
    <>
      <PageHead title={"Settings | API"} />

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        <h2
          className="mb-4 mt-8 text-[14px] font-bold"
          style={{ color: "var(--kan-pages-text)" }}
        >
          {"API keys"}
        </h2>
        <p
          className="mb-8 text-sm"
          style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
        >
          {"View and manage your API keys."}
        </p>

        <div className="mb-4 flex items-center justify-between">
          <Button variant="primary" onClick={() => openModal("NEW_API_KEY")}>
            {"Create new key"}
          </Button>
        </div>

        <ApiKeyList />
      </div>

      {/* API-specific modals */}
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_API_KEY"}
      >
        <NewApiKeyModal />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "REVOKE_API_KEY"}
      >
        <RevokeApiKeyConfirmation />
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

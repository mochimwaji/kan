import { t } from "@lingui/core/macro";
import { HiArrowDownTray, HiOutlinePlusSmall } from "react-icons/hi2";

import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { BoardsList } from "./components/BoardsList";
import { ImportBoardsForm } from "./components/ImportBoardsForm";
import { NewBoardForm } from "./components/NewBoardForm";

export default function BoardsPage() {
  const { openModal, modalContentType } = useModal();
  const { workspace, hasLoaded } = useWorkspace();

  if (hasLoaded && !workspace.publicId) openModal("NEW_WORKSPACE");

  return (
    <>
      <PageHead title={t`Boards | ${workspace.name ?? "Workspace"}`} />
      <div className="h-full p-8">
        <div className="mb-8 flex w-full justify-between">
          <h1 className="font-bold tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
            {t`Boards`}
          </h1>
          <div className="flex">
            <button
              type="button"
              className="bg-dark-3000 mr-2 flex items-center gap-x-1.5 rounded-md border-[1px] border-light-600 px-3 py-2 text-sm text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-dark-600 dark:text-dark-1000"
              onClick={() => openModal("IMPORT_BOARDS")}
            >
              <div className="flex h-5 w-5 items-center">
                <HiArrowDownTray
                  className="-mr-0.5 h-4 w-4"
                  aria-hidden="true"
                />
              </div>
              {t`Import`}
            </button>
            <button
              type="button"
              className="flex items-center gap-x-1.5 rounded-md bg-light-1000 px-3 py-2 text-sm font-semibold text-light-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-dark-1000 dark:text-dark-50"
              onClick={() => openModal("NEW_BOARD")}
            >
              <div className="h-5 w-5 items-center">
                <HiOutlinePlusSmall
                  className="-mr-0.5 h-5 w-5"
                  aria-hidden="true"
                />
              </div>
              {t`New`}
            </button>
          </div>
        </div>

        <Modal>
          {modalContentType === "NEW_BOARD" && <NewBoardForm />}
          {modalContentType === "IMPORT_BOARDS" && <ImportBoardsForm />}
          {modalContentType === "NEW_WORKSPACE" && <NewWorkspaceForm />}
        </Modal>

        <div className="flex h-full flex-row">
          <BoardsList />
        </div>
      </div>
    </>
  );
}

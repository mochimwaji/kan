import { useEffect, useState } from "react";
import { HiOutlinePlusSmall } from "react-icons/hi2";

import Button from "~/components/Button";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { Tooltip } from "~/components/Tooltip";
import { useBoardTransition } from "~/providers/board-transition";
import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { BoardsList } from "./components/BoardsList";
import { NewBoardForm } from "./components/NewBoardForm";

export default function BoardsPage({ isTemplate }: { isTemplate?: boolean }) {
  const { openModal, modalContentType, isOpen } = useModal();
  const { workspace } = useWorkspace();
  const { animationPhase } = useBoardTransition();

  // Control content visibility during board transition animations
  const [showContent, setShowContent] = useState(
    () => animationPhase === "idle",
  );

  useEffect(() => {
    if (animationPhase === "idle") {
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [animationPhase]);

  const { tooltipContent: createModalShortcutTooltipContent } =
    useKeyboardShortcut({
      type: "PRESS",
      stroke: { key: "C" },
      action: () => openModal("NEW_BOARD"),
      description: `Create new ${isTemplate ? "template" : "board"}`,
      group: "ACTIONS",
    });

  return (
    <>
      <PageHead
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive fallback
        title={`${isTemplate ? "Templates" : "Boards"} | ${workspace.name ?? "Workspace"}`}
      />
      <div
        className="m-auto max-w-[1100px] p-6 px-5 transition-opacity duration-200 md:px-28 md:py-12"
        style={{ opacity: showContent ? 1 : 0 }}
      >
        <div className="relative z-10 mb-8 flex w-full items-center justify-between">
          <h1
            className="font-bold tracking-tight sm:text-[1.2rem]"
            style={{ color: "var(--kan-pages-text)" }}
          >
            {isTemplate ? "Templates" : "Boards"}
          </h1>
          <div className="flex gap-2">
            <Tooltip content={createModalShortcutTooltipContent}>
              <Button
                type="button"
                variant="primary"
                onClick={() => openModal("NEW_BOARD")}
                iconLeft={
                  <HiOutlinePlusSmall aria-hidden="true" className="h-4 w-4" />
                }
              >
                {"New"}
              </Button>
            </Tooltip>
          </div>
        </div>

        <>
          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_BOARD"}
          >
            <NewBoardForm isTemplate={!!isTemplate} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
          >
            <NewWorkspaceForm />
          </Modal>
        </>

        <div className="flex flex-row">
          <BoardsList isTemplate={!!isTemplate} />
        </div>
      </div>
    </>
  );
}

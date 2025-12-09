import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useCallback, useEffect, useRef } from "react";
import { HiOutlineRectangleStack } from "react-icons/hi2";

import Button from "~/components/Button";
import PatternedBackground from "~/components/PatternedBackground";
import { useBoardTransition } from "~/providers/board-transition";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export function BoardsList({ isTemplate }: { isTemplate?: boolean }) {
  const { workspace } = useWorkspace();
  const { openModal } = useModal();
  const router = useRouter();
  const {
    startTransition,
    animationPhase,
    boardId,
    startContract,
    fromBoardsPage,
  } = useBoardTransition();
  const boardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { data, isLoading } = api.board.all.useQuery(
    {
      workspacePublicId: workspace.publicId,
      type: isTemplate ? "template" : "regular",
    },
    { enabled: workspace.publicId ? true : false },
  );

  // Handle contract animation when returning to boards page
  useEffect(() => {
    if (animationPhase === "expanded" && boardId && fromBoardsPage) {
      // Find the board element and start contract animation
      const targetElement = boardRefs.current.get(boardId);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        startContract({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    }
  }, [animationPhase, boardId, fromBoardsPage, startContract]);

  const handleBoardClick = useCallback(
    (
      e: React.MouseEvent<HTMLAnchorElement>,
      board: { publicId: string; name: string },
    ) => {
      e.preventDefault();
      const element = boardRefs.current.get(board.publicId);
      if (element) {
        const rect = element.getBoundingClientRect();
        startTransition(
          {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
          board.publicId,
          board.name,
        );
        // Navigate after starting animation
        setTimeout(() => {
          router.push(
            `${isTemplate ? "templates" : "boards"}/${board.publicId}`,
          );
        }, 50);
      }
    },
    [startTransition, router, isTemplate],
  );

  const setBoardRef = useCallback(
    (publicId: string) => (el: HTMLDivElement | null) => {
      if (el) {
        boardRefs.current.set(publicId, el);
      } else {
        boardRefs.current.delete(publicId);
      }
    },
    [],
  );

  if (isLoading)
    return (
      <div className="3xl:grid-cols-4 grid h-fit w-full grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
        <div className="mr-5 flex h-[150px] w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
        <div className="mr-5 flex h-[150px] w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
        <div className="mr-5 flex h-[150px] w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
      </div>
    );

  if (data?.length === 0)
    return (
      <div className="z-10 flex h-full w-full flex-col items-center justify-center space-y-8 pb-[150px]">
        <div className="flex flex-col items-center">
          <HiOutlineRectangleStack className="h-10 w-10 text-light-800 dark:text-dark-800" />
          <p
            className="mb-2 mt-4 text-[14px] font-bold"
            style={{ color: "var(--kan-pages-text)" }}
          >
            {t`No ${isTemplate ? "templates" : "boards"}`}
          </p>
          <p
            className="text-[14px]"
            style={{
              color: "var(--kan-pages-text)",
              opacity: 0.7,
            }}
          >
            {t`Get started by creating a new ${isTemplate ? "template" : "board"}`}
          </p>
        </div>
        <Button onClick={() => openModal("NEW_BOARD")}>
          {t`Create new ${isTemplate ? "template" : "board"}`}
        </Button>
      </div>
    );

  return (
    <div className="3xl:grid-cols-4 grid h-fit w-full grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
      {data?.map((board) => (
        <a
          key={board.publicId}
          href={`${isTemplate ? "templates" : "boards"}/${board.publicId}`}
          onClick={(e) => handleBoardClick(e, board)}
          className="cursor-pointer"
        >
          <div
            ref={setBoardRef(board.publicId)}
            data-board-id={board.publicId}
            className="align-center relative mr-5 flex h-[150px] w-full items-center justify-center rounded-lg border border-dashed border-light-400 bg-light-50 shadow-sm transition-transform hover:scale-[1.02] hover:bg-light-200 dark:border-dark-600 dark:bg-dark-50 dark:hover:bg-dark-100"
          >
            <PatternedBackground />
            <p
              className={`z-10 px-4 text-[14px] font-bold transition-opacity duration-200 ${
                boardId === board.publicId &&
                (animationPhase === "expanded" ||
                  animationPhase === "expanding")
                  ? "opacity-0"
                  : "opacity-100"
              }`}
              style={{ color: "var(--kan-board-text)" }}
            >
              {board.name}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}

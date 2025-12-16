import type { DropResult } from "@hello-pangea/dnd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/router";
import { DragDropContext, Draggable } from "@hello-pangea/dnd";
import { t } from "@lingui/core/macro";
import { keepPreviousData } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  HiOutlinePlusSmall,
  HiOutlineRectangleStack,
  HiOutlineSquare3Stack3D,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import type { UpdateBoardInput } from "@kan/api/types";

import Button from "~/components/Button";
import { DeleteLabelConfirmation } from "~/components/DeleteLabelConfirmation";
import { LabelForm } from "~/components/LabelForm";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";
import { StrictModeDroppable as Droppable } from "~/components/StrictModeDroppable";
import { Tooltip } from "~/components/Tooltip";
import { useBoardTransition } from "~/providers/board-transition";
import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { convertDueDateFiltersToRanges } from "~/utils/dueDateFilters";
import { formatToArray } from "~/utils/helpers";
import BoardDropdown from "./components/BoardDropdown";
import Card from "./components/Card";
import { DeleteBoardConfirmation } from "./components/DeleteBoardConfirmation";
import { DeleteListConfirmation } from "./components/DeleteListConfirmation";
import Filters from "./components/Filters";
import List from "./components/List";
import { NewCardForm } from "./components/NewCardForm";
import { NewListForm } from "./components/NewListForm";
import { NewTemplateForm } from "./components/NewTemplateForm";
import UpdateBoardSlugButton from "./components/UpdateBoardSlugButton";
import { UpdateBoardSlugForm } from "./components/UpdateBoardSlugForm";
import VisibilityButton from "./components/VisibilityButton";

type PublicListId = string;

export default function BoardPage({ isTemplate }: { isTemplate?: boolean }) {
  const params = useParams() as { boardId: string | string[] } | null;
  const router = useRouter();
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const { openModal, modalContentType, entityId, isOpen } = useModal();
  const [selectedPublicListId, setSelectedPublicListId] =
    useState<PublicListId>("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Multi-select delete state
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(
    new Set(),
  );
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Quick delete toggle - skip confirmation when enabled
  const [quickDeleteEnabled, setQuickDeleteEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("quick-delete-enabled") === "true";
  });

  // Transition integration
  /* Transition integration */
  const { animationPhase, fromBoardsPage } = useBoardTransition();
  // Always start hidden to ensure fade-in on mount (fixes pop-in on return)
  // Logic updated: init false, effect sets true.
  // 'fromBoardsPage' logic remains relevant for initial expand animation check but
  // simpler to just fade in always for consistency or check phase.
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (fromBoardsPage) {
      if (animationPhase === "expanded" || animationPhase === "idle") {
        const timer = setTimeout(() => setShowContent(true), 50);
        return () => clearTimeout(timer);
      } else {
        setShowContent(false);
      }
    } else {
      // If direct load or return from card, fade in immediately
      const timer = requestAnimationFrame(() => setShowContent(true));
      // return () => cancelAnimationFrame(timer); // (Optional cleanup)
    }
  }, [animationPhase, fromBoardsPage]);

  const { tooltipContent: createListShortcutTooltipContent } =
    useKeyboardShortcut({
      type: "PRESS",
      stroke: { key: "C" },
      action: () => boardId && openNewListForm(boardId),
      description: t`Create new list`,
      group: "ACTIONS",
    });

  // Esc shortcut to return to boards page (only when no modal is open)
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "Escape" },
    action: () => {
      if (!isOpen) {
        router.push("/boards");
      }
    },
    description: t`Go to boards`,
    group: "BOARD_VIEW",
  });

  const boardId = params?.boardId
    ? Array.isArray(params.boardId)
      ? params.boardId[0]
      : params.boardId
    : null;

  const updateBoard = api.board.update.useMutation();

  const { register, handleSubmit, setValue } = useForm<UpdateBoardInput>({
    values: {
      boardPublicId: boardId ?? "",
      name: "",
    },
  });

  const onSubmit = (values: UpdateBoardInput) => {
    updateBoard.mutate({
      boardPublicId: values.boardPublicId,
      name: values.name,
    });
  };

  const semanticFilters = formatToArray(router.query.dueDate) as (
    | "overdue"
    | "today"
    | "tomorrow"
    | "next-week"
    | "next-month"
    | "no-due-date"
  )[];

  const queryParams: {
    boardPublicId: string;
    members: string[];
    labels: string[];
    lists: string[];
    dueDate: ReturnType<typeof convertDueDateFiltersToRanges>;
    type: "regular" | "template";
  } = {
    boardPublicId: boardId ?? "",
    members: formatToArray(router.query.members),
    labels: formatToArray(router.query.labels),
    lists: formatToArray(router.query.lists),
    dueDate: convertDueDateFiltersToRanges(semanticFilters),
    type: isTemplate ? "template" : "regular",
  };

  const {
    data: boardData,
    isSuccess,
    isLoading: isQueryLoading,
  } = api.board.byId.useQuery(queryParams, {
    enabled: !!boardId,
    placeholderData: keepPreviousData,
  });

  // Helper to toggle list collapse via custom event
  const toggleListCollapse = useCallback(
    (listIndex: number) => {
      const lists = boardData?.lists;
      if (!lists || listIndex >= lists.length) return;
      const list = lists[listIndex];
      if (!list) return;
      // Dispatch custom event for List component to handle with animation
      window.dispatchEvent(
        new CustomEvent("toggle-list-collapse", {
          detail: { listPublicId: list.publicId },
        }),
      );
    },
    [boardData?.lists],
  );

  // 1-9 shortcuts to toggle list collapse
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "1" },
    action: () => toggleListCollapse(0),
    description: t`Toggle list 1`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "2" },
    action: () => toggleListCollapse(1),
    description: t`Toggle list 2`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "3" },
    action: () => toggleListCollapse(2),
    description: t`Toggle list 3`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "4" },
    action: () => toggleListCollapse(3),
    description: t`Toggle list 4`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "5" },
    action: () => toggleListCollapse(4),
    description: t`Toggle list 5`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "6" },
    action: () => toggleListCollapse(5),
    description: t`Toggle list 6`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "7" },
    action: () => toggleListCollapse(6),
    description: t`Toggle list 7`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "8" },
    action: () => toggleListCollapse(7),
    description: t`Toggle list 8`,
    group: "BOARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "9" },
    action: () => toggleListCollapse(8),
    description: t`Toggle list 9`,
    group: "BOARD_VIEW",
  });

  const refetchBoard = async () => {
    if (boardId) await utils.board.byId.refetch({ boardPublicId: boardId });
  };

  useEffect(() => {
    if (boardId) {
      setIsInitialLoading(false);
    }
  }, [boardId]);

  const isLoading = isInitialLoading || isQueryLoading;

  /* Transition logic */
  // 'showContent' controls opacity: 1 (visible) or 0 (hidden)
  // 'fromBoardsPage' check is already in place to handle entry animation
  // We add 'isExiting' for exit animation
  const [isExiting, setIsExiting] = useState(false);

  const handleCardClick = (e: React.MouseEvent, cardPublicId: string) => {
    if (cardPublicId.startsWith("PLACEHOLDER")) {
      e.preventDefault();
      return;
    }

    // Start exit animation
    e.preventDefault();
    setIsExiting(true);

    // Navigate after animation
    setTimeout(() => {
      const href = isTemplate
        ? `/templates/${boardId}/cards/${cardPublicId}`
        : `/cards/${cardPublicId}`;
      router.push(href);
    }, 300); // 300ms match transition duration
  };

  const updateListMutation = api.list.update.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();

      const currentState = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const updatedLists = Array.from(oldBoard.lists);

        const sourceList = updatedLists.find(
          (list) => list.publicId === args.listPublicId,
        );

        const currentIndex = sourceList?.index;

        if (currentIndex === undefined) return oldBoard;

        const removedList = updatedLists.splice(currentIndex, 1)[0];

        if (removedList && args.index !== undefined) {
          updatedLists.splice(args.index, 0, removedList);

          // Update index property on each list to match new array positions
          const listsWithUpdatedIndexes = updatedLists.map((list, idx) => ({
            ...list,
            index: idx,
          }));

          return {
            ...oldBoard,
            lists: listsWithUpdatedIndexes,
          };
        }
      });

      return { previousState: currentState };
    },
    onError: (_error, _newList, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to update list`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async (_data, error) => {
      // Only invalidate on error to restore correct state
      // On success, the optimistic update is already in place and matches server data
      if (error) {
        await utils.board.byId.invalidate(queryParams);
      }
    },
  });

  const updateCardMutation = api.card.update.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();

      const currentState = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const updatedLists = Array.from(oldBoard.lists);

        const sourceList = updatedLists.find((list) =>
          list.cards.some((card) => card.publicId === args.cardPublicId),
        );
        const destinationList = updatedLists.find(
          (list) => list.publicId === args.listPublicId,
        );

        const cardToMove = sourceList?.cards.find(
          (card) => card.publicId === args.cardPublicId,
        );

        if (!cardToMove) return oldBoard;

        const removedCard = sourceList?.cards.splice(cardToMove.index, 1)[0];

        if (
          sourceList &&
          destinationList &&
          removedCard &&
          args.index !== undefined
        ) {
          destinationList.cards.splice(args.index, 0, removedCard);

          // Update index property on cards in affected lists
          const listsWithUpdatedCardIndexes = updatedLists.map((list) => ({
            ...list,
            cards: list.cards.map((card, idx) => ({
              ...card,
              index: idx,
            })),
          }));

          return {
            ...oldBoard,
            lists: listsWithUpdatedCardIndexes,
          };
        }
      });

      return { previousState: currentState };
    },
    onError: (_error, _newList, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async (_data, error) => {
      // Only invalidate on error to restore correct state
      // On success, the optimistic update is already in place and matches server data
      if (error) {
        await utils.board.byId.invalidate(queryParams);
      }
    },
  });

  useEffect(() => {
    if (isSuccess && boardData) {
      setValue("name", boardData.name || "");
    }
  }, [isSuccess, boardData, setValue]);

  const openNewListForm = (publicBoardId: string) => {
    openModal("NEW_LIST");
    setSelectedPublicListId(publicBoardId);
  };

  // Multi-select toggle handlers
  const toggleCardSelection = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const toggleListSelection = useCallback((listId: string) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCardIds(new Set());
    setSelectedListIds(new Set());
  }, []);

  const hasSelection = selectedCardIds.size > 0 || selectedListIds.size > 0;

  // Toggle quick delete setting
  const toggleQuickDelete = useCallback(() => {
    setQuickDeleteEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("quick-delete-enabled", String(newValue));
      return newValue;
    });
  }, []);

  // Delete mutations for bulk delete with optimistic updates
  const deleteCardMutation = api.card.delete.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();
      const currentState = utils.board.byId.getData(queryParams);
      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;
        const updatedLists = oldBoard.lists.map((list) => ({
          ...list,
          cards: list.cards.filter(
            (card) => card.publicId !== args.cardPublicId,
          ),
        }));
        return { ...oldBoard, lists: updatedLists };
      });
      return { previousState: currentState };
    },
    onError: (_error, _args, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to delete card`,
        message: t`Please try again later.`,
        icon: "error",
      });
    },
  });

  const deleteListMutation = api.list.delete.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();
      const currentState = utils.board.byId.getData(queryParams);
      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;
        const updatedLists = oldBoard.lists.filter(
          (list) => list.publicId !== args.listPublicId,
        );
        return { ...oldBoard, lists: updatedLists };
      });
      return { previousState: currentState };
    },
    onError: (_error, _args, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to delete list`,
        message: t`Please try again later.`,
        icon: "error",
      });
    },
  });

  // Bulk delete handler with fade animation
  const handleBulkDelete = useCallback(async () => {
    // Combine all IDs for fade animation
    const allIds = new Set([...selectedCardIds, ...selectedListIds]);
    const cardIdsToDelete = [...selectedCardIds];
    const listIdsToDelete = [...selectedListIds];

    setDeletingIds(allIds);
    setShowDeleteConfirm(false);
    clearSelection(); // Clear selection immediately so checkboxes reset

    // Wait for fade animation to complete
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Delete all selected cards (optimistic updates handle UI removal)
    for (const cardId of cardIdsToDelete) {
      deleteCardMutation.mutate({ cardPublicId: cardId });
    }

    // Delete all selected lists (optimistic updates handle UI removal)
    for (const listId of listIdsToDelete) {
      deleteListMutation.mutate({ listPublicId: listId });
    }

    // Clear deleting state after a brief delay
    setTimeout(() => setDeletingIds(new Set()), 100);
  }, [
    selectedCardIds,
    selectedListIds,
    deleteCardMutation,
    deleteListMutation,
    queryParams,
    utils,
    clearSelection,
  ]);

  // Delete handler - respects quick delete toggle
  const handleDelete = useCallback(() => {
    if (quickDeleteEnabled) {
      handleBulkDelete();
    } else {
      setShowDeleteConfirm(true);
    }
  }, [quickDeleteEnabled, handleBulkDelete]);

  // Del key shortcut to delete selected items
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "Delete" },
    action: () => {
      if (hasSelection) {
        handleDelete();
      }
    },
    description: t`Delete selected items`,
    group: "BOARD_VIEW",
  });
  const onDragEnd = ({
    source: _source,
    destination,
    draggableId,
    type,
  }: DropResult): void => {
    if (!destination) {
      return;
    }

    if (type === "LIST") {
      updateListMutation.mutate({
        listPublicId: draggableId,
        index: destination.index,
      });
    }

    if (type === "CARD") {
      updateCardMutation.mutate({
        cardPublicId: draggableId,

        listPublicId: destination.droppableId,
        index: destination.index,
      });
    }
  };

  const renderModalContent = () => {
    return (
      <>
        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "DELETE_BOARD"}
        >
          <DeleteBoardConfirmation
            isTemplate={!!isTemplate}
            boardPublicId={boardId ?? ""}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "DELETE_LIST"}
        >
          <DeleteListConfirmation
            listPublicId={selectedPublicListId}
            queryParams={queryParams}
          />
        </Modal>

        <Modal
          modalSize="md"
          isVisible={isOpen && modalContentType === "NEW_CARD"}
        >
          <NewCardForm
            isTemplate={!!isTemplate}
            boardPublicId={boardId ?? ""}
            listPublicId={selectedPublicListId}
            queryParams={queryParams}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "NEW_LIST"}
        >
          <NewListForm
            boardPublicId={boardId ?? ""}
            queryParams={queryParams}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
        >
          <NewWorkspaceForm />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "NEW_LABEL"}
        >
          <LabelForm boardPublicId={boardId ?? ""} refetch={refetchBoard} />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "EDIT_LABEL"}
        >
          <LabelForm
            boardPublicId={boardId ?? ""}
            refetch={refetchBoard}
            isEdit
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "DELETE_LABEL"}
        >
          <DeleteLabelConfirmation
            refetch={refetchBoard}
            labelPublicId={entityId}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "UPDATE_BOARD_SLUG"}
        >
          <UpdateBoardSlugForm
            boardPublicId={boardId ?? ""}
            workspaceSlug={workspace.slug ?? ""}
            boardSlug={boardData?.slug ?? ""}
            queryParams={queryParams}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "CREATE_TEMPLATE"}
        >
          <NewTemplateForm
            workspacePublicId={workspace.publicId ?? ""}
            sourceBoardPublicId={boardId ?? ""}
            sourceBoardName={boardData?.name ?? ""}
          />
        </Modal>
      </>
    );
  };

  return (
    <>
      <PageHead
        title={`${boardData?.name ?? (isTemplate ? t`Board` : t`Template`)} | ${workspace.name ?? t`Workspace`}`}
      />
      <div className="relative flex h-full flex-col">
        {/* Background appears instantly when animation completes */}
        <div
          style={{
            opacity:
              animationPhase === "expanded" ||
              animationPhase === "idle" ||
              !fromBoardsPage
                ? 1
                : 0,
            transition: "opacity 50ms ease-in-out",
          }}
        >
          <PatternedBackground />
        </div>
        {/* Content fades in after background */}
        <div
          className="absolute inset-0 z-10 flex flex-col"
          style={{
            opacity: showContent && !isExiting ? 1 : 0,
            transition: "opacity 300ms ease-in-out",
          }}
        >
          <div className="z-10 flex w-full flex-col justify-between p-6 md:flex-row md:p-8">
            {isLoading && !boardData && (
              <div className="flex space-x-2">
                <div className="h-[2.3rem] w-[150px] animate-pulse rounded-[5px] bg-light-200 dark:bg-dark-100" />
              </div>
            )}
            {boardData && (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="order-2 focus-visible:outline-none md:order-1"
              >
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  onBlur={handleSubmit(onSubmit)}
                  className="block border-0 bg-transparent p-0 py-0 font-bold leading-[2.3rem] tracking-tight focus:ring-0 focus-visible:outline-none sm:text-[1.2rem]"
                  style={{ color: "var(--kan-board-text)" }}
                />
              </form>
            )}
            {!boardData && !isLoading && (
              <p
                className="order-2 block p-0 py-0 font-bold leading-[2.3rem] tracking-tight sm:text-[1.2rem] md:order-1"
                style={{ color: "var(--kan-board-text)" }}
              >
                {t`${isTemplate ? "Template" : "Board"} not found`}
              </p>
            )}
            <div className="order-1 mb-4 flex items-center justify-end space-x-2 md:order-2 md:mb-0">
              {isTemplate && (
                <div className="inline-flex cursor-default items-center justify-center whitespace-nowrap rounded-md border-[1px] border-light-300 bg-light-50 px-3 py-2 text-sm font-semibold text-light-950 shadow-sm dark:border-dark-300 dark:bg-dark-50 dark:text-dark-950">
                  <span className="mr-2">
                    <HiOutlineRectangleStack />
                  </span>
                  {t`Template`}
                </div>
              )}
              {!isTemplate && (
                <>
                  <UpdateBoardSlugButton
                    handleOnClick={() => openModal("UPDATE_BOARD_SLUG")}
                    isLoading={isLoading}
                    workspaceSlug={workspace.slug ?? ""}
                    boardSlug={boardData?.slug ?? ""}
                  />
                  <VisibilityButton
                    visibility={boardData?.visibility ?? "private"}
                    boardPublicId={boardId ?? ""}
                    boardSlug={boardData?.slug ?? ""}
                    queryParams={queryParams}
                    isLoading={!boardData}
                    isAdmin={workspace.role === "admin"}
                  />
                  {boardData && (
                    <Filters
                      labels={boardData.labels}
                      members={boardData.workspace.members.filter(
                        (member) => member.user !== null,
                      )}
                      lists={boardData.allLists}
                      position="left"
                      isLoading={!boardData}
                    />
                  )}
                </>
              )}
              <Tooltip content={createListShortcutTooltipContent}>
                <Button
                  iconLeft={
                    <HiOutlinePlusSmall
                      className="-mr-0.5 h-5 w-5"
                      aria-hidden="true"
                    />
                  }
                  onClick={() => {
                    if (boardId) openNewListForm(boardId);
                  }}
                  disabled={!boardData}
                >
                  {t`New list`}
                </Button>
              </Tooltip>
              <BoardDropdown
                isTemplate={!!isTemplate}
                isLoading={!boardData}
                boardPublicId={boardId ?? ""}
                workspacePublicId={workspace.publicId}
                quickDeleteEnabled={quickDeleteEnabled}
                onToggleQuickDelete={toggleQuickDelete}
              />
            </div>
          </div>

          <div className="scrollbar-w-none scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-h-[8px] z-0 flex-1 overflow-y-hidden overflow-x-scroll overscroll-contain scrollbar scrollbar-track-light-200 scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-300">
            {isLoading ? (
              <div className="ml-[2rem] flex">
                <div className="0 mr-5 h-[500px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
                <div className="0 mr-5 h-[275px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
                <div className="0 mr-5 h-[375px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
              </div>
            ) : boardData ? (
              <>
                {boardData.lists.length === 0 ? (
                  <div className="z-10 flex h-full w-full flex-col items-center justify-center space-y-8 pb-[150px]">
                    <div className="flex flex-col items-center">
                      <HiOutlineSquare3Stack3D className="h-10 w-10 text-light-800 dark:text-dark-800" />
                      <p className="mb-2 mt-4 text-[14px] font-bold text-light-1000 dark:text-dark-950">
                        {t`No lists`}
                      </p>
                      <p className="text-[14px] text-light-900 dark:text-dark-900">
                        {t`Get started by creating a new list`}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        if (boardId) openNewListForm(boardId);
                      }}
                    >
                      {t`Create new list`}
                    </Button>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable
                      droppableId="all-lists"
                      direction="horizontal"
                      type="LIST"
                    >
                      {(provided) => (
                        <div
                          className="flex"
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          <div className="min-w-[2rem]" />
                          {boardData.lists.map((list, index) => (
                            <List
                              index={index}
                              key={list.publicId}
                              list={list}
                              cardCount={list.cards.length}
                              isSelected={selectedListIds.has(list.publicId)}
                              isDeleting={deletingIds.has(list.publicId)}
                              onToggleSelect={() =>
                                toggleListSelection(list.publicId)
                              }
                              setSelectedPublicListId={(publicListId) =>
                                setSelectedPublicListId(publicListId)
                              }
                            >
                              <Droppable
                                droppableId={`${list.publicId}`}
                                type="CARD"
                              >
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-w-[8px] z-10 h-full max-h-[calc(100vh-225px)] min-h-[2rem] overflow-y-auto pr-1 scrollbar dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-600"
                                  >
                                    {list.cards.map((card, index) => (
                                      <Draggable
                                        key={card.publicId}
                                        draggableId={card.publicId}
                                        index={index}
                                      >
                                        {(provided) => (
                                          <Link
                                            onClick={(e) =>
                                              handleCardClick(e, card.publicId)
                                            }
                                            key={card.publicId}
                                            href={
                                              isTemplate
                                                ? `/templates/${boardId}/cards/${card.publicId}`
                                                : `/cards/${card.publicId}`
                                            }
                                            className={`mb-2 flex !cursor-pointer flex-col ${
                                              card.publicId.startsWith(
                                                "PLACEHOLDER",
                                              )
                                                ? "pointer-events-none"
                                                : ""
                                            }`}
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                          >
                                            <Card
                                              title={card.title}
                                              labels={card.labels}
                                              members={card.members}
                                              checklists={card.checklists ?? []}
                                              description={
                                                card.description ?? null
                                              }
                                              comments={card.comments ?? []}
                                              attachments={card.attachments}
                                              dueDate={card.dueDate ?? null}
                                              listColor={list.color}
                                              isSelected={selectedCardIds.has(
                                                card.publicId,
                                              )}
                                              isDeleting={deletingIds.has(
                                                card.publicId,
                                              )}
                                              onToggleSelect={() =>
                                                toggleCardSelection(
                                                  card.publicId,
                                                )
                                              }
                                            />
                                          </Link>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </List>
                          ))}
                          <div className="min-w-[0.75rem]" />
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </>
            ) : null}
          </div>
        </div>
        {renderModalContent()}

        {/* Floating delete button - appears when items are selected */}
        {hasSelection && (
          <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 animate-fade-in">
            <div className="flex items-center gap-3 rounded-lg bg-red-600 px-4 py-3 text-white shadow-lg">
              <span className="text-sm font-medium">
                {selectedCardIds.size + selectedListIds.size} selected
              </span>
              {/* Quick delete toggle */}
              <button
                onClick={toggleQuickDelete}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  quickDeleteEnabled
                    ? "bg-white/30 hover:bg-white/40"
                    : "bg-white/10 hover:bg-white/20"
                }`}
                title={
                  quickDeleteEnabled
                    ? t`Quick delete ON - no confirmation`
                    : t`Quick delete OFF - shows confirmation`
                }
              >
                {quickDeleteEnabled ? "⚡" : "🛡"}
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/30"
              >
                {t`Delete`} {quickDeleteEnabled && "⚡"}
              </button>
              <button
                onClick={clearSelection}
                className="rounded-md px-2 py-1 text-sm transition-colors hover:bg-white/10"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Bulk delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
              className="mx-4 w-full max-w-sm animate-fade-in rounded-lg p-6 shadow-xl"
              style={{ backgroundColor: "var(--kan-menu-bg)" }}
            >
              <h3
                className="mb-4 text-lg font-semibold"
                style={{ color: "var(--kan-menu-text)" }}
              >
                {t`Delete selected items?`}
              </h3>
              <p
                className="mb-6 text-sm"
                style={{ color: "var(--kan-menu-text)", opacity: 0.8 }}
              >
                {t`This will permanently delete ${selectedCardIds.size} card(s) and ${selectedListIds.size} list(s). This action cannot be undone.`}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-md border px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    borderColor: "var(--kan-menu-border)",
                    color: "var(--kan-menu-text)",
                  }}
                >
                  {t`Cancel`}
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  {t`Delete`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

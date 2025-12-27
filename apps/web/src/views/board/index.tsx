import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/router";
import { DragDropContext, Draggable } from "@hello-pangea/dnd";
import { keepPreviousData } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  HiBars4,
  HiOutlineCalendarDays,
  HiOutlinePlusSmall,
  HiOutlineRectangleStack,
  HiOutlineSquare3Stack3D,
} from "react-icons/hi2";

import type { UpdateBoardInput } from "@kan/api/types";

import Button from "~/components/Button";
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
import { BoardModals } from "./components/BoardModals";
import CalendarView from "./components/CalendarView";
import Card from "./components/Card";
import Filters from "./components/Filters";
import List from "./components/List";
import MultiDragBadge from "./components/MultiDragBadge";
import UpdateBoardSlugButton from "./components/UpdateBoardSlugButton";
import VisibilityButton from "./components/VisibilityButton";
import {
  useBoardKeyboardShortcuts,
  useMultiSelect,
  useVisualLists,
} from "./hooks";
import { useBoardDragAndDrop } from "./hooks/useBoardDragAndDrop";
import { useBoardMutations } from "./hooks/useBoardMutations";

// View mode type
type ViewMode = "kanban" | "calendar";
type PublicListId = string;

export default function BoardPage({ isTemplate }: { isTemplate?: boolean }) {
  // ============================================================================
  // STATE & CONTEXT HOOKS
  // ============================================================================
  const params = useParams() as { boardId: string | string[] } | null;
  const router = useRouter();
  const utils = api.useUtils();
  const { showPopup: _showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const {
    openModal,
    closeModal: _closeModal,
    closeModals: _closeModals,
    modalContentType: _modalContentType,
    entityId: _entityId,
    isOpen,
  } = useModal();
  const [selectedPublicListId, setSelectedPublicListId] =
    useState<PublicListId>("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [draggingCardId, _setDraggingCardId] = useState<string | null>(null);
  const [draggingOverListId, setDraggingOverListId] = useState<string | null>(
    null,
  );

  // Track mobile viewport for responsive DnD direction
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Quick delete toggle - skip confirmation when enabled
  const [quickDeleteEnabled, setQuickDeleteEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("quick-delete-enabled") === "true";
  });

  const toggleQuickDelete = useCallback(() => {
    setQuickDeleteEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("quick-delete-enabled", String(newValue));
      return newValue;
    });
  }, []);

  // View mode state with localStorage persistence (per-board)
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

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
      // If direct load or return from card, fade in after Lists have mounted/hydrated
      // Small delay ensures localStorage state is read before paint
      const timer = setTimeout(() => setShowContent(true), 16);
      return () => clearTimeout(timer);
    }
  }, [animationPhase, fromBoardsPage]);

  const { tooltipContent: createListShortcutTooltipContent } =
    useKeyboardShortcut({
      type: "PRESS",
      stroke: { key: "C" },
      action: () => boardId && openNewListForm(boardId),
      description: "Create new list",
      group: "ACTIONS",
    });

  // Esc shortcut to return to boards page (only when no modal is open)
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "Escape" },
    action: () => {
      if (!isOpen) {
        void router.push("/boards");
      }
    },
    description: "Go to boards",
    group: "BOARD_VIEW",
  });

  const boardId = params?.boardId
    ? Array.isArray(params.boardId)
      ? params.boardId[0]
      : params.boardId
    : null;

  // Load view mode from localStorage when boardId changes
  useEffect(() => {
    if (boardId && typeof window !== "undefined") {
      const stored = localStorage.getItem(`board-view-mode-${boardId}`);
      if (stored === "calendar") {
        setViewMode("calendar");
      } else {
        setViewMode("kanban");
      }
    }
  }, [boardId]);

  // Toggle view mode handler
  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === "kanban" ? "calendar" : "kanban";
      if (boardId && typeof window !== "undefined") {
        localStorage.setItem(`board-view-mode-${boardId}`, next);
      }
      return next;
    });
  }, [boardId]);

  // V shortcut to toggle between Kanban and Calendar view
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "V" },
    action: toggleViewMode,
    description: "Toggle view mode",
    group: "BOARD_VIEW",
  });

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

  // Two-Phase Visual State: Extracted to useVisualLists hook
  // This prevents "flash" after drop where items briefly appear at old position
  const {
    listsToRender,
    isDragging: _isDragging,
    setIsDragging,
    reorderLists: _reorderLists,

    reorderCards: _reorderCards,

    updateCardsInVisualState: _updateCardsInVisualState,
    setVisualLists,
  } = useVisualLists(boardData);

  const {
    selectedCardIds,
    setSelectedCardIds,
    selectedListIds,
    toggleCardSelection,
    toggleListSelection,
    clearSelection,
    getOrderedSelectedCards,
    hasSelection,
    lastSelectedCardId,
    setLastSelectedCardId,
  } = useMultiSelect(listsToRender);

  // Register 1-9 keyboard shortcuts for toggling list collapse
  useBoardKeyboardShortcuts(boardData?.lists);

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

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // Click card to select (shift+click for range selection)
  const handleCardClick = (e: React.MouseEvent, cardPublicId: string) => {
    if (cardPublicId.startsWith("PLACEHOLDER")) {
      e.preventDefault();
      return;
    }
    e.preventDefault();

    if (e.shiftKey && lastSelectedCardId) {
      // Shift+click: select range
      selectCardRange(lastSelectedCardId, cardPublicId);
    } else {
      // Normal click: toggle selection
      toggleCardSelection(cardPublicId);
      setLastSelectedCardId(cardPublicId);
    }
  };

  // Range selection helper for shift+click
  const selectCardRange = useCallback(
    (fromId: string, toId: string) => {
      const allCardIds = listsToRender.flatMap((list) =>
        list.cards.map((c) => c.publicId),
      );
      const fromIdx = allCardIds.indexOf(fromId);
      const toIdx = allCardIds.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return;

      const [start, end] =
        fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      setSelectedCardIds(new Set(allCardIds.slice(start, end + 1)));
      setLastSelectedCardId(toId);
    },
    [listsToRender, setSelectedCardIds, setLastSelectedCardId],
  );

  // Expand card (navigate to card detail)
  const handleExpandCard = useCallback(
    (cardPublicId: string) => {
      setIsExiting(true);
      setTimeout(() => {
        const href = isTemplate
          ? `/templates/${boardId}/cards/${cardPublicId}`
          : `/cards/${cardPublicId}`;
        void router.push(href);
      }, 300);
    },
    [isTemplate, boardId, router],
  );

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const mutations = useBoardMutations(queryParams);

  // Fade out when board is being deleted
  useEffect(() => {
    if (mutations.deleteBoardMutation.isPending) {
      setIsExiting(true);
    }
  }, [mutations.deleteBoardMutation.isPending]);

  // Delete selected items (cards and lists)
  const handleBulkDelete = useCallback(() => {
    // Add to deletingIds for fade-out animation
    setDeletingIds(new Set([...selectedCardIds, ...selectedListIds]));

    // Delay mutations until animation completes (400ms = CSS animation duration)
    setTimeout(() => {
      // Delete cards
      selectedCardIds.forEach((cardPublicId) => {
        mutations.deleteCardMutation.mutate({ cardPublicId });
      });
      // Delete lists
      selectedListIds.forEach((listPublicId) => {
        mutations.deleteListMutation.mutate({ listPublicId });
      });

      // Clear selections and close modal
      clearSelection();
      setShowDeleteConfirm(false);
      setDeletingIds(new Set());
    }, 400);
  }, [
    selectedCardIds,
    selectedListIds,
    mutations.deleteCardMutation,
    mutations.deleteListMutation,
    clearSelection,
  ]);

  const handleDelete = useCallback(() => {
    if (quickDeleteEnabled) {
      handleBulkDelete();
    } else {
      setShowDeleteConfirm(true);
    }
  }, [quickDeleteEnabled, handleBulkDelete]);

  // Delete key shortcut - delete selected items
  const deleteAction = useCallback(() => {
    if (hasSelection) handleDelete();
  }, [hasSelection, handleDelete]);

  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "Delete" },
    action: deleteAction,
    description: "Delete selected",
    group: "BOARD_VIEW",
  });

  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "Backspace" },
    action: deleteAction,
    description: "Delete selected",
    group: "BOARD_VIEW",
  });

  const { onDragStart, onDragEnd } = useBoardDragAndDrop({
    listsToRender,
    selectedCardIds,
    setSelectedCardIds,
    setLastSelectedCardId,
    getOrderedSelectedCards,
    setVisualLists,
    setIsDragging,
    mutations: {
      bulkMoveMutation: mutations.bulkMoveMutation,
      updateCardMutation: mutations.updateCardMutation,
      bulkUpdateCardMutation: mutations.bulkUpdateCardMutation,
      updateListMutation: mutations.updateListMutation,
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

  // ============================================================================
  // MODAL CONTENT
  // ============================================================================

  // ============================================================================
  // RENDER MODALS
  // ============================================================================

  const renderModals = () => (
    <BoardModals
      isTemplate={!!isTemplate}
      boardId={boardId ?? null}
      boardData={boardData}
      workspace={workspace}
      selectedPublicListId={selectedPublicListId}
      queryParams={queryParams}
      refetchBoard={refetchBoard}
      mutations={mutations}
    />
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <PageHead
        title={`${boardData?.name ?? (isTemplate ? "Board" : "Template")} | ${workspace.name}`}
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
                {`${isTemplate ? "Template" : "Board"} not found`}
              </p>
            )}

            {/* Mobile toolbar - fixed bar below header */}
            <div className="fixed inset-x-0 top-12 z-30 flex items-center justify-center gap-2 border-b border-light-300 bg-light-50 px-4 py-2 dark:border-dark-300 dark:bg-dark-50 md:hidden">
              {!isTemplate && boardData && (
                <>
                  <VisibilityButton
                    visibility={boardData.visibility ?? "private"}
                    boardPublicId={boardId ?? ""}
                    boardSlug={boardData.slug ?? ""}
                    queryParams={queryParams}
                    isLoading={!boardData}
                    isAdmin={workspace.role === "admin"}
                  />
                  <Filters
                    labels={boardData.labels}
                    members={boardData.workspace.members.filter(
                      (member) => member.user !== null,
                    )}
                    lists={boardData.allLists}
                    position="left"
                    isLoading={!boardData}
                  />
                </>
              )}
              {boardData && (
                <button
                  onClick={toggleViewMode}
                  className="inline-flex items-center justify-center rounded-md border border-light-300 p-2 text-sm font-semibold shadow-sm transition-colors hover:opacity-80 dark:border-dark-300"
                  style={{ backgroundColor: "var(--kan-button-bg)" }}
                  aria-label={
                    viewMode === "kanban"
                      ? "Switch to Calendar view"
                      : "Switch to Kanban view"
                  }
                >
                  {viewMode === "kanban" ? (
                    <HiOutlineCalendarDays
                      className="h-5 w-5"
                      style={{ color: "var(--kan-button-text)" }}
                    />
                  ) : (
                    <HiBars4
                      className="h-5 w-5"
                      style={{ color: "var(--kan-button-text)" }}
                    />
                  )}
                </button>
              )}
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
                {"New list"}
              </Button>
              <BoardDropdown
                isTemplate={!!isTemplate}
                isLoading={!boardData}
                boardPublicId={boardId ?? ""}
                workspacePublicId={workspace.publicId}
                quickDeleteEnabled={quickDeleteEnabled}
                onToggleQuickDelete={toggleQuickDelete}
              />
            </div>

            {/* Desktop toolbar - hidden on mobile */}
            <div className="order-1 mb-4 hidden items-center justify-end space-x-2 md:order-2 md:mb-0 md:flex">
              {isTemplate && (
                <div className="inline-flex cursor-default items-center justify-center whitespace-nowrap rounded-md border-[1px] border-light-300 bg-light-50 px-3 py-2 text-sm font-semibold text-light-950 shadow-sm dark:border-dark-300 dark:bg-dark-50 dark:text-dark-950">
                  <span className="mr-2">
                    <HiOutlineRectangleStack />
                  </span>
                  {"Template"}
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
              {/* View toggle button */}
              {boardData && (
                <Tooltip
                  content={
                    viewMode === "kanban"
                      ? "Switch to Calendar view (V)"
                      : "Switch to Kanban view (V)"
                  }
                >
                  <button
                    onClick={toggleViewMode}
                    className="inline-flex items-center justify-center rounded-md border border-light-300 p-2 text-sm font-semibold shadow-sm transition-colors hover:opacity-80 dark:border-dark-300"
                    style={{ backgroundColor: "var(--kan-button-bg)" }}
                    aria-label={
                      viewMode === "kanban"
                        ? "Switch to Calendar view"
                        : "Switch to Kanban view"
                    }
                  >
                    {viewMode === "kanban" ? (
                      <HiOutlineCalendarDays
                        className="h-5 w-5"
                        style={{ color: "var(--kan-button-text)" }}
                      />
                    ) : (
                      <HiBars4
                        className="h-5 w-5"
                        style={{ color: "var(--kan-button-text)" }}
                      />
                    )}
                  </button>
                </Tooltip>
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
                  {"New list"}
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
                      <HiOutlineSquare3Stack3D
                        className="h-10 w-10"
                        style={{ color: "var(--kan-pages-text)", opacity: 0.5 }}
                      />
                      <p
                        className="mb-2 mt-4 text-[14px] font-bold"
                        style={{ color: "var(--kan-pages-text)" }}
                      >
                        {"No lists"}
                      </p>
                      <p
                        className="text-[14px]"
                        style={{ color: "var(--kan-pages-text)", opacity: 0.7 }}
                      >
                        {"Get started by creating a new list"}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        if (boardId) openNewListForm(boardId);
                      }}
                    >
                      {"Create new list"}
                    </Button>
                  </div>
                ) : (
                  <DragDropContext
                    onDragStart={onDragStart}
                    onDragUpdate={(update) => {
                      // Track which list cards are being dragged over
                      if (update.destination && update.type === "CARD") {
                        setDraggingOverListId(update.destination.droppableId);
                      } else {
                        setDraggingOverListId(null);
                      }
                    }}
                    onDragEnd={(result) => {
                      setDraggingOverListId(null);
                      onDragEnd(result);
                      clearSelection();
                    }}
                  >
                    {viewMode === "calendar" ? (
                      <div
                        key="calendar-view"
                        className="animate-view-fade h-full px-8 pb-4"
                      >
                        <CalendarView
                          lists={listsToRender}
                          onCardClick={handleCardClick}
                          onExpandCard={handleExpandCard}
                          selectedCardIds={selectedCardIds}
                          deletingIds={deletingIds}
                          draggingCardId={draggingCardId}
                        />
                      </div>
                    ) : (
                      <div
                        key="kanban-view"
                        className="animate-view-fade flex h-full flex-col md:flex-row"
                      >
                        <Droppable
                          droppableId="all-lists"
                          direction={isMobile ? "vertical" : "horizontal"}
                          type="LIST"
                        >
                          {(provided) => (
                            <div
                              className="flex flex-col md:flex-row"
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                            >
                              <div className="min-h-[1rem] min-w-[2rem]" />
                              {listsToRender.map((list, index) => (
                                <List
                                  index={index}
                                  key={list.publicId}
                                  list={list}
                                  cardCount={list.cards.length}
                                  isSelected={selectedListIds.has(
                                    list.publicId,
                                  )}
                                  isDeleting={deletingIds.has(list.publicId)}
                                  isDraggingOver={
                                    draggingOverListId === list.publicId
                                  }
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
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-w-[8px] z-10 h-full max-h-[calc(100vh-225px)] min-h-[2rem] overflow-y-auto pr-1 transition-all duration-200 scrollbar dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-600 ${
                                          snapshot.isDraggingOver
                                            ? "rounded-md bg-blue-50/30 ring-2 ring-blue-400 ring-offset-2 dark:bg-blue-900/20"
                                            : ""
                                        }`}
                                      >
                                        {list.cards.map((card, index) => (
                                          <Draggable
                                            key={card.publicId}
                                            draggableId={card.publicId}
                                            index={index}
                                          >
                                            {(provided) => (
                                              <Link
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCardClick(
                                                    e,
                                                    card.publicId,
                                                  );
                                                }}
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
                                                  checklists={card.checklists}
                                                  description={
                                                    card.description ?? null
                                                  }
                                                  comments={card.comments}
                                                  attachments={card.attachments}
                                                  dueDate={card.dueDate ?? null}
                                                  listColor={list.color}
                                                  isSelected={selectedCardIds.has(
                                                    card.publicId,
                                                  )}
                                                  isDeleting={deletingIds.has(
                                                    card.publicId,
                                                  )}
                                                  isGhosting={
                                                    draggingCardId !== null &&
                                                    selectedCardIds.has(
                                                      card.publicId,
                                                    ) &&
                                                    card.publicId !==
                                                      draggingCardId
                                                  }
                                                  onExpand={() =>
                                                    handleExpandCard(
                                                      card.publicId,
                                                    )
                                                  }
                                                />
                                                {/* Multi-drag count badge */}
                                                {draggingCardId ===
                                                  card.publicId &&
                                                  selectedCardIds.size > 1 && (
                                                    <MultiDragBadge
                                                      count={
                                                        selectedCardIds.size
                                                      }
                                                    />
                                                  )}
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
                      </div>
                    )}
                  </DragDropContext>
                )}
              </>
            ) : null}
          </div>
        </div>
        {renderModals()}

        {/* Floating delete button - appears when items are selected (KANBAN ONLY) */}
        {hasSelection && viewMode === "kanban" && (
          <div
            className="fixed inset-x-0 bottom-8 z-50 flex animate-fade-in justify-center px-4"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
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
                    ? "Quick delete ON - no confirmation"
                    : "Quick delete OFF - shows confirmation"
                }
              >
                {quickDeleteEnabled ? "⚡" : "🛡"}
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/30"
              >
                {"Delete"} {quickDeleteEnabled && "⚡"}
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
                {"Delete selected items?"}
              </h3>
              <p
                className="mb-6 text-sm"
                style={{ color: "var(--kan-menu-text)", opacity: 0.8 }}
              >
                {`This will permanently delete ${selectedCardIds.size} card(s) and ${selectedListIds.size} list(s). This action cannot be undone.`}
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
                  {"Cancel"}
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  {"Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

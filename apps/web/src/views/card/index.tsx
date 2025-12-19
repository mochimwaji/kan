import Link from "next/link";
import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  HiOutlineCalendar,
  HiOutlineRectangleStack,
  HiOutlineTag,
  HiOutlineUsers,
  HiXMark,
} from "react-icons/hi2";
import { IoChevronForwardSharp } from "react-icons/io5";

import Avatar from "~/components/Avatar";
import { DeleteConfirmation } from "~/components/DeleteConfirmation";
import Editor from "~/components/Editor";
import { LabelForm } from "~/components/LabelForm";
import LabelIcon from "~/components/LabelIcon";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import ActivityList from "./components/ActivityList";
import { AttachmentThumbnails } from "./components/AttachmentThumbnails";
import { AttachmentUpload } from "./components/AttachmentUpload";
import Checklists from "./components/Checklists";
import Dropdown from "./components/Dropdown";
import { DueDateSelector } from "./components/DueDateSelector";
import LabelSelector from "./components/LabelSelector";
import ListSelector from "./components/ListSelector";
import MemberSelector from "./components/MemberSelector";
import { NewChecklistForm } from "./components/NewChecklistForm";
import NewCommentForm from "./components/NewCommentForm";

interface FormValues {
  cardId: string;
  title: string;
  description: string;
}

function SidebarSectionHeader({
  icon,
  title,
  isCollapsed,
}: {
  icon: React.ReactNode;
  title: string;
  isCollapsed?: boolean;
}) {
  return (
    <div
      className={`flex h-[34px] w-full items-center gap-2 rounded-[5px] ${
        isCollapsed ? "justify-center" : "pl-2"
      } hover:bg-light-200 dark:hover:bg-dark-100`}
    >
      <div className="flex h-5 w-5 items-center justify-center">{icon}</div>
      {!isCollapsed && <p className="text-sm font-medium">{title}</p>}
    </div>
  );
}

export function CardRightPanel({
  isTemplate,
  isCollapsed = false,
}: {
  isTemplate?: boolean;
  isCollapsed?: boolean;
}) {
  const router = useRouter();

  const cardId = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;

  const { data: card } = api.card.byId.useQuery({
    cardPublicId: cardId ?? "",
  });

  const board = card?.list.board;
  const labels = board?.labels;
  const workspaceMembers = board?.workspace.members;
  const selectedLabels = card?.labels;
  const selectedMembers = card?.members;

  // Refs for keyboard shortcuts to programmatically click selectors
  const listSelectorRef = useRef<HTMLDivElement>(null);
  const labelSelectorRef = useRef<HTMLDivElement>(null);
  const memberSelectorRef = useRef<HTMLDivElement>(null);
  const dueDateSelectorRef = useRef<HTMLDivElement>(null);

  // Card sidebar keyboard shortcuts: l=list, k=labels, j=members, d=due date
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "l" },
    action: () => listSelectorRef.current?.click(),
    description: t`List selector`,
    group: "CARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "k" },
    action: () => labelSelectorRef.current?.click(),
    description: t`Labels selector`,
    group: "CARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "j" },
    action: () => memberSelectorRef.current?.click(),
    description: t`Members selector`,
    group: "CARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "d" },
    action: () => dueDateSelectorRef.current?.click(),
    description: t`Due date picker`,
    group: "CARD_VIEW",
  });

  const formattedLabels =
    labels?.map((label) => {
      const isSelected = selectedLabels?.some(
        (selectedLabel) => selectedLabel.publicId === label.publicId,
      );

      return {
        key: label.publicId,
        value: label.name,
        selected: isSelected ?? false,
        leftIcon: <LabelIcon colourCode={label.colourCode} />,
      };
    }) ?? [];

  const formattedLists =
    board?.lists.map((list) => ({
      key: list.publicId,
      value: list.name,
      selected: list.publicId === card?.list.publicId,
    })) ?? [];

  const formattedMembers =
    workspaceMembers?.map((member) => {
      const isSelected = selectedMembers?.some(
        (assignedMember) => assignedMember.publicId === member.publicId,
      );

      return {
        key: member.publicId,
        value: formatMemberDisplayName(
          member.user?.name ?? null,
          member.user?.email ?? member.email,
        ),
        imageUrl: member.user?.image
          ? getAvatarUrl(member.user.image)
          : undefined,
        selected: isSelected ?? false,
        leftIcon: (
          <Avatar
            size="xs"
            name={member.user?.name ?? ""}
            imageUrl={
              member.user?.image ? getAvatarUrl(member.user.image) : undefined
            }
            email={member.user?.email ?? member.email}
          />
        ),
      };
    }) ?? [];

  // Collapsed view: mirrors left sidebar collapsed structure exactly
  // Left sidebar collapsed has: divider (still visible with mb-4) > WorkspaceMenu (flex-col-reverse with h-9 icons) > navigation icons
  // Note: Dashboard already provides the h-[45px] header with drawer toggle, so we don't duplicate it
  if (isCollapsed) {
    return (
      <div
        className="flex h-full w-full flex-col"
        style={{
          backgroundColor: "var(--kan-sidebar-bg)",
          color: "var(--kan-sidebar-text)",
        }}
      >
        {/* Visible divider bar - matches left sidebar divider (stays visible even when collapsed) */}
        <div className="mx-1 mb-4 hidden w-auto border-b border-light-300 dark:border-dark-400 md:block" />

        {/* Invisible WorkspaceMenu placeholder - matches collapsed WorkspaceMenu structure exactly */}
        {/* WorkspaceMenu uses flex-col-reverse when collapsed, so search shows above workspace */}
        <div className="relative inline-block w-full pb-3" aria-hidden="true">
          <div className="flex flex-col-reverse items-center">
            {/* Workspace button placeholder: md:h-9 md:w-9 md:mb-1.5 */}
            <div className="mb-1.5 h-9 w-9" />
            {/* Search button placeholder: md:h-9 md:w-9 md:mb-2 */}
            <div className="mb-2 h-9 w-9" />
          </div>
        </div>

        {/* Card action icons - matches left sidebar collapsed navigation pattern */}
        <ul role="list" className="flex flex-col items-center space-y-1">
          <li>
            <ListSelector
              cardPublicId={cardId ?? ""}
              lists={formattedLists}
              isLoading={!card}
              isCollapsed
            >
              <SidebarSectionHeader
                icon={<HiOutlineRectangleStack size={20} />}
                title={t`List`}
                isCollapsed
              />
            </ListSelector>
          </li>
          <li>
            <LabelSelector
              cardPublicId={cardId ?? ""}
              labels={formattedLabels}
              isLoading={!card}
              isCollapsed
            >
              <SidebarSectionHeader
                icon={<HiOutlineTag size={20} />}
                title={t`Labels`}
                isCollapsed
              />
            </LabelSelector>
          </li>
          {!isTemplate && (
            <li>
              <MemberSelector
                cardPublicId={cardId ?? ""}
                members={formattedMembers}
                isLoading={!card}
                isCollapsed
              >
                <SidebarSectionHeader
                  icon={<HiOutlineUsers size={20} />}
                  title={t`Members`}
                  isCollapsed
                />
              </MemberSelector>
            </li>
          )}
          <li>
            <DueDateSelector
              cardPublicId={cardId ?? ""}
              dueDate={card?.dueDate}
              isLoading={!card}
              isCollapsed
            >
              <SidebarSectionHeader
                icon={<HiOutlineCalendar size={20} />}
                title={t`Due date`}
                isCollapsed
              />
            </DueDateSelector>
          </li>
        </ul>
      </div>
    );
  }

  // Expanded view: mirrors left sidebar structure exactly for perfect alignment
  // Left sidebar has: divider mb-4 > WorkspaceMenu (pb-3 with h-[34px] button + h-[34px] search side-by-side) > ul.space-y-1
  // Note: Dashboard already provides the h-[45px] header with drawer toggle, so we don't duplicate it
  return (
    <div
      className="h-full w-full"
      style={{
        backgroundColor: "var(--kan-sidebar-bg)",
        color: "var(--kan-sidebar-text)",
      }}
    >
      {/* Visible divider bar - matches left sidebar divider styling exactly */}
      <div className="mx-1 mb-4 hidden w-auto border-b border-light-300 dark:border-dark-400 md:block" />

      {/* Invisible WorkspaceMenu placeholder - matches WorkspaceMenu expanded structure */}
      {/* In expanded mode, workspace button and search are side-by-side (flex-row with gap-1) */}
      <div
        className="relative inline-block w-full px-2 pb-3"
        aria-hidden="true"
      >
        <div className="flex items-center justify-start gap-1">
          {/* Workspace button placeholder: h-[34px] flex-1 + mb-1 */}
          <div className="mb-1 h-[34px] flex-1" />
          {/* Search button placeholder: h-[34px] w-[34px] + mb-1 */}
          <div className="mb-1 h-[34px] w-[34px]" />
        </div>
      </div>

      {/* Card action buttons - matches left sidebar ul.space-y-1 navigation */}
      <ul role="list" className="space-y-1 px-2">
        <li>
          <ListSelector
            cardPublicId={cardId ?? ""}
            lists={formattedLists}
            isLoading={!card}
          >
            <div ref={listSelectorRef}>
              <SidebarSectionHeader
                icon={<HiOutlineRectangleStack size={20} />}
                title={t`List`}
              />
            </div>
          </ListSelector>
        </li>
        <li>
          <LabelSelector
            cardPublicId={cardId ?? ""}
            labels={formattedLabels}
            isLoading={!card}
          >
            <div ref={labelSelectorRef}>
              <SidebarSectionHeader
                icon={<HiOutlineTag size={20} />}
                title={t`Labels`}
              />
            </div>
          </LabelSelector>
        </li>
        {!isTemplate && (
          <li>
            <MemberSelector
              cardPublicId={cardId ?? ""}
              members={formattedMembers}
              isLoading={!card}
            >
              <div ref={memberSelectorRef}>
                <SidebarSectionHeader
                  icon={<HiOutlineUsers size={20} />}
                  title={t`Members`}
                />
              </div>
            </MemberSelector>
          </li>
        )}
        <li>
          <DueDateSelector
            cardPublicId={cardId ?? ""}
            dueDate={card?.dueDate}
            isLoading={!card}
          >
            <div ref={dueDateSelectorRef}>
              <SidebarSectionHeader
                icon={<HiOutlineCalendar size={20} />}
                title={t`Due date`}
              />
            </div>
          </DueDateSelector>
        </li>
      </ul>
    </div>
  );
}

export default function CardPage({ isTemplate }: { isTemplate?: boolean }) {
  const router = useRouter();
  const utils = api.useUtils();
  const {
    modalContentType,
    entityId,
    openModal,
    closeModal,
    closeModals,
    getModalState,
    clearModalState,
    isOpen,
    modalStates,
  } = useModal();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const [activeChecklistForm, setActiveChecklistForm] = useState<string | null>(
    null,
  );

  // Transition state
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in on mount
    requestAnimationFrame(() => setOpacity(1));
  }, []);

  const handleClose = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setOpacity(0);
    setTimeout(() => {
      router.push(href);
    }, 300);
  };

  const cardId = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;

  const { data: card, isLoading } = api.card.byId.useQuery({
    cardPublicId: cardId ?? "",
  });

  const refetchCard = async () => {
    if (cardId) await utils.card.byId.refetch({ cardPublicId: cardId });
  };

  const board = card?.list.board;
  const boardId = board?.publicId;
  const activities = card?.activities;

  // Esc shortcut to close card and return to board (only when no modal is open)
  const closeCardHref = useCallback(() => {
    if (boardId && !isOpen) {
      setOpacity(0);
      setTimeout(() => {
        router.push(
          isTemplate ? `/templates/${boardId}` : `/boards/${boardId}`,
        );
      }, 300);
    }
  }, [boardId, isTemplate, router, isOpen]);

  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "Escape" },
    action: closeCardHref,
    description: t`Close card`,
    group: "CARD_VIEW",
  });

  const updateCard = api.card.update.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId: cardId });
    },
  });

  const addOrRemoveLabel = api.card.addOrRemoveLabel.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to add label`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      if (cardId) {
        await utils.card.byId.invalidate({ cardPublicId: cardId });
      }
    },
  });

  // Delete card mutation - navigates to board on success
  const deleteCardMutation = api.card.delete.useMutation({
    onMutate: async () => {
      await utils.board.byId.cancel();
    },
    onError: () => {
      showPopup({
        header: t`Unable to delete card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSuccess: () => {
      closeModal();
      void router.push(
        isTemplate ? `/templates/${boardId}` : `/boards/${boardId}`,
      );
    },
    onSettled: async () => {
      if (boardId) {
        await utils.board.byId.invalidate({ boardPublicId: boardId });
      }
    },
  });

  // Delete label mutation
  const deleteLabelMutation = api.label.delete.useMutation({
    onSuccess: async () => {
      closeModals(2);
      await utils.card.byId.invalidate({ cardPublicId: cardId });
    },
    onError: () => {
      showPopup({
        header: t`Error deleting label`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  // Delete checklist mutation
  const deleteChecklistMutation = api.checklist.delete.useMutation({
    onMutate: async () => {
      await utils.card.byId.cancel({ cardPublicId: cardId ?? "" });
      const previous = utils.card.byId.getData({ cardPublicId: cardId ?? "" });
      utils.card.byId.setData({ cardPublicId: cardId ?? "" }, (old) => {
        if (!old) return old as typeof previous;
        const updatedChecklists = old.checklists.filter(
          (cl) => cl.publicId !== entityId,
        );
        return { ...old, checklists: updatedChecklists } as typeof old;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        utils.card.byId.setData({ cardPublicId: cardId ?? "" }, ctx.previous);
      showPopup({
        header: t`Unable to delete checklist`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      closeModal();
      await utils.card.byId.invalidate({ cardPublicId: cardId });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = api.card.deleteComment.useMutation({
    onMutate: async () => {
      closeModal();
      await utils.card.byId.cancel();
      const currentState = utils.card.byId.getData({
        cardPublicId: cardId ?? "",
      });
      utils.card.byId.setData({ cardPublicId: cardId ?? "" }, (oldCard) => {
        if (!oldCard) return oldCard;
        const updatedActivities = oldCard.activities.filter(
          (activity) => activity.comment?.publicId !== entityId,
        );
        return { ...oldCard, activities: updatedActivities };
      });
      return { previousState: currentState };
    },
    onError: (_error, _newList, context) => {
      utils.card.byId.setData(
        { cardPublicId: cardId ?? "" },
        context?.previousState,
      );
      showPopup({
        header: t`Unable to delete comment`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId: cardId ?? "" });
    },
  });

  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    values: {
      cardId: cardId ?? "",
      title: card?.title ?? "",
      description: card?.description ?? "",
    },
  });

  const onSubmit = (values: FormValues) => {
    updateCard.mutate({
      cardPublicId: values.cardId,
      title: values.title,
      description: values.description,
    });
  };

  // this adds the new created label to selected labels
  useEffect(() => {
    const newLabelId = modalStates.NEW_LABEL_CREATED;
    if (newLabelId && cardId) {
      const isAlreadyAdded = card?.labels.some(
        (label) => label.publicId === newLabelId,
      );

      if (!isAlreadyAdded) {
        addOrRemoveLabel.mutate({
          cardPublicId: cardId,
          labelPublicId: newLabelId,
        });
      }
      clearModalState("NEW_LABEL_CREATED");
    }
  }, [modalStates.NEW_LABEL_CREATED, card, cardId]);

  // Open the new item form after creating a new checklist
  useEffect(() => {
    if (!card) return;
    const state = getModalState("ADD_CHECKLIST");
    const createdId: string | undefined = state?.createdChecklistId;
    if (createdId) {
      setActiveChecklistForm(createdId);
      clearModalState("ADD_CHECKLIST");
    }
  }, [card, getModalState, clearModalState]);

  // Auto-resize title textarea
  useEffect(() => {
    const titleTextarea = document.getElementById(
      "title",
    ) as HTMLTextAreaElement;
    if (titleTextarea) {
      titleTextarea.style.height = "auto";
      titleTextarea.style.height = `${titleTextarea.scrollHeight}px`;
    }
  }, [card]);

  if (!cardId) return <></>;

  return (
    <>
      <PageHead
        title={t`${card?.title ?? t`Card`} | ${board?.name ?? t`Board`}`}
      />
      <div
        className="flex h-full flex-1 flex-col overflow-hidden"
        style={{
          opacity,
          transition: "opacity 300ms ease-in-out",
        }}
      >
        {/* Full-width top strip with board link and dropdown */}
        <div
          className="flex w-full items-center justify-between px-8 py-2"
          style={{ backgroundColor: "var(--kan-pages-bg)" }}
        >
          {!card && isLoading && (
            <div className="flex space-x-2">
              <div className="h-[1.5rem] w-[150px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
            </div>
          )}
          {!card && !isLoading && (
            <p
              className="block p-0 py-0 font-bold leading-[1.5rem] tracking-tight sm:text-[1rem]"
              style={{ color: "var(--kan-pages-text)" }}
            >
              {t`Card not found`}
            </p>
          )}

          <div className="flex-1" />

          <Link
            href={
              board?.publicId
                ? `/${isTemplate ? "templates" : "boards"}/${board.publicId}`
                : "/boards"
            }
            onClick={(e) =>
              handleClose(
                e,
                board?.publicId
                  ? `/${isTemplate ? "templates" : "boards"}/${board.publicId}`
                  : "/boards",
              )
            }
            className="text-light-400 hover:text-light-600 dark:text-dark-500 dark:hover:text-dark-300"
          >
            <HiXMark size={24} />
          </Link>
        </div>
        <div className="scrollbar-thumb-rounded-[4px] scrollbar-track-rounded-[4px] w-full flex-1 overflow-y-auto scrollbar scrollbar-track-light-200 scrollbar-thumb-light-400 hover:scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-300 dark:hover:scrollbar-thumb-dark-300">
          <div className="p-auto mx-auto flex h-full w-full max-w-[800px] flex-col">
            <div className="p-6 md:p-8">
              <div className="mb-8 md:mt-4">
                {!card && isLoading && (
                  <div className="flex space-x-2">
                    <div className="h-[2.3rem] w-[300px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
                  </div>
                )}
                {card && (
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="w-full space-y-6"
                  >
                    <div>
                      <textarea
                        id="title"
                        {...register("title")}
                        onBlur={handleSubmit(onSubmit)}
                        rows={1}
                        className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 py-0 font-bold leading-relaxed focus:ring-0 sm:text-[1.2rem]"
                        style={{ color: "var(--kan-pages-text)" }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                      />
                    </div>
                  </form>
                )}
                {!card && !isLoading && (
                  <p
                    className="block p-0 py-0 font-bold leading-[2.3rem] tracking-tight sm:text-[1.2rem]"
                    style={{ color: "var(--kan-pages-text)" }}
                  >
                    {t`Card not found`}
                  </p>
                )}
              </div>
              {card && (
                <>
                  <div className="mb-10 flex w-full max-w-2xl flex-col justify-between">
                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      className="w-full space-y-6"
                    >
                      <div className="mt-2">
                        <Editor
                          content={card.description}
                          onChange={(e) => setValue("description", e)}
                          onBlur={() => handleSubmit(onSubmit)()}
                          workspaceMembers={board?.workspace.members ?? []}
                        />
                      </div>
                    </form>
                  </div>
                  <Checklists
                    checklists={card.checklists}
                    cardPublicId={cardId}
                    activeChecklistForm={activeChecklistForm}
                    setActiveChecklistForm={setActiveChecklistForm}
                  />
                  {!isTemplate && (
                    <>
                      {card?.attachments.length > 0 && (
                        <div className="mt-6">
                          <AttachmentThumbnails
                            attachments={card.attachments}
                            cardPublicId={cardId ?? ""}
                          />
                        </div>
                      )}
                      <div className="mt-6">
                        <AttachmentUpload cardPublicId={cardId} />
                      </div>
                    </>
                  )}
                  <div className="border-t-[1px] border-light-300 pt-12 dark:border-dark-300">
                    <h2
                      className="text-md pb-4 font-medium"
                      style={{ color: "var(--kan-pages-text)" }}
                    >
                      {t`Activity`}
                    </h2>
                    <div>
                      <ActivityList
                        cardPublicId={cardId}
                        activities={activities ?? []}
                        isLoading={!card}
                        isAdmin={workspace.role === "admin"}
                      />
                    </div>
                    {!isTemplate && (
                      <div className="mt-6">
                        <NewCommentForm cardPublicId={cardId} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <>
          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_LABEL"}
          >
            <LabelForm boardPublicId={boardId ?? ""} refetch={refetchCard} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "EDIT_LABEL"}
          >
            <LabelForm
              boardPublicId={boardId ?? ""}
              refetch={refetchCard}
              isEdit
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_LABEL"}
          >
            <DeleteConfirmation
              entityType="label"
              onConfirm={() =>
                deleteLabelMutation.mutate({ labelPublicId: entityId })
              }
              isLoading={deleteLabelMutation.isPending}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_CARD"}
          >
            <DeleteConfirmation
              entityType="card"
              onConfirm={() =>
                deleteCardMutation.mutate({ cardPublicId: cardId ?? "" })
              }
              isLoading={deleteCardMutation.isPending}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_COMMENT"}
          >
            <DeleteConfirmation
              entityType="comment"
              onConfirm={() =>
                deleteCommentMutation.mutate({
                  cardPublicId: cardId ?? "",
                  commentPublicId: entityId,
                })
              }
              isLoading={deleteCommentMutation.isPending}
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
            isVisible={isOpen && modalContentType === "ADD_CHECKLIST"}
          >
            <NewChecklistForm cardPublicId={cardId} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_CHECKLIST"}
          >
            <DeleteConfirmation
              entityType="checklist"
              onConfirm={() =>
                deleteChecklistMutation.mutate({ checklistPublicId: entityId })
              }
              isLoading={deleteChecklistMutation.isPending}
            />
          </Modal>
        </>
      </div>
    </>
  );
}

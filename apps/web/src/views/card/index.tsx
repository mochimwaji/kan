import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";

import { DeleteConfirmation } from "~/components/DeleteConfirmation";
import Editor from "~/components/Editor";
import { LabelForm } from "~/components/LabelForm";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useTransitionState } from "~/hooks/useTransitionState";
import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import ActivityList from "./components/ActivityList";
import { AttachmentThumbnails } from "./components/AttachmentThumbnails";
import { AttachmentUpload } from "./components/AttachmentUpload";
import { CardRightPanel } from "./components/CardRightPanel";
import Checklists from "./components/Checklists";
import { NewChecklistForm } from "./components/NewChecklistForm";
import NewCommentForm from "./components/NewCommentForm";
import { useCardActions } from "./hooks/useCardActions";

export default function CardPage({ isTemplate }: { isTemplate?: boolean }) {
  const router = useRouter();
  const utils = api.useUtils();
  const {
    modalContentType,
    entityId,

    openModal: _openModal,
    getModalState: _getModalState,
    clearModalState,
    isOpen,
    modalStates,
  } = useModal();
  const { workspace } = useWorkspace();
  const [activeChecklistForm, setActiveChecklistForm] = useState<string | null>(
    null,
  );

  // Transition state (extracted to hook)
  const { opacity, triggerExit } = useTransitionState(300);

  const handleClose = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    triggerExit(() => void router.push(href));
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
      triggerExit(
        () =>
          void router.push(
            isTemplate ? `/templates/${boardId}` : `/boards/${boardId}`,
          ),
      );
    }
  }, [boardId, isTemplate, router, isOpen, triggerExit]);

  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "Escape" },
    action: closeCardHref,
    description: "Close card",
    group: "CARD_VIEW",
  });

  const { register, handleSubmit, setValue } = useForm<{
    cardId: string;
    title: string;
    description: string;
  }>({
    values: {
      cardId: cardId ?? "",
      title: card?.title ?? "",
      description: card?.description ?? "",
    },
  });

  const {
    updateCard,
    addOrRemoveLabel,
    deleteCardMutation,
    deleteLabelMutation,
    deleteChecklistMutation,
    deleteCommentMutation,
  } = useCardActions(cardId ?? "", boardId, isTemplate);

  const onSubmit = (values: {
    cardId: string;
    title: string;
    description: string;
  }) => {
    updateCard.mutate({
      cardPublicId: values.cardId,
      title: values.title,
      description: values.description,
    });
  };

  // this adds the new created label to selected labels
  useEffect(() => {
    const newLabelId = modalStates.NEW_LABEL_CREATED as string | undefined;
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
  }, [
    modalStates.NEW_LABEL_CREATED,
    card,
    cardId,
    addOrRemoveLabel,
    clearModalState,
  ]);

  // Open the new item form after creating a new checklist
  // Use direct modalStates access to avoid re-render cascade from getModalState
  const processedChecklistRef = useRef<string | null>(null);
  useEffect(() => {
    if (!card) return;
    const state = modalStates.ADD_CHECKLIST as
      | { createdChecklistId?: string }
      | undefined;
    const createdId: string | undefined = state?.createdChecklistId;
    // Only process if we have a new ID that we haven't processed before
    if (createdId && createdId !== processedChecklistRef.current) {
      processedChecklistRef.current = createdId;
      setActiveChecklistForm(createdId);
      clearModalState("ADD_CHECKLIST");
    }
  }, [card, modalStates, clearModalState]);

  // Auto-resize title textarea
  useEffect(() => {
    const titleTextarea = document.getElementById(
      "title",
    ) as HTMLTextAreaElement;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- DOM element may not exist
    if (titleTextarea) {
      titleTextarea.style.height = "auto";
      titleTextarea.style.height = `${titleTextarea.scrollHeight}px`;
    }
  }, [card]);

  if (!cardId) return <></>;

  return (
    <>
      <PageHead
        title={`${card?.title ?? "Card"} | ${board?.name ?? "Board"}`}
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
              {"Card not found"}
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
                    {"Card not found"}
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
                      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive array check */}
                      {card?.attachments.length > 0 && (
                        <div className="mt-6">
                          <AttachmentThumbnails
                            attachments={card.attachments}
                            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive fallback
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
                      {"Activity"}
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
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive fallback
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
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive fallback
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

export { CardRightPanel };

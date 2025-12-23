import { useRouter } from "next/router";

import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

export function useCardActions(
  cardPublicId: string,
  boardPublicId?: string,
  isTemplate?: boolean,
) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { closeModal, closeModals, entityId } = useModal();
  const router = useRouter();

  const updateCard = api.card.update.useMutation({
    onError: () => {
      showPopup({
        header: "Unable to update card",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId });
    },
  });

  const addOrRemoveLabel = api.card.addOrRemoveLabel.useMutation({
    onError: () => {
      showPopup({
        header: "Unable to add label",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId });
    },
  });

  const deleteCardMutation = api.card.delete.useMutation({
    onMutate: async () => {
      await utils.board.byId.cancel();
    },
    onError: () => {
      showPopup({
        header: "Unable to delete card",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSuccess: () => {
      closeModal();
      const href = isTemplate
        ? `/templates/${boardPublicId}`
        : `/boards/${boardPublicId}`;
      void router.push(href);
    },
    onSettled: async () => {
      if (boardPublicId) {
        await utils.board.byId.invalidate({ boardPublicId });
      }
    },
  });

  const deleteLabelMutation = api.label.delete.useMutation({
    onSuccess: async () => {
      closeModals(2);
      await utils.card.byId.invalidate({ cardPublicId });
    },
    onError: () => {
      showPopup({
        header: "Error deleting label",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
  });

  const deleteChecklistMutation = api.checklist.delete.useMutation({
    onMutate: async () => {
      await utils.card.byId.cancel({ cardPublicId });
      const previous = utils.card.byId.getData({ cardPublicId });
      utils.card.byId.setData({ cardPublicId }, (old) => {
        if (!old) return old;
        const updatedChecklists = old.checklists.filter(
          (cl) => cl.publicId !== entityId,
        );
        return { ...old, checklists: updatedChecklists };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        utils.card.byId.setData({ cardPublicId }, ctx.previous);
      showPopup({
        header: "Unable to delete checklist",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      closeModal();
      await utils.card.byId.invalidate({ cardPublicId });
      // Also invalidate board to refresh board view
      await utils.board.byId.invalidate();
    },
  });

  const deleteCommentMutation = api.card.deleteComment.useMutation({
    onMutate: async () => {
      closeModal();
      await utils.card.byId.cancel();
      const currentState = utils.card.byId.getData({ cardPublicId });
      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;
        const updatedActivities = oldCard.activities.filter(
          (activity) => activity.comment?.publicId !== entityId,
        );
        return { ...oldCard, activities: updatedActivities };
      });
      return { previousState: currentState };
    },
    onError: (_error, _newList, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousState);
      showPopup({
        header: "Unable to delete comment",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId });
    },
  });

  return {
    updateCard,
    addOrRemoveLabel,
    deleteCardMutation,
    deleteLabelMutation,
    deleteChecklistMutation,
    deleteCommentMutation,
  };
}

import { useRouter } from "next/router";

import type { DueDateFilter } from "~/utils/dueDateFilters";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

export function useBoardMutations(queryParams: {
  boardPublicId: string;
  members: string[];
  labels: string[];
  lists: string[];
  dueDate: DueDateFilter[];
  type: "regular" | "template";
}) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { closeModal, closeModals } = useModal();
  const router = useRouter();

  const updateBoard = api.board.update.useMutation();

  const deleteBoardMutation = api.board.delete.useMutation({
    onSuccess: (_data, _variables) => {
      closeModal();
      const isTemplate = queryParams.type === "template";
      // Delay navigation to allow visual fade-out transition (300ms matches CSS)
      setTimeout(() => {
        void router.push(isTemplate ? `/templates` : `/boards`);
      }, 300);
    },
    onError: () => {
      const isTemplate = queryParams.type === "template";
      showPopup({
        header: `Unable to delete ${isTemplate ? "template" : "board"}`,
        message: "Please try again later.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.all.invalidate();
    },
  });

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
        header: "Unable to delete card",
        message: "Please try again later.",
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
        header: "Unable to delete list",
        message: "Please try again later.",
        icon: "error",
      });
    },
  });

  const deleteLabelMutation = api.label.delete.useMutation({
    onSuccess: async () => {
      closeModals(2);
      await utils.board.byId.invalidate(queryParams);
    },
    onError: () => {
      showPopup({
        header: "Error deleting label",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
  });

  const bulkUpdateCardMutation = api.card.bulkUpdate.useMutation({
    onMutate: async (updates) => {
      await utils.board.byId.cancel();
      const previousBoard = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (old) => {
        if (!old) return old;
        const updateMap = new Map(
          updates.map((u) => [u.cardPublicId, u] as const),
        );
        return {
          ...old,
          lists: old.lists.map((list) => ({
            ...list,
            cards: list.cards.map((card) => {
              const update = updateMap.get(card.publicId);
              if (update) {
                return {
                  ...card,
                  ...update,
                  title: update.title ?? card.title,
                  description: update.description ?? card.description,
                  dueDate:
                    update.dueDate === undefined
                      ? card.dueDate
                      : update.dueDate,
                  calendarOrder:
                    update.calendarOrder ??
                    (card as { calendarOrder?: number | null }).calendarOrder,
                };
              }
              return card;
            }),
          })),
        };
      });

      return { previousBoard };
    },
    onError: (_err, _newCard, context) => {
      if (context?.previousBoard) {
        utils.board.byId.setData(queryParams, context.previousBoard);
      }
      showPopup({
        header: "Unable to update cards",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate(queryParams);
    },
  });

  const updateCardMutation = api.card.update.useMutation({
    onMutate: async (newCard) => {
      await utils.board.byId.cancel();
      const previousBoard = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (old) => {
        if (!old) return old;

        // 1. Find the card and its current list
        let movedCard: (typeof old.lists)[0]["cards"][0] | undefined;
        let sourceListId: string | undefined;

        for (const list of old.lists) {
          const card = list.cards.find(
            (c) => c.publicId === newCard.cardPublicId,
          );
          if (card) {
            movedCard = { ...card, ...newCard };
            sourceListId = list.publicId;
            break;
          }
        }

        if (!movedCard || !sourceListId) return old;

        // 2. Remove from source and insert into destination
        const updatedLists = old.lists.map((list) => {
          const isSource = list.publicId === sourceListId;
          const isDest = list.publicId === newCard.listPublicId;

          let newCards = [...list.cards];

          if (isSource) {
            newCards = newCards.filter(
              (c) => c.publicId !== newCard.cardPublicId,
            );
          }

          if (isDest) {
            // If it's the same list, it was already removed if isSource was true
            const insertIndex = newCard.index ?? 0;
            newCards.splice(insertIndex, 0, movedCard);
          }

          return {
            ...list,
            cards: newCards.map((c, idx) => ({ ...c, index: idx })),
          };
        });

        return { ...old, lists: updatedLists };
      });

      return { previousBoard };
    },
    onError: (_err, _newTodo, context) => {
      if (context?.previousBoard) {
        utils.board.byId.setData(queryParams, context.previousBoard);
      }
      showPopup({
        header: "Unable to update card",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate(queryParams);
    },
  });

  const bulkMoveMutation = api.card.bulkMove.useMutation({
    onMutate: async (variables) => {
      await utils.board.byId.cancel();
      const previousBoard = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (old) => {
        if (!old) return old;

        // 1. Extract all moved cards
        const movedCards: (typeof old.lists)[0]["cards"] = [];
        const cardIdsToMove = variables.cardPublicIds;

        // 2. Remove from all source lists
        const updatedLists = old.lists.map((list) => {
          const remainingCards: typeof list.cards = [];
          for (const card of list.cards) {
            if (cardIdsToMove.includes(card.publicId)) {
              movedCards.push(card);
            } else {
              remainingCards.push(card);
            }
          }
          return { ...list, cards: remainingCards };
        });

        // Sort moved cards based on the input order
        movedCards.sort((a, b) => {
          return (
            cardIdsToMove.indexOf(a.publicId) -
            cardIdsToMove.indexOf(b.publicId)
          );
        });

        // 3. Insert into destination list
        const destList = updatedLists.find(
          (l) => l.publicId === variables.listPublicId,
        );
        if (destList) {
          destList.cards.splice(variables.startIndex, 0, ...movedCards);
        }

        // 4. Update indices for all lists
        return {
          ...old,
          lists: updatedLists.map((list) => ({
            ...list,
            cards: list.cards.map((card, idx) => ({ ...card, index: idx })),
          })),
        };
      });

      return { previousBoard };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBoard) {
        utils.board.byId.setData(queryParams, context.previousBoard);
      }
      showPopup({
        header: "Unable to move cards",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate(queryParams);
    },
  });

  const updateListMutation = api.list.update.useMutation({
    onMutate: async (variables) => {
      await utils.board.byId.cancel();
      const previousBoard = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (old) => {
        if (!old) return old;
        const updatedLists = [...old.lists];
        const sourceIndex = updatedLists.findIndex(
          (l) => l.publicId === variables.listPublicId,
        );
        if (sourceIndex === -1) return old;

        const [removed] = updatedLists.splice(sourceIndex, 1);
        if (removed) {
          updatedLists.splice(variables.index, 0, removed);
        }

        return {
          ...old,
          lists: updatedLists.map((list, idx) => ({ ...list, index: idx })),
        };
      });

      return { previousBoard };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBoard) {
        utils.board.byId.setData(queryParams, context.previousBoard);
      }
      showPopup({
        header: "Unable to update list",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate(queryParams);
    },
  });

  return {
    updateBoard,
    deleteBoardMutation,
    deleteCardMutation,
    deleteListMutation,
    deleteLabelMutation,
    bulkUpdateCardMutation,
    updateCardMutation,
    bulkMoveMutation,
    updateListMutation,
  };
}

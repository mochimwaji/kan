import type { UseMutationResult } from "@tanstack/react-query";

import type { RouterOutputs } from "@kan/api";

import type { DueDateFilter } from "~/utils/dueDateFilters";
import { DeleteConfirmation } from "~/components/DeleteConfirmation";
import { LabelForm } from "~/components/LabelForm";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { useModal } from "~/providers/modal";
import { NewCardForm } from "./NewCardForm";
import { NewListForm } from "./NewListForm";
import { NewTemplateForm } from "./NewTemplateForm";
import { UpdateBoardSlugForm } from "./UpdateBoardSlugForm";

type BoardData = RouterOutputs["board"]["byId"];

interface BoardModalsProps {
  isTemplate: boolean;
  boardId: string | null;
  boardData: BoardData | undefined;
  workspace: { publicId: string; slug?: string | null };
  selectedPublicListId: string;
  queryParams: {
    boardPublicId: string;
    members: string[];
    labels: string[];
    lists: string[];
    dueDate: DueDateFilter[];
    type: "regular" | "template";
  };
  refetchBoard: () => void;
  mutations: {
    deleteBoardMutation: UseMutationResult<
      unknown,
      unknown,
      { boardPublicId: string }
    >;
    deleteListMutation: UseMutationResult<
      unknown,
      unknown,
      { listPublicId: string }
    >;
    deleteLabelMutation: UseMutationResult<
      unknown,
      unknown,
      { labelPublicId: string }
    >;
  };
}

export function BoardModals({
  isTemplate,
  boardId,
  boardData,
  workspace,
  selectedPublicListId,
  queryParams,
  refetchBoard,
  mutations,
}: BoardModalsProps) {
  const { isOpen, modalContentType, entityId, closeModal } = useModal();

  return (
    <>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_BOARD"}
      >
        <DeleteConfirmation
          entityType={isTemplate ? "template" : "board"}
          onConfirm={() => {
            if (boardId) {
              mutations.deleteBoardMutation.mutate({ boardPublicId: boardId });
            }
          }}
          isLoading={mutations.deleteBoardMutation.isPending}
        />
      </Modal>

      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_LIST"}
      >
        <DeleteConfirmation
          entityType="list"
          onConfirm={() => {
            mutations.deleteListMutation.mutate({
              listPublicId: selectedPublicListId,
            });
            closeModal();
          }}
          isLoading={mutations.deleteListMutation.isPending}
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
        <NewListForm boardPublicId={boardId ?? ""} queryParams={queryParams} />
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
        <DeleteConfirmation
          entityType="label"
          onConfirm={() =>
            mutations.deleteLabelMutation.mutate({ labelPublicId: entityId })
          }
          isLoading={mutations.deleteLabelMutation.isPending}
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
          workspacePublicId={workspace.publicId}
          sourceBoardPublicId={boardId ?? ""}
          sourceBoardName={boardData?.name ?? ""}
        />
      </Modal>
    </>
  );
}

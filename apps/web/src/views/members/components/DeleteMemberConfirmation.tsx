import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export function DeleteMemberConfirmation() {
  const utils = api.useUtils();
  const { closeModal, entityLabel, entityId } = useModal();
  const { workspace } = useWorkspace();
  const { showPopup } = usePopup();

  const deleteMember = api.member.delete.useMutation({
    onSuccess: async () => {
      closeModal();
      try {
        await utils.workspace.byId.refetch();
      } catch (e) {
        console.error(e);
      }
    },
    onError: () => {
      showPopup({
        header: "Unable to remove member",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
      closeModal();
    },
  });

  const handleDeleteMember = () => {
    if (entityId)
      deleteMember.mutate({
        memberPublicId: entityId,
        workspacePublicId: workspace.publicId,
      });
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {`Are you sure want to remove ${entityLabel}?`}
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {"They won't be able to access this workspace."}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button onClick={() => closeModal()} variant="secondary">
          {"Cancel"}
        </Button>
        <Button onClick={handleDeleteMember} isLoading={deleteMember.isPending}>
          {"Remove"}
        </Button>
      </div>
    </div>
  );
}

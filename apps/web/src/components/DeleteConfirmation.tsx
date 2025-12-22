import Button from "~/components/Button";
import { useModal } from "~/providers/modal";

type EntityType =
  | "card"
  | "board"
  | "list"
  | "checklist"
  | "comment"
  | "label"
  | "template";

interface DeleteConfirmationProps {
  entityType: EntityType;
  onConfirm: () => void;
  isLoading: boolean;
}

const getEntityMessage = (entityType: EntityType): string => {
  switch (entityType) {
    case "card":
      return "Are you sure you want to delete this card?";
    case "board":
      return "Are you sure you want to delete this board?";
    case "template":
      return "Are you sure you want to delete this template?";
    case "list":
      return "Are you sure you want to delete this list?";
    case "checklist":
      return "Are you sure you want to delete this checklist?";
    case "comment":
      return "Are you sure you want to delete this comment?";
    case "label":
      return "Are you sure you want to delete this label?";
    default:
      return "Are you sure you want to delete this item?";
  }
};

export function DeleteConfirmation({
  entityType,
  onConfirm,
  isLoading,
}: DeleteConfirmationProps) {
  const { closeModal } = useModal();

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2
          className="text-md pb-4 font-medium"
          style={{ color: "var(--kan-menu-text)" }}
        >
          {getEntityMessage(entityType)}
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {"This action can't be undone."}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button variant="secondary" onClick={() => closeModal()}>
          {"Cancel"}
        </Button>
        <Button onClick={onConfirm} isLoading={isLoading}>
          {"Delete"}
        </Button>
      </div>
    </div>
  );
}

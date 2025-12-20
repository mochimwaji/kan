import {
  HiEllipsisHorizontal,
  HiLink,
  HiOutlineBolt,
  HiOutlineDocumentDuplicate,
  HiOutlineShieldCheck,
  HiOutlineTrash,
} from "react-icons/hi2";

import Dropdown from "~/components/Dropdown";
import { useModal } from "~/providers/modal";

export default function BoardDropdown({
  isTemplate,
  isLoading,
  boardPublicId,
  workspacePublicId,
  quickDeleteEnabled,
  onToggleQuickDelete,
}: {
  isTemplate: boolean;
  isLoading: boolean;
  boardPublicId: string;
  workspacePublicId: string;
  quickDeleteEnabled: boolean;
  onToggleQuickDelete: () => void;
}) {
  const { openModal } = useModal();

  return (
    <Dropdown
      disabled={isLoading}
      items={[
        ...(isTemplate
          ? []
          : [
              {
                label: "Make template",
                action: () => openModal("CREATE_TEMPLATE"),
                icon: (
                  <HiOutlineDocumentDuplicate className="h-[16px] w-[16px] text-dark-900" />
                ),
              },
              {
                label: "Edit board URL",
                action: () => openModal("UPDATE_BOARD_SLUG"),
                icon: <HiLink className="h-[16px] w-[16px] text-dark-900" />,
              },
            ]),
        {
          label: quickDeleteEnabled
            ? "Disable quick delete ⚡"
            : "Enable quick delete",
          action: onToggleQuickDelete,
          icon: quickDeleteEnabled ? (
            <HiOutlineBolt className="h-[16px] w-[16px] text-yellow-500" />
          ) : (
            <HiOutlineShieldCheck className="h-[16px] w-[16px] text-dark-900" />
          ),
        },
        {
          label: isTemplate ? "Delete template" : "Delete board",
          action: () => openModal("DELETE_BOARD"),
          icon: <HiOutlineTrash className="h-[16px] w-[16px] text-dark-900" />,
        },
      ]}
    >
      <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
    </Dropdown>
  );
}

import { t } from "@lingui/core/macro";
import { useState } from "react";
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
}: {
  isTemplate: boolean;
  isLoading: boolean;
  boardPublicId: string;
  workspacePublicId: string;
}) {
  const { openModal } = useModal();

  // Quick delete toggle state with localStorage persistence
  const [quickDeleteEnabled, setQuickDeleteEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("quick-delete-enabled") === "true";
  });

  const toggleQuickDelete = () => {
    setQuickDeleteEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("quick-delete-enabled", String(newValue));
      return newValue;
    });
  };

  return (
    <Dropdown
      disabled={isLoading}
      items={[
        ...(isTemplate
          ? []
          : [
              {
                label: t`Make template`,
                action: () => openModal("CREATE_TEMPLATE"),
                icon: (
                  <HiOutlineDocumentDuplicate className="h-[16px] w-[16px] text-dark-900" />
                ),
              },
              {
                label: t`Edit board URL`,
                action: () => openModal("UPDATE_BOARD_SLUG"),
                icon: <HiLink className="h-[16px] w-[16px] text-dark-900" />,
              },
            ]),
        {
          label: quickDeleteEnabled
            ? t`Disable quick delete ⚡`
            : t`Enable quick delete`,
          action: toggleQuickDelete,
          icon: quickDeleteEnabled ? (
            <HiOutlineBolt className="h-[16px] w-[16px] text-yellow-500" />
          ) : (
            <HiOutlineShieldCheck className="h-[16px] w-[16px] text-dark-900" />
          ),
        },
        {
          label: isTemplate ? t`Delete template` : t`Delete board`,
          action: () => openModal("DELETE_BOARD"),
          icon: <HiOutlineTrash className="h-[16px] w-[16px] text-dark-900" />,
        },
      ]}
    >
      <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
    </Dropdown>
  );
}

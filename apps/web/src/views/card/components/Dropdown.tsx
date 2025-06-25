import { t } from "@lingui/core/macro";
import { HiEllipsisHorizontal, HiOutlineTrash } from "react-icons/hi2";

import Dropdown from "~/components/Dropdown";
import { useModal } from "~/providers/modal";

export default function BoardDropdown() {
  const { openModal } = useModal();

  return (
    <Dropdown
      items={[
        {
          label: t`Delete card`,
          action: () => openModal("DELETE_CARD"),
          icon: <HiOutlineTrash className="h-[16px] w-[16px] text-dark-900" />,
        },
      ]}
    >
      <HiEllipsisHorizontal className="h-6 w-6 text-dark-900" />
    </Dropdown>
  );
}

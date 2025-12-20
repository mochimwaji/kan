import {
  HiEllipsisHorizontal,
  HiOutlineCheckCircle,
  HiOutlineTrash,
} from "react-icons/hi2";

import Dropdown from "~/components/Dropdown";
import { useModal } from "~/providers/modal";

export default function BoardDropdown() {
  const { openModal } = useModal();

  return (
    <Dropdown
      items={[
        {
          label: "Add checklist",
          action: () => openModal("ADD_CHECKLIST"),
          icon: (
            <HiOutlineCheckCircle className="h-[16px] w-[16px] text-dark-900" />
          ),
        },
        {
          label: "Delete card",
          action: () => openModal("DELETE_CARD"),
          icon: <HiOutlineTrash className="h-[16px] w-[16px] text-dark-900" />,
        },
      ]}
    >
      <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
    </Dropdown>
  );
}

import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { useCallback, useEffect, useState } from "react";
import { Draggable } from "react-beautiful-dnd";
import { useForm } from "react-hook-form";
import {
  HiChevronDown,
  HiChevronRight,
  HiEllipsisHorizontal,
  HiOutlinePaintBrush,
  HiOutlinePlusSmall,
  HiOutlineSquaresPlus,
  HiOutlineTrash,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import CollapsibleSection from "~/components/CollapsibleSection";
import Dropdown from "~/components/Dropdown";
import ListColorPicker from "~/components/ListColorPicker";
import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";
import { deriveListBackground } from "~/utils/colorUtils";

interface ListProps {
  children: ReactNode;
  index: number;
  list: List;
  cardCount: number;
  setSelectedPublicListId: (publicListId: PublicListId) => void;
}

interface List {
  publicId: string;
  name: string;
  color?: string | null;
}

interface FormValues {
  listPublicId: string;
  name: string;
}

type PublicListId = string;

// localStorage key prefix for list collapse state
const COLLAPSE_STORAGE_KEY_PREFIX = "list-collapsed-";

export default function List({
  children,
  index,
  list,
  cardCount,
  setSelectedPublicListId,
}: ListProps) {
  const { openModal } = useModal();
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // Collapse state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Only access localStorage on client-side
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem(`${COLLAPSE_STORAGE_KEY_PREFIX}${list.publicId}`) ===
      "true"
    );
  });

  // Sync collapse state to localStorage
  useEffect(() => {
    localStorage.setItem(
      `${COLLAPSE_STORAGE_KEY_PREFIX}${list.publicId}`,
      String(isCollapsed),
    );
  }, [isCollapsed, list.publicId]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const openNewCardForm = (publicListId: PublicListId) => {
    openModal("NEW_CARD");
    setSelectedPublicListId(publicListId);
  };

  const utils = api.useUtils();
  const updateList = api.list.update.useMutation({
    onSuccess: () => {
      utils.board.byId.invalidate();
    },
  });

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      listPublicId: list.publicId,
      name: list.name,
    },
    values: {
      listPublicId: list.publicId,
      name: list.name,
    },
  });

  const onSubmit = (values: FormValues) => {
    updateList.mutate({
      listPublicId: values.listPublicId,
      name: values.name,
    });
  };

  const handleOpenDeleteListConfirmation = () => {
    setSelectedPublicListId(list.publicId);
    openModal("DELETE_LIST");
  };

  const handleColorSelect = useCallback(
    (color: string | null) => {
      updateList.mutate({
        listPublicId: list.publicId,
        color,
      });
    },
    [list.publicId, updateList],
  );

  // Compute background style based on list color
  const listStyle = list.color
    ? { backgroundColor: deriveListBackground(list.color) }
    : undefined;

  return (
    <Draggable key={list.publicId} draggableId={list.publicId} index={index}>
      {(provided) => (
        <div
          key={list.publicId}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={twMerge(
            "mr-5 h-fit min-w-[18rem] max-w-[18rem] rounded-md border py-2 pl-2 pr-1",
            list.color
              ? "border-opacity-50"
              : "border-light-400 bg-light-300 dark:border-dark-300 dark:bg-dark-100",
          )}
          style={{
            ...provided.draggableProps.style,
            ...listStyle,
            color: "var(--kan-pages-text)",
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            {/* Collapse toggle button */}
            <button
              onClick={toggleCollapse}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded hover:bg-light-400 dark:hover:bg-dark-200"
              aria-label={isCollapsed ? t`Expand list` : t`Collapse list`}
            >
              {isCollapsed ? (
                <HiChevronRight
                  className="h-4 w-4"
                  style={{ color: "var(--kan-pages-text)" }}
                />
              ) : (
                <HiChevronDown
                  className="h-4 w-4"
                  style={{ color: "var(--kan-pages-text)" }}
                />
              )}
            </button>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="min-w-0 flex-1 focus-visible:outline-none"
            >
              <input
                id="name"
                type="text"
                {...register("name")}
                onBlur={handleSubmit(onSubmit)}
                className="w-full border-0 bg-transparent px-2 pt-1 text-sm font-medium focus:ring-0 focus-visible:outline-none"
                style={{ color: "var(--kan-pages-text)" }}
              />
            </form>
            {/* Card count badge - shown when collapsed */}
            {isCollapsed && cardCount > 0 && (
              <span
                className="mr-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-light-400 px-1.5 text-[10px] font-medium dark:bg-dark-300"
                style={{ color: "var(--kan-pages-text)" }}
              >
                {cardCount}
              </span>
            )}
            <div className="flex items-center">
              <button
                className="mx-1 inline-flex h-fit items-center rounded-md p-1 px-1 text-sm font-semibold text-dark-50 hover:bg-light-400 dark:hover:bg-dark-200"
                onClick={() => openNewCardForm(list.publicId)}
              >
                <HiOutlinePlusSmall
                  className="h-5 w-5"
                  style={{ color: "var(--kan-pages-text)" }}
                  aria-hidden="true"
                />
              </button>
              <div className="relative mr-1 inline-block">
                <Dropdown
                  items={[
                    {
                      label: t`Add a card`,
                      action: () => openNewCardForm(list.publicId),
                      icon: (
                        <HiOutlineSquaresPlus
                          className="h-[18px] w-[18px]"
                          style={{ color: "var(--kan-menu-text)" }}
                        />
                      ),
                    },
                    {
                      label: t`Set color`,
                      action: () => setIsColorPickerOpen(true),
                      icon: (
                        <HiOutlinePaintBrush
                          className="h-[18px] w-[18px]"
                          style={{ color: "var(--kan-menu-text)" }}
                        />
                      ),
                    },
                    {
                      label: t`Delete list`,
                      action: handleOpenDeleteListConfirmation,
                      icon: (
                        <HiOutlineTrash
                          className="h-[18px] w-[18px]"
                          style={{ color: "var(--kan-menu-text)" }}
                        />
                      ),
                    },
                  ]}
                >
                  <HiEllipsisHorizontal
                    className="h-5 w-5"
                    style={{ color: "var(--kan-pages-text)" }}
                  />
                </Dropdown>
                {isColorPickerOpen && (
                  <ListColorPicker
                    currentColor={list.color ?? null}
                    onColorSelect={handleColorSelect}
                    onClose={() => setIsColorPickerOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>
          <CollapsibleSection isOpen={!isCollapsed}>
            {children}
          </CollapsibleSection>
        </div>
      )}
    </Draggable>
  );
}

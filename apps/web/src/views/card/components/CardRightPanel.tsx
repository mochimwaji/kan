import { useRouter } from "next/router";
import { useRef } from "react";
import {
  HiOutlineCalendar,
  HiOutlineRectangleStack,
  HiOutlineTag,
  HiOutlineUsers,
} from "react-icons/hi2";

import Avatar from "~/components/Avatar";
import LabelIcon from "~/components/LabelIcon";
import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import { DueDateSelector } from "./DueDateSelector";
import LabelSelector from "./LabelSelector";
import ListSelector from "./ListSelector";
import MemberSelector from "./MemberSelector";

function SidebarSectionHeader({
  icon,
  title,
  isCollapsed,
}: {
  icon: React.ReactNode;
  title: string;
  isCollapsed?: boolean;
}) {
  return (
    <div
      className={`flex h-[34px] w-full items-center gap-2 rounded-[5px] ${
        isCollapsed ? "justify-center" : "pl-2"
      } hover:bg-light-200 dark:hover:bg-dark-100`}
    >
      <div className="flex h-5 w-5 items-center justify-center">{icon}</div>
      {!isCollapsed && <p className="text-sm font-medium">{title}</p>}
    </div>
  );
}

export function CardRightPanel({
  isTemplate,
  isCollapsed = false,
  cardPublicId: propCardPublicId,
}: {
  isTemplate?: boolean;
  isCollapsed?: boolean;
  cardPublicId?: string;
}) {
  const router = useRouter();
  const cardPublicId =
    propCardPublicId ??
    (Array.isArray(router.query.cardId)
      ? router.query.cardId[0]
      : router.query.cardId) ??
    "";

  const { data: card } = api.card.byId.useQuery(
    {
      cardPublicId: cardPublicId,
    },
    { enabled: !!cardPublicId },
  );

  const board = card?.list.board;
  const labels = board?.labels;
  const workspaceMembers = board?.workspace.members;
  const selectedLabels = card?.labels;
  const selectedMembers = card?.members;

  const listSelectorRef = useRef<HTMLDivElement>(null);
  const labelSelectorRef = useRef<HTMLDivElement>(null);
  const memberSelectorRef = useRef<HTMLDivElement>(null);
  const dueDateSelectorRef = useRef<HTMLDivElement>(null);

  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "l" },
    action: () => listSelectorRef.current?.click(),
    description: "List selector",
    group: "CARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "k" },
    action: () => labelSelectorRef.current?.click(),
    description: "Labels selector",
    group: "CARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "j" },
    action: () => memberSelectorRef.current?.click(),
    description: "Members selector",
    group: "CARD_VIEW",
  });
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "d" },
    action: () => dueDateSelectorRef.current?.click(),
    description: "Due date picker",
    group: "CARD_VIEW",
  });

  const formattedLabels =
    labels?.map((label) => {
      const isSelected = selectedLabels?.some(
        (selectedLabel) => selectedLabel.publicId === label.publicId,
      );

      return {
        key: label.publicId,
        value: label.name,
        selected: isSelected ?? false,
        leftIcon: <LabelIcon colourCode={label.colourCode} />,
      };
    }) ?? [];

  const formattedLists =
    board?.lists.map((list) => ({
      key: list.publicId,
      value: list.name,
      selected: list.publicId === card?.list.publicId,
    })) ?? [];

  const formattedMembers =
    workspaceMembers?.map((member) => {
      const isSelected = selectedMembers?.some(
        (assignedMember) => assignedMember.publicId === member.publicId,
      );

      return {
        key: member.publicId,
        value: formatMemberDisplayName(
          member.user?.name ?? null,
          member.user?.email ?? member.email,
        ),
        imageUrl: member.user?.image
          ? getAvatarUrl(member.user.image)
          : undefined,
        selected: isSelected ?? false,
        leftIcon: (
          <Avatar
            size="xs"
            name={member.user?.name ?? ""}
            imageUrl={
              member.user?.image ? getAvatarUrl(member.user.image) : undefined
            }
            email={member.user?.email ?? member.email}
          />
        ),
      };
    }) ?? [];

  if (isCollapsed) {
    return (
      <div
        className="flex h-full w-full flex-col"
        style={{
          backgroundColor: "var(--kan-sidebar-bg)",
          color: "var(--kan-sidebar-text)",
        }}
      >
        <div className="mx-1 mb-4 hidden w-auto border-b border-light-300 dark:border-dark-400 md:block" />
        <div className="relative inline-block w-full pb-3" aria-hidden="true">
          <div className="flex flex-col-reverse items-center">
            <div className="mb-1.5 h-9 w-9" />
            <div className="mb-2 h-9 w-9" />
          </div>
        </div>
        <ul role="list" className="flex flex-col items-center space-y-1">
          <li>
            <ListSelector
              cardPublicId={cardPublicId}
              lists={formattedLists}
              isLoading={!card}
              isCollapsed
            >
              <SidebarSectionHeader
                icon={<HiOutlineRectangleStack size={20} />}
                title={"List"}
                isCollapsed
              />
            </ListSelector>
          </li>
          <li>
            <LabelSelector
              cardPublicId={cardPublicId}
              labels={formattedLabels}
              isLoading={!card}
              isCollapsed
            >
              <SidebarSectionHeader
                icon={<HiOutlineTag size={20} />}
                title={"Labels"}
                isCollapsed
              />
            </LabelSelector>
          </li>
          {!isTemplate && (
            <li>
              <MemberSelector
                cardPublicId={cardPublicId}
                members={formattedMembers}
                isLoading={!card}
                isCollapsed
              >
                <SidebarSectionHeader
                  icon={<HiOutlineUsers size={20} />}
                  title={"Members"}
                  isCollapsed
                />
              </MemberSelector>
            </li>
          )}
          <li>
            <DueDateSelector
              cardPublicId={cardPublicId}
              dueDate={card?.dueDate}
              isLoading={!card}
              isCollapsed
            >
              <SidebarSectionHeader
                icon={<HiOutlineCalendar size={20} />}
                title={"Due date"}
                isCollapsed
              />
            </DueDateSelector>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div
      className="h-full w-full"
      style={{
        backgroundColor: "var(--kan-sidebar-bg)",
        color: "var(--kan-sidebar-text)",
      }}
    >
      <div className="mx-1 mb-4 hidden w-auto border-b border-light-300 dark:border-dark-400 md:block" />
      <div
        className="relative inline-block w-full px-2 pb-3"
        aria-hidden="true"
      >
        <div className="flex items-center justify-start gap-1">
          <div className="mb-1 h-[34px] flex-1" />
          <div className="mb-1 h-[34px] w-[34px]" />
        </div>
      </div>
      <ul role="list" className="space-y-1 px-2">
        <li>
          <ListSelector
            cardPublicId={cardPublicId}
            lists={formattedLists}
            isLoading={!card}
          >
            <div ref={listSelectorRef}>
              <SidebarSectionHeader
                icon={<HiOutlineRectangleStack size={20} />}
                title={"List"}
              />
            </div>
          </ListSelector>
        </li>
        <li>
          <LabelSelector
            cardPublicId={cardPublicId}
            labels={formattedLabels}
            isLoading={!card}
          >
            <div ref={labelSelectorRef}>
              <SidebarSectionHeader
                icon={<HiOutlineTag size={20} />}
                title={"Labels"}
              />
            </div>
          </LabelSelector>
        </li>
        {!isTemplate && (
          <li>
            <MemberSelector
              cardPublicId={cardPublicId}
              members={formattedMembers}
              isLoading={!card}
            >
              <div ref={memberSelectorRef}>
                <SidebarSectionHeader
                  icon={<HiOutlineUsers size={20} />}
                  title={"Members"}
                />
              </div>
            </MemberSelector>
          </li>
        )}
        <li>
          <DueDateSelector
            cardPublicId={cardPublicId}
            dueDate={card?.dueDate}
            isLoading={!card}
          >
            <div ref={dueDateSelectorRef}>
              <SidebarSectionHeader
                icon={<HiOutlineCalendar size={20} />}
                title={"Due date"}
              />
            </div>
          </DueDateSelector>
        </li>
      </ul>
    </div>
  );
}

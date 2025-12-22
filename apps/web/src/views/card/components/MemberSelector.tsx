import { useRouter } from "next/router";
import { HiMiniPlus } from "react-icons/hi2";

import Avatar from "~/components/Avatar";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface MemberSelectorProps {
  cardPublicId: string;
  members: {
    key: string;
    value: string;
    selected: boolean;
    leftIcon: React.ReactNode;
    imageUrl: string | undefined;
  }[];
  isLoading: boolean;
  isCollapsed?: boolean;
  children?: React.ReactNode;
}

export default function MemberSelector({
  cardPublicId,
  members,
  isLoading,
   
  isCollapsed: _isCollapsed = false,
  children,
}: MemberSelectorProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const { openModal } = useModal();
  const { showPopup } = usePopup();

  const addOrRemoveMember = api.card.addOrRemoveMember.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel();

      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;

        const hasMember = oldCard.members.some(
          (member) => member.publicId === update.workspaceMemberPublicId,
        );

        const memberToAdd = oldCard.members.find(
          (member) => member.publicId === update.workspaceMemberPublicId,
        );

        const updatedMembers = hasMember
          ? oldCard.members.filter(
              (member) => member.publicId !== update.workspaceMemberPublicId,
            )
          : [
              ...oldCard.members,
              {
                publicId: update.workspaceMemberPublicId,
                email: memberToAdd?.email ?? "",
                deletedAt: null,
                user: {
                  id: memberToAdd?.user?.id ?? "",
                  name: memberToAdd?.user?.name ?? "",
                },
              },
            ];

        return {
          ...oldCard,
          members: updatedMembers,
        };
      });

      return { previousCard };
    },
    onError: (_error, _newList, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: "Unable to update members",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId });
    },
  });

  const selectedMembers = members.filter((member) => member.selected);

  const handleInviteMember = async () => {
    await router.push(`/members`);
    openModal("INVITE_MEMBER");
  };

  if (isLoading) {
    return (
      <div className="flex w-full">
        <div className="h-full w-[125px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
      </div>
    );
  }

  // When children are provided, use them as the trigger (clickable header pattern)
  if (children) {
    return (
      <CheckboxDropdown
        items={members}
        handleSelect={(_, member) => {
          addOrRemoveMember.mutate({
            cardPublicId,
            workspaceMemberPublicId: member.key,
          });
        }}
        handleCreate={handleInviteMember}
        createNewItemLabel={"Invite member"}
        asChild
      >
        {children}
      </CheckboxDropdown>
    );
  }

  // Fallback: original behavior
  return (
    <CheckboxDropdown
      items={members}
      handleSelect={(_, member) => {
        addOrRemoveMember.mutate({
          cardPublicId,
          workspaceMemberPublicId: member.key,
        });
      }}
      handleCreate={handleInviteMember}
      createNewItemLabel={"Invite member"}
      asChild
    >
      <div className="flex h-full w-full items-center rounded-[5px] border-[1px] border-light-50 py-1 pl-2 text-left text-xs hover:border-light-300 hover:bg-light-200 dark:border-dark-50 dark:hover:border-dark-200 dark:hover:bg-dark-100">
        {selectedMembers.length ? (
          <div className="isolate flex justify-end -space-x-1 overflow-hidden">
            {selectedMembers.map(({ value, imageUrl }) => (
              <Avatar
                key={value}
                size="sm"
                name={value}
                imageUrl={imageUrl}
                email={value}
              />
            ))}
          </div>
        ) : (
          <>
            <HiMiniPlus size={22} className="pr-2" />
            {"Add member"}
          </>
        )}
      </div>
    </CheckboxDropdown>
  );
}

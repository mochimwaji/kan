import { zodResolver } from "@hookform/resolvers/zod";
import { env } from "next-runtime-env";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  HiInformationCircle,
  HiMiniCheck,
  HiOutlineDocumentDuplicate,
  HiXMark,
} from "react-icons/hi2";
import { z } from "zod";

import type { InviteMemberInput } from "@kan/api/types";

import Button from "~/components/Button";
import Input from "~/components/Input";
import Toggle from "~/components/Toggle";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export function InviteMemberForm({ userId }: { userId: string | undefined }) {
  const utils = api.useUtils();
  const [isShareInviteLinkEnabled, setIsShareInviteLinkEnabled] =
    useState(false);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [_isLoadingInviteLink, setIsLoadingInviteLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const { closeModal } = useModal();
  const { workspace } = useWorkspace();
  const { showPopup } = usePopup();

  const isEmailEnabled = env("NEXT_PUBLIC_DISABLE_EMAIL") !== "true";

  const InviteMemberSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    workspacePublicId: z.string(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    defaultValues: {
      email: "",
      workspacePublicId: workspace.publicId || "",
    },
    resolver: zodResolver(InviteMemberSchema),
  });

  const refetchBoards = () => utils.board.all.refetch();

  // Fetch active invite link on component mount
  const { data: activeInviteLink } = api.member.getActiveInviteLink.useQuery(
    { workspacePublicId: workspace.publicId || "" },
    { enabled: !!workspace.publicId },
  );

  // Set initial state based on active invite link
  useEffect(() => {
    if (activeInviteLink) {
      setIsShareInviteLinkEnabled(activeInviteLink.isActive);
      setInviteLink(activeInviteLink.inviteLink ?? "");
    }
  }, [activeInviteLink]);

  const inviteMember = api.member.invite.useMutation({
    onSuccess: async () => {
      closeModal();
      await utils.workspace.byId.refetch();
      await refetchBoards();
    },
    onError: (error) => {
      reset();
      if (!isShareInviteLinkEnabled) closeModal();

      if (error.data?.code === "CONFLICT") {
        showPopup({
          header: "Error inviting member",
          message: "User is already a member of this workspace",
          icon: "error",
        });
      } else {
        showPopup({
          header: "Error inviting member",
          message: "Please try again later, or contact customer support.",
          icon: "error",
        });
      }
    },
  });

  const createInviteLink = api.member.createInviteLink.useMutation({
    onSuccess: (data) => {
      setInviteLink(data.inviteLink);
      setIsLoadingInviteLink(false);
    },
    onError: () => {
      setIsLoadingInviteLink(false);
      setIsShareInviteLinkEnabled(false);
      showPopup({
        header: "Error creating invite link",
        message: "Please try again later.",
        icon: "error",
      });
    },
  });

  const deactivateInviteLink = api.member.deactivateInviteLink.useMutation({
    onSuccess: () => {
      setInviteLink("");
      setIsLoadingInviteLink(false);
    },
    onError: () => {
      setIsLoadingInviteLink(false);
      showPopup({
        header: "Error deactivating invite link",
        message: "Please try again later.",
        icon: "error",
      });
    },
  });

  const onSubmit = (member: InviteMemberInput) => {
    inviteMember.mutate(member);
  };

  const handleInviteLinkToggle = async () => {
    setIsLoadingInviteLink(true);

    if (isShareInviteLinkEnabled && workspace.publicId) {
      // Deactivate invite link
      await deactivateInviteLink.mutateAsync({
        workspacePublicId: workspace.publicId,
      });
      setIsShareInviteLinkEnabled(false);
    } else {
      // Create new invite link
      await createInviteLink.mutateAsync({
        workspacePublicId: workspace.publicId,
      });
      setIsShareInviteLinkEnabled(true);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showPopup({
        header: "Invite link copied",
        message: "Invite link copied to clipboard",
        icon: "success",
      });
    } catch {
      showPopup({
        header: "Error",
        message: "Failed to copy invite link",
        icon: "error",
      });
    }
  };

  useEffect(() => {
    const emailElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#email");
    if (emailElement) emailElement.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div
          className="flex w-full items-center justify-between pb-4"
          style={{ color: "var(--kan-menu-text)" }}
        >
          <h2 className="text-sm font-bold">{"Add member"}</h2>
          <button
            type="button"
            className="hover:bg-li ght-300 rounded p-1 focus:outline-none dark:hover:bg-dark-300"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <HiXMark size={18} style={{ color: "var(--kan-menu-text)" }} />
          </button>
        </div>
        {isEmailEnabled && (
          <Input
            id="email"
            placeholder={"Email"}
            {...register("email", { required: true })}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                await handleSubmit(onSubmit)();
              }
            }}
            errorMessage={errors.email?.message}
          />
        )}
        {(!isEmailEnabled || (isShareInviteLinkEnabled && inviteLink)) && (
          <div className="my-4">
            <div className="relative">
              <Input
                value={inviteLink}
                className="pr-10 text-sm text-light-900 dark:text-dark-900"
                readOnly
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                style={{ color: "var(--kan-menu-text)" }}
                onClick={copyToClipboard}
              >
                {copied ? (
                  <HiMiniCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <HiOutlineDocumentDuplicate className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="mt-2 flex items-start gap-1">
              <HiInformationCircle
                className="mt-0.5 h-4 w-4"
                style={{ color: "var(--kan-menu-text)" }}
              />
              <p
                className="text-xs"
                style={{ color: "var(--kan-menu-text)", opacity: 0.7 }}
              >
                {"Anyone with this link can join your workspace"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <Toggle
          label={
            isShareInviteLinkEnabled
              ? "Deactivate invite link"
              : "Create invite link"
          }
          isChecked={isShareInviteLinkEnabled}
          onChange={handleInviteLinkToggle}
        />
        <div>
          <Button
            type="submit"
            disabled={inviteMember.isPending || !isEmailEnabled}
            isLoading={inviteMember.isPending}
          >
            {"Invite member"}
          </Button>
        </div>
      </div>
    </form>
  );
}

import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { formatDistanceToNow } from "date-fns";
import { de, enGB, es, fr, it, nl } from "date-fns/locale";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTag,
  HiOutlineUserMinus,
  HiOutlineUserPlus,
} from "react-icons/hi2";

import type { GetCardByIdOutput } from "@kan/api/types";
import { authClient } from "@kan/auth/client";

import Avatar from "~/components/Avatar";
import { useLocalisation } from "~/hooks/useLocalisation";
import Comment from "./Comment";

type ActivityType =
  NonNullable<GetCardByIdOutput>["activities"][number]["type"];

const dateLocaleMap = {
  en: enGB,
  fr: fr,
  de: de,
  es: es,
  it: it,
  nl: nl,
} as const;

const getActivityText = ({
  type,
  toTitle,
  fromList,
  toList,
  memberName,
  isSelf,
  label,
}: {
  type: ActivityType;
  toTitle: string | null;
  fromList: string | null;
  toList: string | null;
  memberName: string | null;
  isSelf: boolean;
  label: string | null;
}) => {
  const ACTIVITY_TYPE_MAP = {
    "card.created": t`created the card`,
    "card.updated.title": t`updated the title`,
    "card.updated.description": t`updated the description`,
    "card.updated.list": t`moved the card to another list`,
    "card.updated.label.added": t`added a label to the card`,
    "card.updated.label.removed": t`removed a label from the card`,
    "card.updated.member.added": t`added a member to the card`,
    "card.updated.member.removed": t`removed a member from the card`,
  } as const;

  if (!(type in ACTIVITY_TYPE_MAP)) return null;
  const baseText = ACTIVITY_TYPE_MAP[type as keyof typeof ACTIVITY_TYPE_MAP];

  const TextHighlight = ({ children }: { children: React.ReactNode }) => (
    <span className="font-medium text-light-1000 dark:text-dark-1000">
      {children}
    </span>
  );

  if (type === "card.updated.title" && toTitle) {
    return (
      <Trans>
        updated the title to <TextHighlight>{toTitle}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.list" && fromList && toList) {
    return (
      <Trans>
        moved the card from <TextHighlight>{fromList}</TextHighlight> to
        <TextHighlight>{toList}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.member.added" && memberName) {
    if (isSelf) return <Trans>self-assigned the card</Trans>;

    return (
      <Trans>
        assigned <TextHighlight>{memberName}</TextHighlight> to the card
      </Trans>
    );
  }

  if (type === "card.updated.member.removed" && memberName) {
    if (isSelf) return <Trans>unassigned themselves from the card</Trans>;

    return (
      <Trans>
        unassigned <TextHighlight>{memberName}</TextHighlight> from the card
      </Trans>
    );
  }

  if (type === "card.updated.label.added" && label) {
    return (
      <Trans>
        added label <TextHighlight>{label}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.label.removed" && label) {
    return (
      <Trans>
        removed label <TextHighlight>{label}</TextHighlight>
      </Trans>
    );
  }

  return baseText;
};

const ACTIVITY_ICON_MAP: Partial<Record<ActivityType, React.ReactNode | null>> =
  {
    "card.created": <HiOutlinePlus />,
    "card.updated.title": <HiOutlinePencil />,
    "card.updated.description": <HiOutlinePencil />,
    "card.updated.label.added": <HiOutlineTag />,
    "card.updated.label.removed": <HiOutlineTag />,
    "card.updated.member.added": <HiOutlineUserPlus />,
    "card.updated.member.removed": <HiOutlineUserMinus />,
  } as const;

const getActivityIcon = (
  type: ActivityType,
  fromIndex?: number | null,
  toIndex?: number | null,
): React.ReactNode | null => {
  if (type === "card.updated.list" && fromIndex != null && toIndex != null) {
    return fromIndex > toIndex ? (
      <HiOutlineArrowLeft />
    ) : (
      <HiOutlineArrowRight />
    );
  }
  return ACTIVITY_ICON_MAP[type] ?? null;
};

const ActivityList = ({
  activities,
  cardPublicId,
  isLoading,
  isAdmin,
}: {
  activities: NonNullable<GetCardByIdOutput>["activities"];
  cardPublicId: string;
  isLoading: boolean;
  isAdmin?: boolean;
}) => {
  const { data } = authClient.useSession();
  const { locale } = useLocalisation();

  const currentDateLocale = dateLocaleMap[locale] || enGB;

  return (
    <div className="flex flex-col space-y-4 pt-4">
      {activities.map((activity, index) => {
        const activityText = getActivityText({
          type: activity.type,
          toTitle: activity.toTitle,
          fromList: activity.fromList?.name ?? null,
          toList: activity.toList?.name ?? null,
          memberName: activity.member?.user?.name ?? null,
          isSelf: activity.member?.user?.id === data?.user.id,
          label: activity.label?.name ?? null,
        });

        if (activity.type === "card.updated.comment.added")
          return (
            <Comment
              key={activity.publicId}
              publicId={activity.comment?.publicId}
              cardPublicId={cardPublicId}
              name={activity.user?.name ?? ""}
              email={activity.user?.email ?? ""}
              isLoading={isLoading}
              createdAt={activity.createdAt.toISOString()}
              comment={activity.comment?.comment}
              isEdited={!!activity.comment?.updatedAt}
              isAuthor={activity.comment?.createdBy === data?.user.id}
              isAdmin={isAdmin ?? false}
            />
          );

        if (!activityText) return null;

        return (
          <div
            key={activity.publicId}
            className="relative flex items-center space-x-2"
          >
            <div className="relative">
              <Avatar
                size="sm"
                name={activity.user?.name ?? ""}
                email={activity.user?.email ?? ""}
                icon={getActivityIcon(
                  activity.type,
                  activity.fromList?.index,
                  activity.toList?.index,
                )}
                isLoading={isLoading}
              />
              {index !== activities.length - 1 &&
                activities[index + 1]?.type !==
                  "card.updated.comment.added" && (
                  <div className="absolute bottom-[-14px] left-1/2 top-[30px] w-0.5 -translate-x-1/2 bg-light-600 dark:bg-dark-600" />
                )}
            </div>
            <p className="text-sm">
              <span className="font-medium dark:text-dark-1000">{`${activity.user?.name} `}</span>
              <span className="space-x-1 text-light-900 dark:text-dark-800">
                {activityText}
              </span>
              <span className="mx-1 text-light-900 dark:text-dark-800">·</span>
              <span className="space-x-1 text-light-900 dark:text-dark-800">
                {formatDistanceToNow(new Date(activity.createdAt), {
                  addSuffix: true,
                  locale: currentDateLocale,
                })}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityList;

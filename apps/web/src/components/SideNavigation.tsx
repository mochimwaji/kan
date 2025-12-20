import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@headlessui/react";
import { env } from "next-runtime-env";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
} from "react-icons/tb";
import { twMerge } from "tailwind-merge";

import type { KeyboardShortcut } from "~/providers/keyboard-shortcuts";
import boardsIconDark from "~/assets/boards-dark.json";
import boardsIconLight from "~/assets/boards-light.json";
import membersIconDark from "~/assets/members-dark.json";
import membersIconLight from "~/assets/members-light.json";
import settingsIconDark from "~/assets/settings-dark.json";
import settingsIconLight from "~/assets/settings-light.json";
import templatesIconDark from "~/assets/templates-dark.json";
import templatesIconLight from "~/assets/templates-light.json";
import ButtonComponent from "~/components/Button";
import ReactiveButton from "~/components/ReactiveButton";
import UserMenu from "~/components/UserMenu";
import WorkspaceMenu from "~/components/WorkspaceMenu";
import { useColorTheme } from "~/providers/colorTheme";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { getContrastColor } from "~/utils/colorUtils";
import { getPresetColors } from "~/utils/themePresets";

interface SideNavigationProps {
  user: UserType;
  isLoading: boolean;
  onCloseSideNav?: () => void;
}

interface UserType {
  email?: string | null | undefined;
  image?: string | null | undefined;
}

export default function SideNavigation({
  user,
  isLoading,
  onCloseSideNav,
}: SideNavigationProps) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitialised, setIsInitialised] = useState(false);
  const { openModal } = useModal();

  const { data: workspaceData } = api.workspace.byId.useQuery({
    workspacePublicId: workspace.publicId,
  });

  useEffect(() => {
    const savedState = localStorage.getItem("kan_sidebar-collapsed");
    if (savedState !== null) {
      setIsCollapsed(Boolean(JSON.parse(savedState)));
    }
    setIsInitialised(true);
  }, []);

  useEffect(() => {
    if (isInitialised) {
      localStorage.setItem(
        "kan_sidebar-collapsed",
        JSON.stringify(isCollapsed),
      );
    }
  }, [isCollapsed, isInitialised]);

  const { pathname } = router;

  const { resolvedTheme } = useTheme();

  const { themeColors } = useColorTheme();

  // Calculate if the sidebar specific color is dark
  const sidebarColor =
    themeColors.preset === "custom"
      ? themeColors.sidebar
      : getPresetColors(themeColors.preset, "light").sidebar; // Assuming light mode for base preset colors as dark mode is forced off

  // If contrast color is white, then background is dark
  const isSidebarDark = getContrastColor(sidebarColor) === "#ffffff";

  const isDarkMode = isSidebarDark;

  const navigation: {
    name: string;
    href: string;
    icon: object;
    keyboardShortcut: KeyboardShortcut;
  }[] = [
    {
      name: "Boards",
      href: "/boards",
      icon: isDarkMode ? boardsIconDark : boardsIconLight,
      keyboardShortcut: {
        type: "PRESS",
        stroke: { key: "b" },
        action: () => router.push("/boards"),
        group: "NAVIGATION",
        description: "Go to boards",
      },
    },
    {
      name: "Templates",
      href: "/templates",
      icon: isDarkMode ? templatesIconDark : templatesIconLight,
      keyboardShortcut: {
        type: "PRESS",
        stroke: { key: "t" },
        action: () => router.push("/templates"),
        group: "NAVIGATION",
        description: "Go to templates",
      },
    },
    {
      name: "Members",
      href: "/members",
      icon: isDarkMode ? membersIconDark : membersIconLight,
      keyboardShortcut: {
        type: "PRESS",
        stroke: { key: "m" },
        action: () => router.push("/members"),
        group: "NAVIGATION",
        description: "Go to members",
      },
    },
    {
      name: "Settings",
      href: "/settings",
      icon: isDarkMode ? settingsIconDark : settingsIconLight,
      keyboardShortcut: {
        type: "PRESS",
        stroke: { key: "s" },
        action: () => router.push("/settings"),
        group: "NAVIGATION",
        description: "Go to settings",
      },
    },
  ];

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      <nav
        className={twMerge(
          "flex h-full w-64 flex-col justify-between overflow-hidden border-r border-light-300 p-3 transition-all duration-300 ease-in-out dark:border-dark-300 md:border-r-0 md:py-0 md:pl-0",
          isCollapsed && "md:w-14",
        )}
        style={{ backgroundColor: "var(--kan-sidebar-bg)" }}
      >
        <div>
          <div className="hidden h-[45px] items-center justify-between md:flex">
            {!isCollapsed && (
              <Link href="/" className="block">
                <h1
                  className="pl-2 text-[16px] font-bold tracking-tight"
                  style={{ color: "var(--kan-sidebar-text)" }}
                >
                  kan.bn
                </h1>
              </Link>
            )}
            <Button
              onClick={toggleCollapse}
              className={twMerge(
                "flex h-8 items-center justify-center rounded-md hover:bg-light-200 dark:hover:bg-dark-200",
                isCollapsed ? "w-full" : "w-8",
              )}
            >
              {isCollapsed ? (
                <TbLayoutSidebarLeftExpand
                  size={18}
                  style={{ color: "var(--kan-sidebar-text)", opacity: 0.7 }}
                />
              ) : (
                <TbLayoutSidebarLeftCollapse
                  size={18}
                  style={{ color: "var(--kan-sidebar-text)", opacity: 0.7 }}
                />
              )}
            </Button>
          </div>
          <div className="mx-1 mb-4 hidden w-auto border-b border-light-300 dark:border-dark-400 md:block" />

          <WorkspaceMenu isCollapsed={isCollapsed} />
          <ul role="list" className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <ReactiveButton
                  href={item.href}
                  current={pathname.includes(item.href)}
                  name={item.name}
                  json={item.icon}
                  isCollapsed={isCollapsed}
                  onCloseSideNav={onCloseSideNav}
                  keyboardShortcut={item.keyboardShortcut}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <UserMenu
            email={user.email ?? ""}
            imageUrl={user.image ?? undefined}
            isLoading={isLoading}
            isCollapsed={isCollapsed}
            onCloseSideNav={onCloseSideNav}
          />
        </div>
      </nav>
    </>
  );
}

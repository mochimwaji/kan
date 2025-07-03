import Link from "next/link";
import { useRef, useState } from "react";
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
  TbLayoutSidebarRightCollapse,
  TbLayoutSidebarRightExpand,
} from "react-icons/tb";

import { authClient } from "@kan/auth/client";

import { useClickOutside } from "~/hooks/useClickOutside";
import { useTheme } from "~/providers/theme";
import FeedbackButton from "./FeedbackButton";
import SideNavigation from "./SideNavigation";

interface DashboardProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  hasRightPanel?: boolean;
}

export default function Dashboard({
  children,
  rightPanel,
  hasRightPanel = false,
}: DashboardProps) {
  const theme = useTheme();

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  const sideNavRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const sideNavButtonRef = useRef<HTMLButtonElement>(null);
  const rightPanelButtonRef = useRef<HTMLButtonElement>(null);

  const toggleSideNav = () => {
    setIsSideNavOpen(!isSideNavOpen);
    if (!isSideNavOpen) {
      setIsRightPanelOpen(false);
    }
  };

  const toggleRightPanel = () => {
    setIsRightPanelOpen(!isRightPanelOpen);
    if (!isRightPanelOpen) {
      setIsSideNavOpen(false);
    }
  };

  useClickOutside(sideNavRef, (event) => {
    if (sideNavButtonRef.current?.contains(event.target as Node)) {
      return;
    }
    if (isSideNavOpen) {
      setIsSideNavOpen(false);
    }
  });

  useClickOutside(rightPanelRef, (event) => {
    if (rightPanelButtonRef.current?.contains(event.target as Node)) {
      return;
    }
    if (isRightPanelOpen) {
      setIsRightPanelOpen(false);
    }
  });

  const isDarkMode = theme.activeTheme === "dark";

  return (
    <>
      <style jsx global>{`
        html {
          height: 100vh;
          overflow: hidden;
          min-width: 320px;
          background-color: ${!isDarkMode ? "hsl(0deg 0% 97.3%)" : "#161616"};
        }
      `}</style>
      <div className="flex h-screen flex-col items-center bg-light-100 dark:bg-dark-50 md:min-w-[800px]">
        <div className="flex h-12 min-h-12 w-full justify-between border-b border-light-600 px-5 py-2 align-middle dark:border-dark-400 md:h-16 md:min-h-16">
          <div className="my-auto flex w-full items-center justify-between">
            <button
              ref={sideNavButtonRef}
              onClick={toggleSideNav}
              className="text-neutral-900 dark:text-dark-1000 md:hidden"
            >
              {isSideNavOpen ? (
                <TbLayoutSidebarLeftCollapse
                  size={20}
                  className="text-light-900 dark:text-dark-900"
                />
              ) : (
                <TbLayoutSidebarLeftExpand
                  size={20}
                  className="text-light-900 dark:text-dark-900"
                />
              )}
            </button>

            <Link href="/" className="hidden md:block">
              <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-dark-1000">
                kan.bn
              </h1>
            </Link>

            <div className="flex items-center gap-2">
              {hasRightPanel && (
                <button
                  ref={rightPanelButtonRef}
                  onClick={toggleRightPanel}
                  className="text-neutral-900 dark:text-dark-1000 md:hidden"
                >
                  {isRightPanelOpen ? (
                    <TbLayoutSidebarRightCollapse
                      size={20}
                      className="text-light-900 dark:text-dark-900"
                    />
                  ) : (
                    <TbLayoutSidebarRightExpand
                      size={20}
                      className="text-light-900 dark:text-dark-900"
                    />
                  )}
                </button>
              )}
              <div className="hidden md:block">
                <FeedbackButton />
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 w-full">
          <div
            ref={sideNavRef}
            className={`fixed left-0 top-12 z-50 h-[calc(100dvh-3rem)] transform transition-transform duration-300 ease-in-out md:relative md:top-0 md:h-full md:translate-x-0 ${isSideNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} `}
          >
            <SideNavigation
              user={{ email: session?.user.email, image: session?.user.image }}
              isLoading={sessionLoading}
            />
          </div>

          <div className="relative flex min-h-0 w-full overflow-hidden">
            <div className="h-full w-full overflow-y-auto">{children}</div>

            {/* Mobile Right Panel */}
            {hasRightPanel && rightPanel && (
              <div
                ref={rightPanelRef}
                className={`fixed right-0 top-12 z-50 h-[calc(100dvh-3rem)] w-80 transform bg-light-200 transition-transform duration-300 ease-in-out dark:bg-dark-100 md:hidden ${
                  isRightPanelOpen ? "translate-x-0" : "translate-x-full"
                }`}
              >
                <div className="h-full overflow-y-auto">{rightPanel}</div>
              </div>
            )}

            {/* Desktop Right Panel */}
            {hasRightPanel && rightPanel && (
              <div className="hidden md:block">{rightPanel}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

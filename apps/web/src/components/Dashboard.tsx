import { useTheme } from "next-themes";
import React, { useEffect, useRef, useState } from "react";
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
  TbLayoutSidebarRightCollapse,
  TbLayoutSidebarRightExpand,
} from "react-icons/tb";

import { authClient } from "@kan/auth/client";

import BoardTransitionOverlay from "~/components/BoardTransitionOverlay";
import { useClickOutside } from "~/hooks/useClickOutside";
import { ColorThemeProvider } from "~/providers/colorTheme";
import { useModal } from "~/providers/modal";
import { useWorkspace, WorkspaceProvider } from "~/providers/workspace";
import PageTransition from "./PageTransition";
import SideNavigation from "./SideNavigation";

interface DashboardProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  hasRightPanel?: boolean;
}

export function getDashboardLayout(
  page: React.ReactElement,
  rightPanel?: React.ReactNode,
  hasRightPanel = false,
) {
  return (
    <WorkspaceProvider>
      <ColorThemeProvider>
        <Dashboard rightPanel={rightPanel} hasRightPanel={hasRightPanel}>
          {page}
        </Dashboard>
      </ColorThemeProvider>
    </WorkspaceProvider>
  );
}

export default function Dashboard({
  children,
  rightPanel,
  hasRightPanel = false,
}: DashboardProps) {
  const { resolvedTheme: _resolvedTheme } = useTheme();
  const { openModal } = useModal();
  const { availableWorkspaces, hasLoaded } = useWorkspace();

  // Apply workspace theme colors on load

  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  // Separate state for desktop panel, default to true
  const [isDesktopRightPanelOpen, setIsDesktopRightPanelOpen] = useState(true);

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

  const closeSideNav = () => {
    setIsSideNavOpen(false);
  };

  const toggleRightPanel = () => {
    setIsRightPanelOpen(!isRightPanelOpen);
    if (!isRightPanelOpen) {
      setIsSideNavOpen(false);
    }
  };

  const toggleDesktopRightPanel = () => {
    setIsDesktopRightPanelOpen(!isDesktopRightPanelOpen);
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

  useEffect(() => {
    // Normal reveal once data is loaded
    if (hasLoaded && !sessionLoading) {
      const timer = setTimeout(() => {
        document.documentElement.classList.add("app-ready");
      }, 50);
      return () => clearTimeout(timer);
    }

    // Failsafe: Reveal anyway after 3 seconds if data is still hanging
    const failsafe = setTimeout(() => {
      document.documentElement.classList.add("app-ready");
    }, 3000);

    return () => clearTimeout(failsafe);
  }, [hasLoaded, sessionLoading]);

  useEffect(() => {
    if (hasLoaded && availableWorkspaces.length === 0) {
      openModal("NEW_WORKSPACE", undefined, undefined, false);
    }
  }, [hasLoaded, availableWorkspaces.length, openModal]);

  return (
    <>
      <style jsx global>{`
        html {
          height: 100vh;
          overflow: hidden;
          min-width: 320px;
          background-color: var(--kan-sidebar-bg);
        }
      `}</style>
      <div
        className="relative flex h-screen flex-col md:p-3"
        style={{ backgroundColor: "var(--kan-sidebar-bg)" }}
      >
        {/* Mobile Header */}
        <div
          className="flex h-12 items-center justify-between border-b border-light-300 px-3 dark:border-dark-300 md:hidden"
          style={{ backgroundColor: "var(--kan-sidebar-bg)" }}
        >
          <button
            ref={sideNavButtonRef}
            onClick={toggleSideNav}
            className="rounded p-1.5 transition-all hover:bg-light-200 dark:hover:bg-dark-100"
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

          {hasRightPanel && (
            <button
              ref={rightPanelButtonRef}
              onClick={toggleRightPanel}
              className="rounded p-1.5 transition-all hover:bg-light-200 dark:hover:bg-dark-100"
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
        </div>

        <div className="flex h-[calc(100dvh-4.5rem)] min-h-0 w-full md:h-[calc(100dvh-1.5rem)]">
          {/* Mobile sidebar backdrop */}
          {isSideNavOpen && (
            <div
              className="fixed inset-0 top-12 z-30 bg-black/30 md:hidden"
              onClick={closeSideNav}
            />
          )}
          <div
            ref={sideNavRef}
            className={`fixed top-12 z-40 h-[calc(100dvh-3rem)] w-[calc(100vw-1.5rem)] transform transition-transform duration-300 ease-in-out md:relative md:top-0 md:h-full md:w-auto md:translate-x-0 ${isSideNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} `}
          >
            <SideNavigation
              user={{ email: session?.user.email, image: session?.user.image }}
              isLoading={sessionLoading}
              onCloseSideNav={closeSideNav}
            />
          </div>

          <div
            data-content-area="true"
            className="relative h-full min-h-0 w-full overflow-hidden md:rounded-lg md:border md:border-light-300 md:dark:border-dark-300"
            style={{ backgroundColor: "var(--kan-pages-bg)" }}
          >
            <div className="relative flex h-full min-h-0 w-full overflow-hidden">
              <div className="h-full w-full overflow-y-auto">
                <PageTransition>{children}</PageTransition>
              </div>

              {/* Mobile Right Panel */}
              {hasRightPanel && rightPanel && (
                <div
                  ref={rightPanelRef}
                  className={`fixed right-0 top-12 z-40 h-[calc(100dvh-3rem)] w-80 transform border-l border-light-300 bg-light-200 transition-transform duration-300 ease-in-out dark:border-dark-300 dark:bg-dark-100 md:hidden ${
                    isRightPanelOpen ? "translate-x-0" : "translate-x-full"
                  }`}
                >
                  <div className="h-full">{rightPanel}</div>
                </div>
              )}

              {/* Desktop Right Panel with Sliding Animation */}
              {hasRightPanel && rightPanel && (
                <div
                  className={`hidden h-full flex-col border-l border-light-300 transition-all duration-300 ease-in-out dark:border-dark-300 md:flex ${
                    isDesktopRightPanelOpen ? "w-[360px]" : "w-12"
                  }`}
                  style={{ backgroundColor: "var(--kan-sidebar-bg)" }}
                >
                  <div
                    className={`flex h-[45px] shrink-0 items-center px-2 ${
                      isDesktopRightPanelOpen
                        ? "justify-start"
                        : "justify-center"
                    }`}
                  >
                    <button
                      onClick={toggleDesktopRightPanel}
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-light-200 dark:hover:bg-dark-200"
                    >
                      {isDesktopRightPanelOpen ? (
                        <TbLayoutSidebarRightCollapse
                          size={18}
                          style={{
                            color: "var(--kan-sidebar-text)",
                            opacity: 0.7,
                          }}
                        />
                      ) : (
                        <TbLayoutSidebarRightExpand
                          size={18}
                          style={{
                            color: "var(--kan-sidebar-text)",
                            opacity: 0.7,
                          }}
                        />
                      )}
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden transition-opacity duration-200">
                    {isDesktopRightPanelOpen ? (
                      <div className="h-full w-[360px]">{rightPanel}</div>
                    ) : (
                      <div className="h-full w-12">
                        {React.isValidElement(rightPanel)
                          ? React.cloneElement(
                              rightPanel as React.ReactElement<{
                                isCollapsed?: boolean;
                              }>,
                              { isCollapsed: true },
                            )
                          : rightPanel}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <BoardTransitionOverlay />
    </>
  );
}

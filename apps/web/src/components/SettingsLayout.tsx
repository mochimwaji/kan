import Link from "next/link";
import { useRouter } from "next/router";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiChevronDown,
  HiOutlineBanknotes,
  HiOutlineCodeBracketSquare,
  HiOutlineRectangleGroup,
  HiOutlineUser,
} from "react-icons/hi2";

import TabTransition from "~/components/TabTransition";
import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";

interface SettingsLayoutProps {
  children: React.ReactNode;
  currentTab: string;
}

const UNDERLINE_STORAGE_KEY = "kan_settings-underline";

interface StoredUnderline {
  left: number;
  width: number;
  tab: string;
}

export function SettingsLayout({ children, currentTab }: SettingsLayoutProps) {
  const router = useRouter();
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [underlineStyle, setUnderlineStyle] = useState<{
    left: number;
    width: number;
    animate: boolean;
  }>({ left: 0, width: 0, animate: false });
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const navRef = useRef<HTMLElement | null>(null);
  const hasInitialized = useRef(false);

  const isCloudEnv = env("NEXT_PUBLIC_KAN_ENV") === "cloud";

  // Settings keyboard shortcuts
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "a" },
    action: () => router.push("/settings/account"),
    description: t`Account settings`,
    group: "NAVIGATION",
  });

  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "w" },
    action: () => router.push("/settings/workspace"),
    description: t`Workspace settings`,
    group: "NAVIGATION",
  });

  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "p" },
    action: () => router.push("/settings/api"),
    description: t`API settings`,
    group: "NAVIGATION",
  });

  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "i" },
    action: () => router.push("/settings/integrations"),
    description: t`Integrations`,
    group: "NAVIGATION",
  });

  // Memoize availableTabs to prevent infinite re-renders
  const availableTabs = useMemo(() => {
    const settingsTabs = [
      {
        key: "account",
        icon: <HiOutlineUser />,
        label: t`Account`,
        condition: true,
      },
      {
        key: "workspace",
        icon: <HiOutlineRectangleGroup />,
        label: t`Workspace`,
        condition: true,
      },
      {
        key: "billing",
        label: t`Billing`,
        icon: <HiOutlineBanknotes />,
        condition: isCloudEnv,
      },
      {
        key: "api",
        icon: <HiOutlineCodeBracketSquare />,
        label: t`API`,
        condition: true,
      },
      {
        key: "integrations",
        icon: <HiOutlineCodeBracketSquare />,
        label: t`Integrations`,
        condition: true,
      },
    ];
    return settingsTabs.filter((tab) => tab.condition);
  }, [isCloudEnv]);

  // Get the current tab's underline position
  const getCurrentUnderlinePosition = useCallback(() => {
    const tabIndex = availableTabs.findIndex((tab) => tab.key === currentTab);
    const tabElement = tabRefs.current[tabIndex];
    const navElement = navRef.current;

    if (tabElement && navElement) {
      const navRect = navElement.getBoundingClientRect();
      const tabRect = tabElement.getBoundingClientRect();
      return {
        left: tabRect.left - navRect.left,
        width: tabRect.width,
      };
    }
    return null;
  }, [availableTabs, currentTab]);

  // Update selected tab index when currentTab changes
  useEffect(() => {
    const tabIndex = availableTabs.findIndex((tab) => tab.key === currentTab);
    if (tabIndex !== -1) {
      setSelectedTabIndex(tabIndex);
    }
  }, [currentTab, availableTabs]);

  // Initialize underline position - start from stored position and animate to current
  useEffect(() => {
    if (hasInitialized.current) return;

    const initializeUnderline = () => {
      const currentPos = getCurrentUnderlinePosition();
      if (!currentPos) return;

      // Try to get the stored previous position
      let storedData: StoredUnderline | null = null;
      try {
        const stored = localStorage.getItem(UNDERLINE_STORAGE_KEY);
        if (stored) {
          storedData = JSON.parse(stored) as StoredUnderline;
        }
      } catch {
        // Ignore localStorage errors
      }

      // If we have a stored position from a different tab, animate from there
      if (storedData && storedData.tab !== currentTab) {
        // Start at the previous position
        setUnderlineStyle({
          left: storedData.left,
          width: storedData.width,
          animate: false,
        });

        // Then animate to the current position
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setUnderlineStyle({
              left: currentPos.left,
              width: currentPos.width,
              animate: true,
            });
          });
        });
      } else {
        // No previous position or same tab - just set current position
        setUnderlineStyle({
          left: currentPos.left,
          width: currentPos.width,
          animate: false,
        });
      }

      // Store the current position for the next navigation
      try {
        localStorage.setItem(
          UNDERLINE_STORAGE_KEY,
          JSON.stringify({
            left: currentPos.left,
            width: currentPos.width,
            tab: currentTab,
          }),
        );
      } catch {
        // Ignore localStorage errors
      }

      hasInitialized.current = true;
    };

    // Small delay to ensure refs are set
    const timeout = setTimeout(initializeUnderline, 20);
    return () => clearTimeout(timeout);
  }, [currentTab, getCurrentUnderlinePosition]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const pos = getCurrentUnderlinePosition();
      if (pos) {
        setUnderlineStyle({
          left: pos.left,
          width: pos.width,
          animate: false,
        });
        // Update stored position
        try {
          localStorage.setItem(
            UNDERLINE_STORAGE_KEY,
            JSON.stringify({ ...pos, tab: currentTab }),
          );
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [getCurrentUnderlinePosition, currentTab]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Added scrollbar-gutter to prevent layout shift when scrollbar appears/disappears */}
      <div className="h-full max-h-[calc(100vdh-3rem)] overflow-y-scroll [scrollbar-gutter:stable] md:max-h-[calc(100vdh-4rem)]">
        <div className="m-auto max-w-[1100px] px-5 py-6 md:px-28 md:py-12">
          <div className="mb-8 flex w-full justify-between">
            <h1
              className="font-bold tracking-tight sm:text-[1.2rem]"
              style={{ color: "var(--kan-pages-text)" }}
            >
              {t`Settings`}
            </h1>
          </div>

          <div className="focus:outline-none">
            <div className="sm:hidden">
              {/* Mobile dropdown */}
              <Listbox
                value={selectedTabIndex}
                onChange={(index) => {
                  const tabKey = availableTabs[index]?.key;
                  if (tabKey) {
                    void router.push(`/settings/${tabKey}`);
                  }
                }}
              >
                <div className="relative mb-4">
                  <ListboxButton className="w-full appearance-none rounded-lg border-0 bg-light-50 py-2 pl-3 pr-10 text-left text-sm text-light-1000 shadow-sm ring-1 ring-inset ring-light-300 focus:ring-2 focus:ring-inset focus:ring-light-400 dark:bg-dark-50 dark:text-dark-1000 dark:ring-dark-300 dark:focus:ring-dark-500">
                    {availableTabs[selectedTabIndex]?.label || "Select a tab"}
                    <HiChevronDown
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-900 dark:text-dark-900"
                    />
                  </ListboxButton>
                  <ListboxOptions className="absolute z-10 mt-1 w-full rounded-lg bg-light-50 py-1 text-sm shadow-lg ring-1 ring-inset ring-light-300 dark:bg-dark-50 dark:ring-dark-300">
                    {availableTabs.map((tab) => (
                      <ListboxOption
                        key={tab.key}
                        value={availableTabs.indexOf(tab)}
                        className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-light-1000 dark:text-dark-1000"
                      >
                        {tab.label}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </div>
              </Listbox>
            </div>
            <div className="hidden sm:block">
              <div className="relative border-b border-gray-200 dark:border-white/10">
                <nav
                  ref={navRef}
                  aria-label="Tabs"
                  className="-mb-px flex space-x-8 focus:outline-none"
                >
                  {availableTabs.map((tab, index) => (
                    <Link
                      key={tab.key}
                      ref={(el) => {
                        tabRefs.current[index] = el;
                      }}
                      href={`/settings/${tab.key}`}
                      className="whitespace-nowrap px-1 py-4 text-sm font-medium transition-colors focus:outline-none"
                      style={{
                        color: "var(--kan-pages-text)",
                        opacity: currentTab === tab.key ? 1 : 0.6,
                      }}
                    >
                      {tab.label}
                    </Link>
                  ))}
                </nav>
                {/* Animated underline */}
                <div
                  className={`absolute bottom-0 h-0.5 ${
                    underlineStyle.animate
                      ? "transition-all duration-300 ease-in-out"
                      : ""
                  }`}
                  style={{
                    left: underlineStyle.left,
                    width: underlineStyle.width,
                    opacity: underlineStyle.width > 0 ? 1 : 0,
                    backgroundColor: "var(--kan-pages-text)",
                  }}
                />
              </div>
            </div>
            <div className="focus:outline-none">
              <TabTransition>{children}</TabTransition>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

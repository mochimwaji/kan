import { Button, Menu, Transition } from "@headlessui/react";
import { Fragment, useRef, useState } from "react";
import { HiCheck, HiMagnifyingGlass } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import CommandPallette from "./CommandPallette";
import { Tooltip } from "./Tooltip";

export default function WorkspaceMenu({
  isCollapsed = false,
}: {
  isCollapsed?: boolean;
}) {
  const { workspace, isLoading, availableWorkspaces, switchWorkspace } =
    useWorkspace();
  const { openModal } = useModal();
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Ctrl+/ to open command palette (search + shortcuts)
  const { tooltipContent: commandPaletteShortcutTooltipContent } =
    useKeyboardShortcut({
      type: "PRESS",
      stroke: {
        key: "/",
        modifiers: ["CONTROL"],
      },
      action: () => setIsOpen(true),
      description: "Search",
      group: "GENERAL",
    });

  // 'w' shortcut to open workspace menu
  useKeyboardShortcut({
    type: "PRESS",
    stroke: { key: "w" },
    action: () => {
      // Programmatically click the menu button to open it
      menuButtonRef.current?.click();
    },
    description: "Open workspace menu",
    group: "NAVIGATION",
  });

  return (
    <>
      <CommandPallette isOpen={isOpen} onClose={() => setIsOpen(false)} />
      <Menu as="div" className="relative inline-block w-full pb-3 text-left">
        <div>
          {isLoading ? (
            <div className={twMerge("mb-1 flex", isCollapsed && "md:p-1.5")}>
              <div className="h-6 w-6 animate-pulse rounded-md bg-light-200 dark:bg-dark-200" />
              <div
                className={twMerge(
                  "ml-2 h-6 w-[150px] animate-pulse rounded-md bg-light-200 dark:bg-dark-200",
                  isCollapsed && "md:hidden",
                )}
              />
            </div>
          ) : (
            <div
              className={twMerge(
                "flex items-center justify-start gap-1",
                isCollapsed && "md:flex-col-reverse md:items-center",
              )}
            >
              <Menu.Button
                ref={menuButtonRef}
                className={twMerge(
                  "mb-1 flex h-[34px] min-w-0 flex-1 items-center justify-start rounded-md p-1.5 hover:bg-light-200 dark:hover:bg-dark-200",
                  isCollapsed &&
                    "md:mb-1.5 md:h-9 md:w-9 md:flex-none md:justify-center md:p-0",
                )}
                title={isCollapsed ? workspace.name : undefined}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-700">
                  <span className="text-xs font-bold leading-none text-white">
                    {workspace.name.charAt(0).toUpperCase()}
                  </span>
                </span>
                <span
                  className={twMerge(
                    "ml-2 min-w-0 flex-1 truncate text-left text-sm font-bold",
                    isCollapsed && "md:hidden",
                  )}
                  style={{ color: "var(--kan-sidebar-text)" }}
                >
                  {workspace.name}
                </span>
                {workspace.plan === "pro" && (
                  <span
                    className={twMerge(
                      "ml-2 inline-flex items-center rounded-md bg-indigo-100 px-2 py-1 text-[10px] font-medium text-indigo-700",
                      isCollapsed && "md:hidden",
                    )}
                  >
                    Pro
                  </span>
                )}
              </Menu.Button>
              <Tooltip content={commandPaletteShortcutTooltipContent}>
                <Button
                  className={twMerge(
                    "mb-1 h-[34px] w-[34px] flex-shrink-0 rounded-lg bg-transparent p-2 hover:bg-light-300 focus:outline-none dark:hover:bg-dark-300",
                    isCollapsed && "md:mb-2 md:h-9 md:w-9",
                  )}
                  onClick={() => setIsOpen(true)}
                >
                  <HiMagnifyingGlass
                    className="h-4 w-4"
                    style={{ color: "var(--kan-sidebar-text)" }}
                    aria-hidden="true"
                  />
                </Button>
              </Tooltip>
            </div>
          )}
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            className={twMerge(
              "absolute left-0 z-10 origin-top-left rounded-md border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
              isCollapsed ? "w-48" : "w-full",
            )}
            style={{
              backgroundColor: "var(--kan-menu-bg)",
              borderColor: "var(--kan-menu-border)",
            }}
          >
            <div className="p-1">
              {availableWorkspaces.map((availableWorkspace) => (
                <div key={availableWorkspace.publicId} className="flex">
                  <Menu.Item>
                    <button
                      onClick={() => switchWorkspace(availableWorkspace)}
                      className="flex w-full items-center justify-between rounded-[5px] px-3 py-2 text-left text-sm hover:bg-light-200 dark:hover:bg-dark-400"
                      style={{ color: "var(--kan-menu-text)" }}
                    >
                      <div className="flex min-w-0 flex-1 items-center">
                        <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[5px] bg-indigo-700">
                          <span className="text-xs font-medium leading-none text-white">
                            {availableWorkspace.name.charAt(0).toUpperCase()}
                          </span>
                        </span>
                        <span
                          className="ml-2 truncate text-xs font-medium"
                          style={{ color: "var(--kan-menu-text)" }}
                        >
                          {availableWorkspace.name}
                        </span>
                      </div>
                      {workspace.publicId === availableWorkspace.publicId && (
                        <span>
                          <HiCheck className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  </Menu.Item>
                </div>
              ))}
            </div>
            <div
              className="border-t-[1px] p-1"
              style={{ borderColor: "var(--kan-menu-border)" }}
            >
              <Menu.Item>
                <button
                  onClick={() => openModal("NEW_WORKSPACE")}
                  style={{ color: "var(--kan-menu-text)" }}
                  className="flex w-full items-center justify-between rounded-[5px] px-3 py-2 text-left text-xs hover:bg-light-200 dark:hover:bg-dark-400"
                >
                  {"Create workspace"}
                </button>
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </>
  );
}

import { useRouter } from "next/router";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from "@headlessui/react";
import { t } from "@lingui/macro";
import { useEffect, useRef, useState } from "react";
import { HiDocumentText, HiFolder, HiMagnifyingGlass } from "react-icons/hi2";

import { useDebounce } from "~/hooks/useDebounce";
import {
  FormattedShortcut,
  getShortcutGroupInfo,
  ShortcutGroup,
  useKeyboardShortcuts,
} from "~/providers/keyboard-shortcuts";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

type SearchResult =
  | {
      publicId: string;
      title: string;
      description: string | null;
      slug: string;
      updatedAt: Date | null;
      createdAt: Date;
      type: "board";
    }
  | {
      publicId: string;
      title: string;
      description: string | null;
      boardPublicId: string;
      boardName: string;
      listName: string;
      updatedAt: Date | null;
      createdAt: Date;
      type: "card";
    };

export default function CommandPallette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const { workspace } = useWorkspace();
  const router = useRouter();
  const { getGroupedShortcuts } = useKeyboardShortcuts();
  const inputRef = useRef<HTMLInputElement>(null);

  // Explicitly focus input after dialog opens (autoFocus can be unreliable with transitions)
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure dialog transition completes
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Debounce to avoid too many reqs
  const [debouncedQuery] = useDebounce(query, 300);

  const {
    data: searchResults,
    isLoading,
    isFetched,
    isPlaceholderData,
  } = api.workspace.search.useQuery(
    {
      workspacePublicId: workspace.publicId,
      query: debouncedQuery,
    },
    {
      enabled: Boolean(workspace.publicId && debouncedQuery.trim().length > 0),
      placeholderData: (previousData) => previousData,
    },
  );

  // Clear results when query is empty, otherwise show search results
  const results =
    debouncedQuery.trim().length === 0
      ? []
      : ((searchResults ?? []) as SearchResult[]);

  const hasSearched = Boolean(debouncedQuery.trim().length > 0);

  // Get grouped shortcuts for legend display
  const groupedShortcuts = getGroupedShortcuts();
  const groupInfo = getShortcutGroupInfo();

  // Show legend when query is empty
  const showLegend = query.trim().length === 0;

  return (
    <Dialog
      className="relative z-50"
      open={isOpen}
      onClose={() => {
        onClose();
        setQuery("");
      }}
    >
      <DialogBackdrop
        transition
        className="data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in fixed inset-0 bg-light-50 bg-opacity-40 transition-opacity dark:bg-dark-50 dark:bg-opacity-40"
      />

      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="flex min-h-full items-start justify-center p-4 text-center sm:items-start sm:p-0">
          <DialogPanel
            transition
            style={{ backgroundColor: "var(--kan-menu-bg)" }}
            className="data-closed:opacity-0 data-closed:translate-y-4 data-closed:sm:translate-y-0 data-closed:sm:scale-95 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in relative mt-[25vh] w-full max-w-[550px] transform divide-y divide-gray-100 overflow-hidden rounded-lg border border-light-600 shadow-3xl-light backdrop-blur-[6px] transition-all dark:divide-white/10 dark:border-dark-600 dark:shadow-3xl-dark"
          >
            <Combobox>
              <div className="grid grid-cols-1">
                <ComboboxInput
                  ref={inputRef}
                  autoFocus
                  className="col-start-1 row-start-1 h-12 w-full border-0 bg-transparent pl-11 pr-4 text-sm placeholder:text-light-700 focus:outline-none focus:ring-0 dark:placeholder:text-dark-700"
                  style={{ color: "var(--kan-menu-text)" }}
                  placeholder={t`Search boards and cards...`}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && results.length > 0) {
                      event.preventDefault();

                      // Find the active option or fallback to first option
                      const targetOption =
                        document.querySelector(
                          '[data-headlessui-state*="active"][role="option"]',
                        ) ?? document.querySelector('[role="option"]');

                      if (targetOption) {
                        (targetOption as HTMLElement).click();
                      }
                    }
                  }}
                />
                <HiMagnifyingGlass
                  className="pointer-events-none col-start-1 row-start-1 ml-4 size-5 self-center text-light-700 dark:text-dark-700"
                  aria-hidden="true"
                />
              </div>

              {/* Search Results */}
              {results.length > 0 && (
                <ComboboxOptions
                  static
                  className={`max-h-72 scroll-py-2 overflow-y-auto py-2 ${
                    isPlaceholderData ? "opacity-75" : ""
                  }`}
                >
                  {results.map((result) => {
                    const url =
                      result.type === "board"
                        ? `/boards/${result.publicId}`
                        : `/cards/${result.publicId}`;

                    return (
                      <ComboboxOption
                        key={`${result.type}-${result.publicId}`}
                        value={result}
                        className="cursor-pointer select-none px-4 py-3 data-[focus]:bg-light-200 hover:bg-light-200 focus:outline-none dark:data-[focus]:bg-dark-200 dark:hover:bg-dark-200"
                        onClick={() => {
                          void router.push(url);
                          onClose();
                          setQuery("");
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex-shrink-0">
                            {result.type === "board" ? (
                              <HiFolder className="h-4 w-4 text-light-600 dark:text-dark-600" />
                            ) : (
                              <HiDocumentText className="h-4 w-4 text-light-600 dark:text-dark-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <div
                              className="truncate text-sm font-bold"
                              style={{ color: "var(--kan-menu-text)" }}
                            >
                              {result.title}
                            </div>
                            {result.type === "card" && (
                              <div className="truncate text-xs text-light-700 dark:text-dark-700">
                                {`${t`in`} ${result.boardName} → ${result.listName}`}
                              </div>
                            )}
                          </div>
                        </div>
                      </ComboboxOption>
                    );
                  })}
                </ComboboxOptions>
              )}

              {/* No Results */}
              {hasSearched &&
                !isLoading &&
                searchResults !== undefined &&
                results.length === 0 && (
                  <div className="p-4 text-sm text-light-950 dark:text-dark-950">
                    {t`No results found for "${debouncedQuery}".`}
                  </div>
                )}

              {/* Keyboard Shortcuts Legend - shows when not searching */}
              <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                  showLegend ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="max-h-[300px] overflow-y-auto border-t border-gray-100 p-4 dark:border-white/10">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-light-700 dark:text-dark-700">
                    {t`Keyboard Shortcuts`}
                  </h3>
                  <div className="space-y-4">
                    {Object.values(ShortcutGroup).map((group) => {
                      const shortcuts = groupedShortcuts[group];
                      if (!shortcuts?.length) return null;
                      return (
                        <div key={group}>
                          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-light-600 dark:text-dark-600">
                            {groupInfo[group].label}
                          </h4>
                          <div className="flex flex-col gap-y-1.5">
                            {shortcuts.map((shortcut) => (
                              <div
                                key={shortcut.description}
                                className="flex items-center justify-between gap-2"
                              >
                                <span
                                  className="text-xs"
                                  style={{ color: "var(--kan-menu-text)" }}
                                >
                                  {shortcut.description}
                                </span>
                                <FormattedShortcut shortcut={shortcut} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Combobox>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";

export default function Dropdown({
  items,
  children,
  disabled,
}: {
  items: { label: string; action: () => void; icon?: React.ReactNode }[];
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      {({ open }) => (
        <>
          <div>
            <Menu.Button
              disabled={disabled}
              className="flex h-7 w-7 items-center justify-center rounded-[5px] hover:bg-light-200 focus:outline-none dark:hover:bg-dark-200"
            >
              {children}
            </Menu.Button>
          </div>

          {/* Mobile backdrop */}
          {open && <div className="fixed inset-0 z-40 bg-black/20 md:hidden" />}

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              className="fixed inset-x-4 top-1/2 z-50 w-auto -translate-y-1/2 rounded-md border border-light-200 p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-400 md:absolute md:inset-x-auto md:right-0 md:top-auto md:mt-2 md:w-56 md:translate-y-0"
              style={{ backgroundColor: "var(--kan-menu-bg)" }}
            >
              <div className="flex flex-col">
                {items.map((item) => (
                  <Menu.Item key={item.label}>
                    <button
                      onClick={item.action}
                      className="flex w-auto items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-sm hover:bg-light-200 dark:hover:bg-dark-400"
                      style={{ color: "var(--kan-menu-text)" }}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
}

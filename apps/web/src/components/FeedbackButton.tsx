import Link from "next/link";
import { Menu, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import chatIconDark from "~/assets/chat-dark.json";
import chatIconLight from "~/assets/chat-light.json";
import Button from "~/components/Button";
import Input from "~/components/Input";
import LottieIcon from "~/components/LottieIcon";
import { usePopup } from "~/providers/popup";
import { useTheme } from "~/providers/theme";
import { api } from "~/utils/api";

interface NewFeedbackFormInput {
  feedback: string;
}

const FeedbackButton: React.FC = () => {
  const outsideRef = useRef<HTMLDivElement>(null);
  const { activeTheme } = useTheme();
  const { showPopup } = usePopup();
  const [isHovered, setIsHovered] = useState(false);
  const [index, setIndex] = useState(0);

  const { handleSubmit, setValue, watch, reset } =
    useForm<NewFeedbackFormInput>({
      defaultValues: {
        feedback: "",
      },
    });

  const createFeedback = api.feedback.create.useMutation({
    onSuccess: async () => {
      reset();
      showPopup({
        header: t`Feedback sent`,
        message: t`Thank you for your feedback!`,
        icon: "success",
      });
    },
    onError: async () => {
      showPopup({
        header: t`Unable to send feedback`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const handleMouseEnter = () => {
    setIsHovered(true);
    setIndex((index) => index + 1);
  };

  const onSubmit = (values: NewFeedbackFormInput) => {
    createFeedback.mutate({
      feedback: values.feedback,
      url: window.location.href,
    });
  };

  return (
    <>
      <div ref={outsideRef} />
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button
            onMouseEnter={handleMouseEnter}
            className="flex items-center rounded-md border-[1px] border-light-600 bg-light-50 px-2.5 py-1.5 text-sm font-normal text-neutral-900 shadow-sm dark:border-dark-400 dark:bg-dark-50 dark:text-dark-1000"
          >
            <LottieIcon
              index={index}
              json={activeTheme === "dark" ? chatIconDark : chatIconLight}
              isPlaying={isHovered}
            />
            <span className="ml-1">{t`Feedback`}</span>
          </Menu.Button>
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
            as="div"
            static
            className="absolute right-0 z-30 mt-2 w-[350px] origin-top-right rounded-md border border-light-200 bg-light-50 p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-400 dark:bg-dark-300"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="p-1">
              <Input
                placeholder={t`Ideas to improve this page...`}
                onChange={(e) => {
                  setValue("feedback", e.target.value);
                }}
                value={watch("feedback")}
                contentEditable
                className="max-h-[300px] min-h-[100px]"
                onKeyDown={async (e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" && e.shiftKey) {
                    e.preventDefault();
                    await handleSubmit(onSubmit)();
                  }
                }}
              />
              <div className="flex flex-row items-center justify-between pt-2">
                <div>
                  <p className="ml-2 text-xs text-neutral-900 dark:text-dark-1000">
                    {t`Need help?`}{" "}
                    <Link
                      href="mailto:support@kan.bn"
                      className="text-blue-600 underline dark:text-blue-300"
                    >
                      {t`Contact us`}
                    </Link>
                    {t`, or see our`}{" "}
                    <Link
                      href="https://docs.kan.bn"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline dark:text-blue-300"
                    >
                      {t`docs`}
                    </Link>
                    .
                  </p>
                </div>
                <div className="justify-end">
                  <Button size="sm" isLoading={createFeedback.isPending}>
                    {t`Send`}
                  </Button>
                </div>
              </div>
            </form>
          </Menu.Items>
        </Transition>
      </Menu>
    </>
  );
};

export default FeedbackButton;

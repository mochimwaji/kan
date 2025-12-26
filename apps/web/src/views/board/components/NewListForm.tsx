import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";

import type { NewListInput } from "@kan/api/types";
import { generateUID } from "@kan/shared/utils";

import Button from "~/components/Button";
import Input from "~/components/Input";
import Toggle from "~/components/Toggle";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

type NewListFormInput = NewListInput & {
  isCreateAnotherEnabled: boolean;
};

interface QueryParams {
  boardPublicId: string;
  members: string[];
  labels: string[];
  lists: string[];
}

export function NewListForm({
  boardPublicId,
  queryParams,
}: {
  boardPublicId: string;
  queryParams: QueryParams;
}) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const inputRef = useRef<HTMLInputElement>(null);

  const utils = api.useUtils();

  const { register, handleSubmit, reset, setValue, watch } =
    useForm<NewListFormInput>({
      defaultValues: {
        name: "",
        boardPublicId: boardPublicId,
        isCreateAnotherEnabled: true,
      },
    });

  const isCreateAnotherEnabled = watch("isCreateAnotherEnabled");

  const createList = api.list.create.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();

      const currentState = utils.board.byId.getData(queryParams);
      const placeholderId = generateUID();

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const newList = {
          publicId: placeholderId,
          name: args.name,
          boardId: 1,
          boardPublicId,
          cards: [],
          index: oldBoard.lists.length,
          color: null,
        };

        const updatedLists = [...oldBoard.lists, newList];

        return { ...oldBoard, lists: updatedLists };
      });

      return { previousState: currentState };
    },
    onError: (_error, _newList, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: "Unable to create list",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async (_data, error) => {
      // Delay invalidation to allow list animation to complete
      // This prevents flash by giving time for the new list to settle
      if (!error) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await utils.board.byId.invalidate(queryParams);
    },
  });

  // Autofocus with delay to ensure modal transition completes
  // iOS requires longer delay and may need select() after focus
  useEffect(() => {
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const onSubmit = (data: NewListInput) => {
    const isCreateAnotherEnabled = watch("isCreateAnotherEnabled");
    if (!isCreateAnotherEnabled) closeModal();
    reset({
      name: "",
      isCreateAnotherEnabled,
    });

    createList.mutate({
      name: data.name,
      boardPublicId,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4">
          <h2
            className="text-sm font-bold"
            style={{ color: "var(--kan-pages-text)" }}
          >
            {"New list"}
          </h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-200 focus:outline-none dark:hover:bg-dark-300"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        <Input
          id="list-name"
          placeholder={"List name"}
          {...register("name")}
          ref={(e) => {
            register("name").ref(e);
            (
              inputRef as React.MutableRefObject<HTMLInputElement | null>
            ).current = e;
          }}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await handleSubmit(onSubmit)();
            }
          }}
        />
      </div>
      <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <Toggle
          label={"Create another"}
          isChecked={isCreateAnotherEnabled}
          onChange={() =>
            setValue("isCreateAnotherEnabled", !isCreateAnotherEnabled)
          }
        />

        <div>
          <Button
            type="submit"
            disabled={createList.isPending || !watch("name")}
          >
            {"Create list"}
          </Button>
        </div>
      </div>
    </form>
  );
}

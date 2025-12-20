import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const UpdateWorkspaceDescriptionForm = ({
  workspacePublicId,
  workspaceDescription,
}: {
  workspacePublicId: string;
  workspaceDescription: string;
}) => {
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const schema = z.object({
    description: z
      .string()
      .min(3, {
        message: "Workspace description must be at least 3 characters long",
      })
      .max(280, {
        message: "Workspace description cannot exceed 280 characters",
      }),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { isDirty, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      description: workspaceDescription,
    },
  });

  const updateWorkspaceDescription = api.workspace.update.useMutation({
    onSuccess: async () => {
      showPopup({
        header: "Workspace description updated",
        message: "Your workspace description has been updated.",
        icon: "success",
      });
      try {
        await utils.workspace.all.refetch();
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
    onError: () => {
      showPopup({
        header: "Error updating workspace description",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateWorkspaceDescription.mutate({
      workspacePublicId,
      description: data.description,
    });
  };

  return (
    <div className="flex gap-2">
      <div className="mb-4 flex w-full max-w-[325px] items-center gap-2">
        <Input
          {...register("description")}
          errorMessage={errors.description?.message}
        />
      </div>
      {isDirty && (
        <div>
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="primary"
            disabled={updateWorkspaceDescription.isPending}
            isLoading={updateWorkspaceDescription.isPending}
          >
            {"Update"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UpdateWorkspaceDescriptionForm;

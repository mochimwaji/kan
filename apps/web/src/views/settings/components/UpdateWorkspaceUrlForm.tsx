import { zodResolver } from "@hookform/resolvers/zod";
import { env } from "next-runtime-env";
import { useForm } from "react-hook-form";
import { HiCheck } from "react-icons/hi2";
import { z } from "zod";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useDebounce } from "~/hooks/useDebounce";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const UpdateWorkspaceUrlForm = ({
  workspacePublicId,
  workspaceUrl,
}: {
  workspacePublicId: string;
  workspaceUrl: string;
  workspacePlan?: "free" | "pro" | "enterprise";
}) => {
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const schema = z.object({
    slug: z
      .string()
      .min(3, {
        message: "URL must be at least 3 characters long",
      })
      .max(24, { message: "URL cannot exceed 24 characters" })
      .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/, {
        message: "URL can only contain letters, numbers, and hyphens",
      }),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { isDirty, errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      slug: workspaceUrl,
    },
    mode: "onChange",
  });

  const slug = watch("slug");

  const updateWorkspaceSlug = api.workspace.update.useMutation({
    onSuccess: async () => {
      showPopup({
        header: "Workspace slug updated",
        message: "Your workspace slug has been updated.",
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
        header: "Error updating workspace URL",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
  });

  const [debouncedSlug] = useDebounce(slug, 500);

  const isTyping = slug !== debouncedSlug;

  const checkWorkspaceSlugAvailability =
    api.workspace.checkSlugAvailability.useQuery(
      {
        workspaceSlug: debouncedSlug,
      },
      {
        enabled:
          !!debouncedSlug && debouncedSlug !== workspaceUrl && !errors.slug,
      },
    );

  const isWorkspaceSlugAvailable = checkWorkspaceSlugAvailability.data;

  const onSubmit = (data: FormValues) => {
    if (!isWorkspaceSlugAvailable?.isAvailable) return;

    updateWorkspaceSlug.mutate({
      workspacePublicId,
      slug: data.slug,
    });
  };

  return (
    <div className="flex gap-2">
      <div className="mb-4 flex w-full max-w-[325px] items-center gap-2">
        <Input
          {...register("slug")}
          className={`${
            isWorkspaceSlugAvailable?.isAvailable
              ? "focus:ring-green-500 dark:focus:ring-green-500"
              : ""
          }`}
          errorMessage={
            errors.slug?.message ||
            (isWorkspaceSlugAvailable?.isAvailable === false
              ? "This workspace username has already been taken"
              : undefined)
          }
          prefix={`${env("NEXT_PUBLIC_BASE_URL") ?? ""}/`}
          iconRight={
            isWorkspaceSlugAvailable?.isAvailable ? (
              <HiCheck className="h-4 w-4 text-green-500" />
            ) : null
          }
        />
      </div>
      {isDirty && (
        <div>
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="primary"
            disabled={
              updateWorkspaceSlug.isPending ||
              checkWorkspaceSlugAvailability.isPending ||
              isWorkspaceSlugAvailable?.isAvailable === false ||
              isTyping
            }
            isLoading={updateWorkspaceSlug.isPending}
          >
            {"Update"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UpdateWorkspaceUrlForm;

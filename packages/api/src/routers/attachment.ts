import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import { apiLogger } from "@kan/logger";

import { createTRPCRouter } from "../trpc";
import { assertUserInWorkspace } from "../utils/auth";
import { loggedProtectedProcedure as protectedProcedure } from "../utils/middleware";
import { deleteFile } from "../utils/storage";

export const attachmentRouter = createTRPCRouter({
  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete an attachment",
        method: "DELETE",
        path: "/attachments/{attachmentPublicId}",
        description: "Soft deletes an attachment",
        tags: ["Attachments"],
        protect: true,
      },
    })
    .input(z.object({ attachmentPublicId: z.string().min(12) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const attachment = await cardAttachmentRepo.getByPublicId(
        ctx.db,
        input.attachmentPublicId,
      );

      if (!attachment || attachment.deletedAt)
        throw new TRPCError({
          message: `Attachment with public ID ${input.attachmentPublicId} not found`,
          code: "NOT_FOUND",
        });

      const workspaceId = attachment.card.list.board.workspaceId;

      await assertUserInWorkspace(ctx.db, userId, workspaceId);

      // Delete from local storage
      try {
        await deleteFile("attachments", attachment.filename);
      } catch (error) {
        apiLogger.error("Failed to delete attachment from storage", error, {
          filename: attachment.filename,
        });
      }

      await cardAttachmentRepo.softDelete(ctx.db, {
        attachmentId: attachment.id,
        deletedAt: new Date(),
      });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.attachment.removed",
        cardId: attachment.cardId,
        createdBy: userId,
      });

      return { success: true };
    }),
});

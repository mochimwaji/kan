import { TRPCError } from "@trpc/server";
import { env } from "next-runtime-env";
import { z } from "zod";

import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardCommentRepo from "@kan/db/repository/cardComment.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { apiLogger } from "@kan/logger";

import { createTRPCRouter, publicProcedure } from "../trpc";
import { assertUserInWorkspace } from "../utils/auth";
import { loggedProtectedProcedure as protectedProcedure } from "../utils/middleware";
import { getPublicUrl } from "../utils/storage";

export const cardRouter = createTRPCRouter({
  create: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a card",
        method: "POST",
        path: "/cards",
        description: "Creates a new card for a given list",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().max(10000),
        listPublicId: z.string().min(12),
        labelPublicIds: z.array(z.string().min(12)),
        memberPublicIds: z.array(z.string().min(12)),
        position: z.enum(["start", "end"]),
        dueDate: z.date().nullable().optional(),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof cardRepo.create>>>())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const list = await listRepo.getWorkspaceAndListIdByListPublicId(
        ctx.db,
        input.listPublicId,
      );

      if (!list)
        throw new TRPCError({
          message: `List with public ID ${input.listPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, list.workspaceId);

      const newCard = await cardRepo.create(ctx.db, {
        title: input.title,
        description: input.description,
        createdBy: userId,
        listId: list.id,
        position: input.position,
        dueDate: input.dueDate ?? null,
      });

      const newCardId = newCard.id;

      if (!newCardId)
        throw new TRPCError({
          message: `Failed to create card`,
          code: "INTERNAL_SERVER_ERROR",
        });

      if (newCardId && input.labelPublicIds.length) {
        const labels = await labelRepo.getAllByPublicIds(
          ctx.db,
          input.labelPublicIds,
        );

        if (!labels.length)
          throw new TRPCError({
            message: `Labels with public IDs (${input.labelPublicIds.join(", ")}) not found`,
            code: "NOT_FOUND",
          });

        const labelsInsert = labels.map((label) => ({
          cardId: newCardId,
          labelId: label.id,
        }));

        const cardLabels = await cardRepo.bulkCreateCardLabelRelationships(
          ctx.db,
          labelsInsert,
        );

        if (!cardLabels.length)
          throw new TRPCError({
            message: `Failed to create card label relationships`,
            code: "INTERNAL_SERVER_ERROR",
          });

        const cardActivitesInsert = cardLabels.map((cardLabel) => ({
          type: "card.updated.label.added" as const,
          cardId: cardLabel.cardId,
          labelId: cardLabel.labelId,
          createdBy: userId,
        }));

        await cardActivityRepo.bulkCreate(ctx.db, cardActivitesInsert);
      }

      if (newCardId && input.memberPublicIds.length) {
        const members = await workspaceRepo.getAllMembersByPublicIds(
          ctx.db,
          input.memberPublicIds,
        );

        if (!members.length)
          throw new TRPCError({
            message: `Members with public IDs (${input.memberPublicIds.join(", ")}) not found`,
            code: "NOT_FOUND",
          });

        const membersInsert = members.map((member) => ({
          cardId: newCardId,
          workspaceMemberId: member.id,
        }));

        const cardMembers =
          await cardRepo.bulkCreateCardWorkspaceMemberRelationships(
            ctx.db,
            membersInsert,
          );

        if (!cardMembers.length)
          throw new TRPCError({
            message: `Failed to create card member relationships`,
            code: "INTERNAL_SERVER_ERROR",
          });

        const cardActivitesInsert = cardMembers.map((cardMember) => ({
          type: "card.updated.member.added" as const,
          cardId: cardMember.cardId,
          workspaceMemberId: cardMember.workspaceMemberId,
          createdBy: userId,
        }));

        await cardActivityRepo.bulkCreate(ctx.db, cardActivitesInsert);
      }

      return newCard;
    }),
  addComment: protectedProcedure
    .meta({
      openapi: {
        summary: "Add a comment to a card",
        method: "POST",
        path: "/cards/{cardPublicId}/comments",
        description: "Adds a comment to a card",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        comment: z.string().min(1),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof cardCommentRepo.create>>>())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

      const newComment = await cardCommentRepo.create(ctx.db, {
        comment: input.comment,
        createdBy: userId,
        cardId: card.id,
      });

      if (!newComment?.id)
        throw new TRPCError({
          message: `Failed to create comment`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.comment.added" as const,
        cardId: card.id,
        commentId: newComment.id,
        toComment: newComment.comment,
        createdBy: userId,
      });

      return newComment;
    }),
  updateComment: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a comment",
        method: "PUT",
        path: "/cards/{cardPublicId}/comments/{commentPublicId}",
        description: "Updates a comment",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        commentPublicId: z.string().min(12),
        comment: z.string().min(1),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof cardCommentRepo.update>>>())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

      const existingComment = await cardCommentRepo.getByPublicId(
        ctx.db,
        input.commentPublicId,
      );

      if (!existingComment)
        throw new TRPCError({
          message: `Comment with public ID ${input.commentPublicId} not found`,
          code: "NOT_FOUND",
        });

      if (existingComment.createdBy !== userId)
        throw new TRPCError({
          message: `You do not have permission to update this comment`,
          code: "FORBIDDEN",
        });

      const updatedComment = await cardCommentRepo.update(ctx.db, {
        id: existingComment.id,
        comment: input.comment,
      });

      if (!updatedComment?.id)
        throw new TRPCError({
          message: `Failed to update comment`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.comment.updated" as const,
        cardId: card.id,
        commentId: updatedComment.id,
        fromComment: existingComment.comment,
        toComment: updatedComment.comment,
        createdBy: userId,
      });

      return updatedComment;
    }),
  deleteComment: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a comment",
        method: "DELETE",
        path: "/cards/{cardPublicId}/comments/{commentPublicId}",
        description: "Deletes a comment",
        tags: ["Cards"],
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        commentPublicId: z.string().min(12),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof cardCommentRepo.softDelete>>>())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

      const existingComment = await cardCommentRepo.getByPublicId(
        ctx.db,
        input.commentPublicId,
      );

      if (!existingComment)
        throw new TRPCError({
          message: `Comment with public ID ${input.commentPublicId} not found`,
          code: "NOT_FOUND",
        });

      const deletedComment = await cardCommentRepo.softDelete(ctx.db, {
        commentId: existingComment.id,
        deletedAt: new Date(),
        deletedBy: userId,
      });

      if (!deletedComment)
        throw new TRPCError({
          message: `Failed to delete comment`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.comment.deleted" as const,
        cardId: card.id,
        commentId: existingComment.id,
        createdBy: userId,
      });

      return deletedComment;
    }),
  addOrRemoveLabel: protectedProcedure
    .meta({
      openapi: {
        summary: "Add or remove a label from a card",
        method: "PUT",
        path: "/cards/{cardPublicId}/labels/{labelPublicId}",
        description: "Adds or removes a label from a card",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        labelPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ newLabel: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

      const label = await labelRepo.getByPublicId(ctx.db, input.labelPublicId);

      if (!label)
        throw new TRPCError({
          message: `Label with public ID ${input.labelPublicId} not found`,
          code: "NOT_FOUND",
        });

      const cardLabelIds = { cardId: card.id, labelId: label.id };

      const existingLabel = await cardRepo.getCardLabelRelationship(
        ctx.db,
        cardLabelIds,
      );

      if (existingLabel) {
        const deletedCardLabelRelationship =
          await cardRepo.hardDeleteCardLabelRelationship(ctx.db, cardLabelIds);

        if (!deletedCardLabelRelationship)
          throw new TRPCError({
            message: `Failed to remove label from card`,
            code: "INTERNAL_SERVER_ERROR",
          });

        await cardActivityRepo.create(ctx.db, {
          type: "card.updated.label.removed" as const,
          cardId: card.id,
          labelId: label.id,
          createdBy: userId,
        });

        return { newLabel: false };
      }

      const newCardLabelRelationship =
        await cardRepo.createCardLabelRelationship(ctx.db, cardLabelIds);

      if (!newCardLabelRelationship)
        throw new TRPCError({
          message: `Failed to add label to card`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.label.added" as const,
        cardId: card.id,
        labelId: label.id,
        createdBy: userId,
      });

      return { newLabel: true };
    }),
  addOrRemoveMember: protectedProcedure
    .meta({
      openapi: {
        summary: "Add or remove a member from a card",
        method: "PUT",
        path: "/cards/{cardPublicId}/members/{workspaceMemberPublicId}",
        description: "Adds or removes a member from a card",
        tags: ["Cards"],
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        workspaceMemberPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ newMember: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

      const member = await workspaceRepo.getMemberByPublicId(
        ctx.db,
        input.workspaceMemberPublicId,
      );

      if (!member)
        throw new TRPCError({
          message: `Member with public ID ${input.workspaceMemberPublicId} not found`,
          code: "NOT_FOUND",
        });

      const cardMemberIds = { cardId: card.id, memberId: member.id };

      const existingMember = await cardRepo.getCardMemberRelationship(
        ctx.db,
        cardMemberIds,
      );

      if (existingMember) {
        const deletedCardMemberRelationship =
          await cardRepo.hardDeleteCardMemberRelationship(
            ctx.db,
            cardMemberIds,
          );

        if (!deletedCardMemberRelationship.success)
          throw new TRPCError({
            message: `Failed to remove member from card`,
            code: "INTERNAL_SERVER_ERROR",
          });

        await cardActivityRepo.create(ctx.db, {
          type: "card.updated.member.removed" as const,
          cardId: card.id,
          workspaceMemberId: member.id,
          createdBy: userId,
        });

        return { newMember: false };
      }

      const newCardMemberRelationship =
        await cardRepo.createCardMemberRelationship(ctx.db, cardMemberIds);

      if (!newCardMemberRelationship.success)
        throw new TRPCError({
          message: `Failed to add member to card`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.member.added" as const,
        cardId: card.id,
        workspaceMemberId: member.id,
        createdBy: userId,
      });

      return { newMember: true };
    }),
  byId: publicProcedure
    .meta({
      openapi: {
        summary: "Get a card by public ID",
        method: "GET",
        path: "/cards/{cardPublicId}",
        description: "Retrieves a card by its public ID",
        tags: ["Cards"],
      },
    })
    .input(z.object({ cardPublicId: z.string().min(12) }))
    .output(
      z.custom<
        Omit<
          NonNullable<
            Awaited<ReturnType<typeof cardRepo.getWithListAndMembersByPublicId>>
          >,
          "attachments"
        > & {
          attachments: {
            publicId: string;
            contentType: string;
            s3Key: string;
            originalFilename: string | null;
            size?: number | null;
            url: string | null;
          }[];
        }
      >(),
    )
    .query(async ({ ctx, input }) => {
      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      if (card.workspaceVisibility === "private") {
        const userId = ctx.user?.id;
        if (!userId)
          throw new TRPCError({
            message: "User not authenticated",
            code: "UNAUTHORIZED",
          });
        await assertUserInWorkspace(ctx.db, userId, card.workspaceId);
      }

      const result = await cardRepo.getWithListAndMembersByPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!result)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      // Generate URLs for all attachments
      if (result.attachments && Array.isArray(result.attachments)) {
        const attachments = result.attachments as {
          publicId: string;
          contentType: string;
          s3Key: string;
          originalFilename: string | null;
          size?: number | null;
        }[];

        const attachmentsWithUrls = attachments.map((attachment) => {
          const base = {
            publicId: attachment.publicId,
            contentType: attachment.contentType,
            s3Key: attachment.s3Key,
            originalFilename: attachment.originalFilename,
            size: attachment.size,
          };
          if (!attachment.s3Key) {
            return { ...base, url: null };
          }
          try {
            const url = getPublicUrl(`attachments/${attachment.s3Key}`);
            return { ...base, url };
          } catch (error) {
            apiLogger.warn("Failed to generate storage URL", {
              key: attachment.s3Key,
              error: error instanceof Error ? error.message : String(error),
            });
            return { ...base, url: null };
          }
        });
        return { ...result, attachments: attachmentsWithUrls };
      }

      return { ...result, attachments: [] };
    }),
  update: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a card",
        method: "PUT",
        path: "/cards/{cardPublicId}",
        description: "Updates a card by its public ID",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        index: z.number().optional(),
        listPublicId: z.string().min(12).optional(),
        dueDate: z.date().nullable().optional(),
        calendarOrder: z.number().optional(),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof cardRepo.update>>>())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

      const existingCard = await cardRepo.getByPublicId(
        ctx.db,
        input.cardPublicId,
      );

      let newListId: number | undefined;

      if (input.listPublicId) {
        const newList = await listRepo.getByPublicId(
          ctx.db,
          input.listPublicId,
        );

        if (!newList)
          throw new TRPCError({
            message: `List with public ID ${input.listPublicId} not found`,
            code: "NOT_FOUND",
          });

        newListId = newList.id;
      }

      if (!existingCard) {
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });
      }

      let result:
        | Awaited<ReturnType<typeof cardRepo.update>>
        | Awaited<ReturnType<typeof cardRepo.reorder>>;

      const previousDueDate = existingCard.dueDate;

      if (
        input.title ||
        input.description ||
        input.dueDate !== undefined ||
        input.calendarOrder !== undefined
      ) {
        result = await cardRepo.update(
          ctx.db,
          {
            ...(input.title && { title: input.title }),
            ...(input.description && { description: input.description }),
            ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
            ...(input.calendarOrder !== undefined && {
              calendarOrder: input.calendarOrder,
            }),
          },
          { cardPublicId: input.cardPublicId },
        );
      }

      if (input.index !== undefined) {
        result = await cardRepo.reorder(ctx.db, {
          cardId: existingCard.id,
          newIndex: input.index,
          newListId: newListId,
        });
      }

      if (!result)
        throw new TRPCError({
          message: `Failed to update card`,
          code: "INTERNAL_SERVER_ERROR",
        });

      const activities = [];

      if (input.title && existingCard.title !== input.title) {
        activities.push({
          type: "card.updated.title" as const,
          cardId: result.id,
          createdBy: userId,
          fromTitle: existingCard.title,
          toTitle: input.title,
        });
      }

      if (input.description && existingCard.description !== input.description) {
        activities.push({
          type: "card.updated.description" as const,
          cardId: result.id,
          createdBy: userId,
          fromDescription: existingCard.description ?? undefined,
          toDescription: input.description,
        });
      }

      if (
        input.dueDate !== undefined &&
        previousDueDate?.getTime() !== input.dueDate?.getTime()
      ) {
        let activityType:
          | "card.updated.dueDate.added"
          | "card.updated.dueDate.updated"
          | "card.updated.dueDate.removed";

        if (!previousDueDate) {
          activityType = "card.updated.dueDate.added";
        } else if (!input.dueDate) {
          activityType = "card.updated.dueDate.removed";
        } else {
          activityType = "card.updated.dueDate.updated";
        }

        activities.push({
          type: activityType,
          cardId: result.id,
          createdBy: userId,
          fromDueDate: previousDueDate ?? undefined,
          toDueDate: input.dueDate ?? undefined,
        });
      }

      if (newListId && existingCard.listId !== newListId) {
        activities.push({
          type: "card.updated.list" as const,
          cardId: result.id,
          createdBy: userId,
          fromListId: existingCard.listId,
          toListId: newListId,
        });
      }

      if (activities.length > 0) {
        await cardActivityRepo.bulkCreate(ctx.db, activities);
      }

      return result;
    }),
  bulkMove: protectedProcedure
    .input(
      z.object({
        cardPublicIds: z.array(z.string().min(12)).min(1),
        listPublicId: z.string().min(12),
        startIndex: z.number().min(0),
      }),
    )
    .output(z.object({ success: z.boolean(), movedCount: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Get first card to validate workspace access
      const firstCard = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicIds[0]!,
      );

      if (!firstCard)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicIds[0]} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, firstCard.workspaceId);

      // Get destination list
      const destList = await listRepo.getByPublicId(ctx.db, input.listPublicId);
      if (!destList)
        throw new TRPCError({
          message: `List with public ID ${input.listPublicId} not found`,
          code: "NOT_FOUND",
        });

      // Resolve all card public IDs to internal IDs (preserving order)
      const cardIds: number[] = [];
      for (const publicId of input.cardPublicIds) {
        const c = await cardRepo.getByPublicId(ctx.db, publicId);
        if (c) cardIds.push(c.id);
      }

      if (cardIds.length === 0)
        throw new TRPCError({
          message: "No valid cards found",
          code: "NOT_FOUND",
        });

      // Perform atomic bulk move
      await cardRepo.bulkReorder(ctx.db, {
        cardIds,
        newListId: destList.id,
        startIndex: input.startIndex,
      });

      return { success: true, movedCount: cardIds.length };
    }),
  bulkUpdate: protectedProcedure
    .input(
      z.array(
        z.object({
          cardPublicId: z.string().min(12),
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          dueDate: z.date().nullable().optional(),
          calendarOrder: z.number().optional(),
        }),
      ),
    )
    .output(z.object({ success: z.boolean(), updatedCount: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      if (input.length === 0) {
        return { success: true, updatedCount: 0 };
      }

      // Get first card to validate workspace access
      const firstCard = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input[0]!.cardPublicId,
      );

      if (!firstCard)
        throw new TRPCError({
          message: `Card with public ID ${input[0]!.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, firstCard.workspaceId);

      // Update each card
      let updatedCount = 0;
      for (const update of input) {
        const existingCard = await cardRepo.getByPublicId(
          ctx.db,
          update.cardPublicId,
        );

        if (!existingCard) continue;

        const updateData: {
          title?: string;
          description?: string;
          dueDate?: Date | null;
          calendarOrder?: number;
        } = {};

        if (update.title !== undefined) updateData.title = update.title;
        if (update.description !== undefined)
          updateData.description = update.description;
        if (update.dueDate !== undefined) updateData.dueDate = update.dueDate;
        if (update.calendarOrder !== undefined)
          updateData.calendarOrder = update.calendarOrder;

        if (Object.keys(updateData).length > 0) {
          await cardRepo.update(ctx.db, updateData, {
            cardPublicId: update.cardPublicId,
          });
          updatedCount++;
        }
      }

      return { success: true, updatedCount };
    }),
  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a card",
        method: "DELETE",
        path: "/cards/{cardPublicId}",
        description: "Deletes a card by its public ID",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

      const deletedAt = new Date();

      await cardRepo.softDelete(ctx.db, {
        cardId: card.id,
        deletedAt,
        deletedBy: userId,
      });

      await cardActivityRepo.create(ctx.db, {
        type: "card.archived",
        cardId: card.id,
        createdBy: userId,
      });

      return { success: true };
    }),
});

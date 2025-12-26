import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { workspaceProcedure } from "../utils/middleware";

// Subscription type enum
const subscriptionTypeSchema = z.enum(["digest", "changes"]);

// Create subscription input
const createSubscriptionInput = z.object({
  workspacePublicId: z.string().min(12),
  type: subscriptionTypeSchema,
  boardPublicId: z.string().optional(),
  listPublicId: z.string().optional(),
  labelPublicId: z.string().optional(),
  memberPublicId: z.string().optional(),
  dueDateWithinDays: z.number().int().min(1).max(365).optional(),
  timezone: z.string().default("UTC"),
  notifyAtHour: z.number().int().min(0).max(23).default(9),
  frequencyDays: z.number().int().min(1).max(30).default(1),
});

// Update subscription input
const updateSubscriptionInput = z.object({
  subscriptionPublicId: z.string().min(12),
  type: subscriptionTypeSchema.optional(),
  boardPublicId: z.string().optional().nullable(),
  listPublicId: z.string().optional().nullable(),
  labelPublicId: z.string().optional().nullable(),
  memberPublicId: z.string().optional().nullable(),
  dueDateWithinDays: z.number().int().min(1).max(365).optional().nullable(),
  timezone: z.string().optional(),
  notifyAtHour: z.number().int().min(0).max(23).optional(),
  frequencyDays: z.number().int().min(1).max(30).optional(),
  enabled: z.boolean().optional(),
});

// Subscription router with nested subscription procedures
const subscriptionRouter = createTRPCRouter({
  // List subscriptions for a workspace
  list: workspaceProcedure.query(async ({ ctx }) => {
    const subscriptions = await subscriptionRepo.listByUserAndWorkspace(
      ctx.db,
      ctx.userId,
      ctx.workspace.id,
    );
    return subscriptions;
  }),

  // Get subscription by public ID
  byId: protectedProcedure
    .input(z.object({ subscriptionPublicId: z.string().min(12) }))
    .query(async ({ ctx, input }) => {
      const subscription = await subscriptionRepo.getByPublicId(
        ctx.db,
        input.subscriptionPublicId,
      );

      if (!subscription) {
        throw new TRPCError({
          message: "Subscription not found",
          code: "NOT_FOUND",
        });
      }

      // Verify user owns this subscription
      if (subscription.userId !== ctx.user.id) {
        throw new TRPCError({
          message: "Not authorized",
          code: "FORBIDDEN",
        });
      }

      return subscription;
    }),

  // Create a new subscription
  create: protectedProcedure
    .input(createSubscriptionInput)
    .mutation(async ({ ctx, input }) => {
      // Resolve workspace
      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );
      if (!workspace) {
        throw new TRPCError({
          message: "Workspace not found",
          code: "NOT_FOUND",
        });
      }

      // Verify user is in workspace
      const isInWorkspace = await workspaceRepo.isUserInWorkspace(
        ctx.db,
        ctx.user.id,
        workspace.id,
      );
      if (!isInWorkspace) {
        throw new TRPCError({
          message: "Not a member of this workspace",
          code: "FORBIDDEN",
        });
      }

      // Resolve optional filter IDs
      let boardId: number | undefined;
      let listId: number | undefined;
      let labelId: number | undefined;
      let memberId: number | undefined;

      if (input.boardPublicId) {
        const board = await boardRepo.getIdByPublicId(
          ctx.db,
          input.boardPublicId,
        );
        if (!board) {
          throw new TRPCError({
            message: "Board not found",
            code: "NOT_FOUND",
          });
        }
        boardId = board.id;
      }

      if (input.listPublicId) {
        const list = await listRepo.getByPublicId(ctx.db, input.listPublicId);
        if (!list) {
          throw new TRPCError({
            message: "List not found",
            code: "NOT_FOUND",
          });
        }
        listId = list.id;
      }

      if (input.labelPublicId) {
        const label = await labelRepo.getByPublicId(
          ctx.db,
          input.labelPublicId,
        );
        if (!label) {
          throw new TRPCError({
            message: "Label not found",
            code: "NOT_FOUND",
          });
        }
        labelId = label.id;
      }

      if (input.memberPublicId) {
        const member = await workspaceRepo.getMemberByPublicId(
          ctx.db,
          input.memberPublicId,
        );
        if (!member) {
          throw new TRPCError({
            message: "Member not found",
            code: "NOT_FOUND",
          });
        }
        memberId = member.id;
      }

      const subscription = await subscriptionRepo.create(ctx.db, {
        userId: ctx.user.id,
        workspaceId: workspace.id,
        type: input.type,
        boardId,
        listId,
        labelId,
        memberId,
        dueDateWithinDays: input.dueDateWithinDays,
        timezone: input.timezone,
        notifyAtHour: input.notifyAtHour,
        frequencyDays: input.frequencyDays,
      });

      return subscription;
    }),

  // Update a subscription
  update: protectedProcedure
    .input(updateSubscriptionInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await subscriptionRepo.getByPublicId(
        ctx.db,
        input.subscriptionPublicId,
      );

      if (!existing) {
        throw new TRPCError({
          message: "Subscription not found",
          code: "NOT_FOUND",
        });
      }

      if (existing.userId !== ctx.user.id) {
        throw new TRPCError({
          message: "Not authorized",
          code: "FORBIDDEN",
        });
      }

      // Resolve optional filter IDs if provided
      let boardId: number | null | undefined;
      let listId: number | null | undefined;
      let labelId: number | null | undefined;
      let memberId: number | null | undefined;

      if (input.boardPublicId !== undefined) {
        if (input.boardPublicId === null || input.boardPublicId === "") {
          boardId = null;
        } else {
          const board = await boardRepo.getIdByPublicId(
            ctx.db,
            input.boardPublicId,
          );
          if (board) boardId = board.id;
        }
      }

      if (input.listPublicId !== undefined) {
        if (input.listPublicId === null || input.listPublicId === "") {
          listId = null;
        } else {
          const list = await listRepo.getByPublicId(ctx.db, input.listPublicId);
          if (list) listId = list.id;
        }
      }

      if (input.labelPublicId !== undefined) {
        if (input.labelPublicId === null || input.labelPublicId === "") {
          labelId = null;
        } else {
          const label = await labelRepo.getByPublicId(
            ctx.db,
            input.labelPublicId,
          );
          if (label) labelId = label.id;
        }
      }

      if (input.memberPublicId !== undefined) {
        if (input.memberPublicId === null || input.memberPublicId === "") {
          memberId = null;
        } else {
          const member = await workspaceRepo.getMemberByPublicId(
            ctx.db,
            input.memberPublicId,
          );
          if (member) memberId = member.id;
        }
      }

      const subscription = await subscriptionRepo.update(ctx.db, existing.id, {
        type: input.type,
        boardId,
        listId,
        labelId,
        memberId,
        dueDateWithinDays: input.dueDateWithinDays,
        timezone: input.timezone,
        notifyAtHour: input.notifyAtHour,
        frequencyDays: input.frequencyDays,
        enabled: input.enabled,
      });

      return subscription;
    }),

  // Delete a subscription
  delete: protectedProcedure
    .input(z.object({ subscriptionPublicId: z.string().min(12) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await subscriptionRepo.getByPublicId(
        ctx.db,
        input.subscriptionPublicId,
      );

      if (!existing) {
        throw new TRPCError({
          message: "Subscription not found",
          code: "NOT_FOUND",
        });
      }

      if (existing.userId !== ctx.user.id) {
        throw new TRPCError({
          message: "Not authorized",
          code: "FORBIDDEN",
        });
      }

      await subscriptionRepo.deleteById(ctx.db, existing.id);

      return { success: true };
    }),

  // Public unsubscribe via token (subscription publicId)
  unsubscribe: protectedProcedure
    .input(
      z.object({
        token: z.string().min(12),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // Token is the subscription publicId
      const subscription = await subscriptionRepo.getByPublicId(
        ctx.db,
        input.token,
      );

      if (!subscription) {
        throw new TRPCError({
          message: "Invalid unsubscribe token",
          code: "NOT_FOUND",
        });
      }

      // For security, verify the user owns this subscription
      if (subscription.userId !== ctx.user.id) {
        throw new TRPCError({
          message: "Not authorized to unsubscribe",
          code: "FORBIDDEN",
        });
      }

      // Disable the subscription
      await subscriptionRepo.update(ctx.db, subscription.id, {
        enabled: false,
      });

      return { success: true };
    }),
});

// Main notification router
export const notificationRouter = createTRPCRouter({
  subscription: subscriptionRouter,

  // Test SMTP configuration by sending a test email
  testSmtp: protectedProcedure.mutation(async ({ ctx }) => {
    // Dynamic import to avoid issues if email package not configured
    const { sendEmail } = await import("@kan/email");

    const userEmail = ctx.user.email;
    if (!userEmail) {
      throw new TRPCError({
        message: "No email address found for your account",
        code: "BAD_REQUEST",
      });
    }

    try {
      await sendEmail(
        userEmail,
        "Kan Notification Test",
        "MAGIC_LINK", // Using existing template as a test
        {
          url: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
          host: "Kan Notifications",
        },
      );

      return { success: true, email: userEmail };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new TRPCError({
        message: `SMTP test failed: ${message}`,
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  }),

  // Test digest by sending a real digest email for a subscription
  testDigest: protectedProcedure
    .input(z.object({ subscriptionPublicId: z.string().min(12) }))
    .mutation(async ({ ctx, input }) => {
      const subscription = await subscriptionRepo.getByPublicId(
        ctx.db,
        input.subscriptionPublicId,
      );

      if (!subscription) {
        throw new TRPCError({
          message: "Subscription not found",
          code: "NOT_FOUND",
        });
      }

      if (subscription.userId !== ctx.user.id) {
        throw new TRPCError({
          message: "Not authorized",
          code: "FORBIDDEN",
        });
      }

      const userEmail = ctx.user.email;
      if (!userEmail) {
        throw new TRPCError({
          message: "No email address found for your account",
          code: "BAD_REQUEST",
        });
      }

      // Dynamic imports
      const { findMatchingCards } = await import(
        "../services/notification.service"
      );
      const { sendDigestEmail } = await import("@kan/email");

      try {
        // Get workspace info
        const workspace = await workspaceRepo.getById(
          ctx.db,
          subscription.workspaceId,
        );

        // Find matching cards
        const matchingCards = await findMatchingCards(ctx.db, {
          workspaceId: subscription.workspaceId,
          boardId: subscription.boardId,
          listId: subscription.listId,
          labelId: subscription.labelId,
          memberId: subscription.memberId,
          dueDateWithinDays: subscription.dueDateWithinDays,
        });

        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

        // Build card data for email
        const digestCards = matchingCards.map((card) => ({
          title: card.title,
          listName: card.listName,
          dueDate: card.dueDate ? card.dueDate.toLocaleDateString() : undefined,
          labels: card.labels,
          url: `${baseUrl}/b/${card.boardSlug}/c/${card.publicId}`,
        }));

        // Build filter description
        const filters: string[] = [];
        if (subscription.boardId) {
          filters.push("Board filter active");
        }
        if (subscription.dueDateWithinDays) {
          filters.push(`Due within ${subscription.dueDateWithinDays} days`);
        }

        // Send the test email
        await sendDigestEmail(userEmail, {
          userName: ctx.user.name || "there",
          workspaceName: workspace?.name ?? "Workspace",
          boardName: undefined,
          cards: digestCards,
          filterDescription:
            filters.length > 0 ? filters.join(", ") : undefined,
        });

        return {
          success: true,
          email: userEmail,
          cardCount: digestCards.length,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        throw new TRPCError({
          message: `Digest test failed: ${message}`,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
});

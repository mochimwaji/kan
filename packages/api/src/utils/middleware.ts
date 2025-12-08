/**
 * tRPC Middleware for logging and common patterns
 *
 * This module provides:
 * 1. Request/response logging middleware
 * 2. Reusable resource-scoped procedures (card, board, workspace, list)
 * 3. Helper types for extended context
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { apiLogger } from "@kan/logger";

import type { User } from "../trpc";
import { protectedProcedure, publicProcedure } from "../trpc";
import { assertUserInWorkspace } from "./auth";

// =============================================================================
// Types
// =============================================================================

/** Context with guaranteed userId for authenticated procedures */
export interface AuthedContext {
  userId: string;
  user: User;
}

/** Context with resolved card for card-scoped procedures */
export interface CardContext extends AuthedContext {
  card: {
    id: number;
    workspaceId: number;
    workspaceVisibility?: string;
  };
}

/** Context with resolved board for board-scoped procedures */
export interface BoardContext extends AuthedContext {
  board: {
    id: number;
    workspaceId: number;
  };
}

/** Context with resolved list for list-scoped procedures */
export interface ListContext extends AuthedContext {
  list: {
    id: number;
    workspaceId: number;
  };
}

/** Context with resolved workspace for workspace-scoped procedures */
export interface WorkspaceContext extends AuthedContext {
  workspace: {
    id: number;
  };
}

// =============================================================================
// Logging Middleware
// =============================================================================

/**
 * Middleware that logs request/response information.
 * Logs at info level for successful requests, error level for failures.
 * Includes timing information and user context when available.
 */
const loggingMiddleware = protectedProcedure.use(
  async ({ ctx, next, path, type }) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const userId = ctx.user.id;

    apiLogger.debug("Request started", {
      requestId,
      path,
      type,
      userId,
    });

    try {
      const result = await next({ ctx });
      const duration = Date.now() - startTime;

      apiLogger.info("Request completed", {
        requestId,
        path,
        type,
        userId,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      apiLogger.error("Request failed", error, {
        requestId,
        path,
        type,
        userId,
        duration,
        success: false,
      });

      throw error;
    }
  },
);

/**
 * Public procedure with request logging.
 * Use this for endpoints that don't require authentication but should be logged.
 */
export const loggedPublicProcedure = publicProcedure.use(
  async ({ ctx, next, path, type }) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const userId = ctx.user?.id;

    apiLogger.debug("Public request started", {
      requestId,
      path,
      type,
      userId,
    });

    try {
      const result = await next({ ctx });
      const duration = Date.now() - startTime;

      apiLogger.info("Public request completed", {
        requestId,
        path,
        type,
        userId,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      apiLogger.error("Public request failed", error, {
        requestId,
        path,
        type,
        userId,
        duration,
        success: false,
      });

      throw error;
    }
  },
);

/**
 * Protected procedure with request logging.
 * Combines authentication enforcement with request/response logging.
 */
export const loggedProtectedProcedure = loggingMiddleware;

// =============================================================================
// Resource-Scoped Procedures
// =============================================================================

/**
 * Card-scoped procedure.
 * Validates that the card exists and user has access to the workspace.
 * Adds `card` object to context with { id, workspaceId }.
 *
 * @example
 * ```ts
 * cardProcedure
 *   .input(z.object({ cardPublicId: z.string(), ... }))
 *   .mutation(async ({ ctx, input }) => {
 *     // ctx.card.id and ctx.userId are guaranteed to exist
 *     const result = await cardRepo.update(ctx.db, ctx.card.id, ...);
 *   })
 * ```
 */
export const cardProcedure = loggedProtectedProcedure
  .input(z.object({ cardPublicId: z.string().min(12) }))
  .use(async ({ ctx, input, next }) => {
    const userId = ctx.user.id;

    const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
      ctx.db,
      input.cardPublicId,
    );

    if (!card) {
      throw new TRPCError({
        message: `Card with public ID ${input.cardPublicId} not found`,
        code: "NOT_FOUND",
      });
    }

    await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

    return next({
      ctx: {
        ...ctx,
        userId,
        card: {
          id: card.id,
          workspaceId: card.workspaceId,
          workspaceVisibility: card.workspaceVisibility,
        },
      },
    });
  });

/**
 * Board-scoped procedure.
 * Validates that the board exists and user has access to the workspace.
 * Adds `board` object to context with { id, workspaceId }.
 */
export const boardProcedure = loggedProtectedProcedure
  .input(z.object({ boardPublicId: z.string().min(12) }))
  .use(async ({ ctx, input, next }) => {
    const userId = ctx.user.id;

    const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
      ctx.db,
      input.boardPublicId,
    );

    if (!board) {
      throw new TRPCError({
        message: `Board with public ID ${input.boardPublicId} not found`,
        code: "NOT_FOUND",
      });
    }

    await assertUserInWorkspace(ctx.db, userId, board.workspaceId);

    return next({
      ctx: {
        ...ctx,
        userId,
        board: {
          id: board.id,
          workspaceId: board.workspaceId,
        },
      },
    });
  });

/**
 * List-scoped procedure.
 * Validates that the list exists and user has access to the workspace.
 * Adds `list` object to context with { id, workspaceId }.
 */
export const listProcedure = loggedProtectedProcedure
  .input(z.object({ listPublicId: z.string().min(12) }))
  .use(async ({ ctx, input, next }) => {
    const userId = ctx.user.id;

    const list = await listRepo.getWorkspaceAndListIdByListPublicId(
      ctx.db,
      input.listPublicId,
    );

    if (!list) {
      throw new TRPCError({
        message: `List with public ID ${input.listPublicId} not found`,
        code: "NOT_FOUND",
      });
    }

    await assertUserInWorkspace(ctx.db, userId, list.workspaceId);

    return next({
      ctx: {
        ...ctx,
        userId,
        list: {
          id: list.id,
          workspaceId: list.workspaceId,
        },
      },
    });
  });

/**
 * Workspace-scoped procedure.
 * Validates that the workspace exists and user has access.
 * Adds `workspace` object to context with { id }.
 */
export const workspaceProcedure = loggedProtectedProcedure
  .input(z.object({ workspacePublicId: z.string().min(12) }))
  .use(async ({ ctx, input, next }) => {
    const userId = ctx.user.id;

    const workspace = await workspaceRepo.getByPublicId(
      ctx.db,
      input.workspacePublicId,
    );

    if (!workspace) {
      throw new TRPCError({
        message: `Workspace with public ID ${input.workspacePublicId} not found`,
        code: "NOT_FOUND",
      });
    }

    await assertUserInWorkspace(ctx.db, userId, workspace.id);

    return next({
      ctx: {
        ...ctx,
        userId,
        workspace: {
          id: workspace.id,
        },
      },
    });
  });

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to get userId from context with proper error handling.
 * Use this in procedures that use protectedProcedure but need explicit userId access.
 *
 * @deprecated Prefer using resource-scoped procedures which provide userId in context.
 */
export function requireUserId(user: User | null | undefined): string {
  if (!user?.id) {
    throw new TRPCError({
      message: "User not authenticated",
      code: "UNAUTHORIZED",
    });
  }
  return user.id;
}

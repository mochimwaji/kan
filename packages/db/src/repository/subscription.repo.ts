import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { SubscriptionType } from "@kan/db/schema";
import {
  notificationLogs,
  notificationQueue,
  notificationSubscriptions,
} from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a subscription by its internal ID.
 */
export const getById = (db: dbClient, id: number) => {
  return db.query.notificationSubscriptions.findFirst({
    where: eq(notificationSubscriptions.id, id),
  });
};

/**
 * Get a subscription by its public ID.
 */
export const getByPublicId = (db: dbClient, publicId: string) => {
  return db.query.notificationSubscriptions.findFirst({
    where: eq(notificationSubscriptions.publicId, publicId),
    with: {
      board: { columns: { publicId: true, name: true } },
      list: { columns: { publicId: true, name: true } },
      label: { columns: { publicId: true, name: true } },
      member: { columns: { publicId: true } },
    },
  });
};

/**
 * List all subscriptions for a user in a specific workspace.
 */
export const listByUserAndWorkspace = (
  db: dbClient,
  userId: string,
  workspaceId: number,
) => {
  return db.query.notificationSubscriptions.findMany({
    where: and(
      eq(notificationSubscriptions.userId, userId),
      eq(notificationSubscriptions.workspaceId, workspaceId),
    ),
    with: {
      board: { columns: { publicId: true, name: true } },
      list: { columns: { publicId: true, name: true } },
      label: { columns: { publicId: true, name: true } },
      member: { columns: { publicId: true } },
    },
    orderBy: [desc(notificationSubscriptions.createdAt)],
  });
};

/**
 * List all subscriptions for a user across all workspaces.
 */
export const listByUser = (db: dbClient, userId: string) => {
  return db.query.notificationSubscriptions.findMany({
    where: eq(notificationSubscriptions.userId, userId),
    with: {
      workspace: { columns: { publicId: true, name: true } },
      board: { columns: { publicId: true, name: true } },
    },
    orderBy: [desc(notificationSubscriptions.createdAt)],
  });
};

/**
 * Find all digest subscriptions that are due for notification.
 * Used by the scheduler to determine which digests to send.
 * @param now - Current time to check against
 * @param currentHour - Current hour (0-23) to match notifyAtHour
 */
export const listDueDigests = async (
  db: dbClient,
  now: Date,
  currentHour: number,
) => {
  return db.query.notificationSubscriptions.findMany({
    where: and(
      eq(notificationSubscriptions.type, "digest"),
      eq(notificationSubscriptions.enabled, true),
      eq(notificationSubscriptions.notifyAtHour, currentHour),
    ),
    with: {
      user: { columns: { id: true, email: true, name: true } },
      workspace: { columns: { id: true, publicId: true, name: true } },
      board: { columns: { id: true, publicId: true, name: true } },
      list: { columns: { id: true, publicId: true, name: true } },
      label: { columns: { id: true, publicId: true, name: true } },
      member: { columns: { id: true, publicId: true } },
    },
  });
};

/**
 * Find change subscriptions that match a specific board/list/label/member.
 * Used when a card activity occurs to find who to notify.
 */
export const findMatchingChangeSubscriptions = async (
  db: dbClient,
  workspaceId: number,
  boardId?: number,
  listId?: number,
  labelId?: number,
  memberId?: number,
) => {
  // Get all enabled "changes" subscriptions for this workspace
  const subscriptions = await db.query.notificationSubscriptions.findMany({
    where: and(
      eq(notificationSubscriptions.workspaceId, workspaceId),
      eq(notificationSubscriptions.type, "changes"),
      eq(notificationSubscriptions.enabled, true),
    ),
    with: {
      user: { columns: { id: true, email: true, name: true } },
      workspace: { columns: { publicId: true, name: true } },
    },
  });

  // Filter to those matching the activity context
  return subscriptions.filter((sub) => {
    // If subscription has a filter, it must match
    if (sub.boardId && sub.boardId !== boardId) return false;
    if (sub.listId && sub.listId !== listId) return false;
    if (sub.labelId && sub.labelId !== labelId) return false;
    if (sub.memberId && sub.memberId !== memberId) return false;
    return true;
  });
};

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

export interface CreateSubscriptionInput {
  userId: string;
  workspaceId: number;
  type: SubscriptionType;
  boardId?: number;
  listId?: number;
  labelId?: number;
  memberId?: number;
  dueDateWithinDays?: number;
  timezone?: string;
  notifyAtHour?: number;
  frequencyDays?: number;
}

/**
 * Create a new notification subscription.
 */
export const create = async (db: dbClient, input: CreateSubscriptionInput) => {
  const [subscription] = await db
    .insert(notificationSubscriptions)
    .values({
      publicId: generateUID(),
      userId: input.userId,
      workspaceId: input.workspaceId,
      type: input.type,
      boardId: input.boardId,
      listId: input.listId,
      labelId: input.labelId,
      memberId: input.memberId,
      dueDateWithinDays: input.dueDateWithinDays,
      timezone: input.timezone ?? "UTC",
      notifyAtHour: input.notifyAtHour ?? 9,
      frequencyDays: input.frequencyDays ?? 1,
      enabled: true,
    })
    .returning();

  return subscription;
};

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

export interface UpdateSubscriptionInput {
  type?: SubscriptionType;
  boardId?: number | null;
  listId?: number | null;
  labelId?: number | null;
  memberId?: number | null;
  dueDateWithinDays?: number | null;
  timezone?: string;
  notifyAtHour?: number;
  frequencyDays?: number;
  enabled?: boolean;
}

/**
 * Update an existing subscription.
 */
export const update = async (
  db: dbClient,
  subscriptionId: number,
  input: UpdateSubscriptionInput,
) => {
  const [subscription] = await db
    .update(notificationSubscriptions)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(notificationSubscriptions.id, subscriptionId))
    .returning();

  return subscription;
};

/**
 * Update the lastNotifiedAt timestamp after sending a digest.
 */
export const updateLastNotified = async (
  db: dbClient,
  subscriptionId: number,
) => {
  await db
    .update(notificationSubscriptions)
    .set({ lastNotifiedAt: new Date() })
    .where(eq(notificationSubscriptions.id, subscriptionId));
};

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete a subscription by ID.
 */
export const deleteById = async (db: dbClient, subscriptionId: number) => {
  await db
    .delete(notificationSubscriptions)
    .where(eq(notificationSubscriptions.id, subscriptionId));
};

// ============================================================================
// NOTIFICATION LOG OPERATIONS
// ============================================================================

/**
 * Log a sent notification.
 */
export const logNotification = async (
  db: dbClient,
  subscriptionId: number,
  cardCount: number,
  error?: string,
) => {
  const [log] = await db
    .insert(notificationLogs)
    .values({
      subscriptionId,
      cardCount,
      error,
    })
    .returning();

  return log;
};

// ============================================================================
// NOTIFICATION QUEUE OPERATIONS
// ============================================================================

/**
 * Queue a notification for async processing.
 */
export const queueNotification = async (
  db: dbClient,
  subscriptionId: number,
  activityId?: number,
) => {
  const [queued] = await db
    .insert(notificationQueue)
    .values({
      subscriptionId,
      activityId,
      status: "pending",
      attempts: 0,
    })
    .returning();

  return queued;
};

/**
 * Get pending notifications from queue for processing.
 */
export const getPendingQueue = async (db: dbClient, limit = 50) => {
  return db.query.notificationQueue.findMany({
    where: and(
      eq(notificationQueue.status, "pending"),
      lte(notificationQueue.attempts, 3), // Max 3 retries
    ),
    with: {
      subscription: {
        with: {
          user: { columns: { id: true, email: true, name: true } },
          workspace: { columns: { publicId: true, name: true } },
        },
      },
      activity: true,
    },
    orderBy: [notificationQueue.createdAt],
    limit,
  });
};

/**
 * Mark a queued notification as sent.
 */
export const markQueueSent = async (db: dbClient, queueId: number) => {
  await db
    .update(notificationQueue)
    .set({
      status: "sent",
      processedAt: new Date(),
    })
    .where(eq(notificationQueue.id, queueId));
};

/**
 * Mark a queued notification as failed and increment attempts.
 */
export const markQueueFailed = async (
  db: dbClient,
  queueId: number,
  error: string,
) => {
  // First get current attempts
  const current = await db.query.notificationQueue.findFirst({
    where: eq(notificationQueue.id, queueId),
    columns: { attempts: true },
  });

  const newAttempts = (current?.attempts ?? 0) + 1;

  await db
    .update(notificationQueue)
    .set({
      status: newAttempts >= 3 ? "failed" : "pending",
      attempts: newAttempts,
      error,
      processedAt: new Date(),
    })
    .where(eq(notificationQueue.id, queueId));
};

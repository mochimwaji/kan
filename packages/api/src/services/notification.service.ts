/**
 * Notification Service
 *
 * Handles processing notification subscriptions and sending emails.
 * - processDueDigests: Called by scheduler to send digest emails
 * - processQueuedNotifications: Called by scheduler to send queued immediate notifications
 * - queueChangeNotification: Called by card mutations to queue immediate notifications
 */

import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { DigestCard } from "@kan/email";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import {
  boards,
  cards,
  cardsToLabels,
  cardToWorkspaceMembers,
  labels,
  lists,
} from "@kan/db/schema";
import { sendCardChangeEmail, sendDigestEmail } from "@kan/email";
import { logger } from "@kan/logger";

/**
 * Find cards matching a subscription's filters.
 */
export async function findMatchingCards(
  db: dbClient,
  subscription: {
    workspaceId: number;
    boardId?: number | null;
    listId?: number | null;
    labelId?: number | null;
    memberId?: number | null;
    dueDateWithinDays?: number | null;
  },
): Promise<
  {
    id: number;
    title: string;
    publicId: string;
    dueDate: Date | null;
    listName: string;
    boardSlug: string;
    boardWorkspaceSlug: string;
    labels: string[];
  }[]
> {
  // Build the base query conditions - only include non-deleted cards
  const conditions = [isNull(cards.deletedAt)];

  // Filter by board if specified (board is in the workspace)
  if (subscription.boardId) {
    conditions.push(eq(lists.boardId, subscription.boardId));
  }

  // Filter by list if specified
  if (subscription.listId) {
    conditions.push(eq(cards.listId, subscription.listId));
  }

  // Filter by due date if specified
  if (subscription.dueDateWithinDays) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + subscription.dueDateWithinDays);

    conditions.push(
      and(gte(cards.dueDate, now), lte(cards.dueDate, futureDate))!,
    );
  }

  // Get cards with their list and board info
  const matchingCards = await db
    .select({
      id: cards.id,
      title: cards.title,
      publicId: cards.publicId,
      dueDate: cards.dueDate,
      listName: lists.name,
      boardSlug: boards.slug,
      boardWorkspaceId: boards.workspaceId,
    })
    .from(cards)
    .innerJoin(lists, eq(cards.listId, lists.id))
    .innerJoin(boards, eq(lists.boardId, boards.id))
    .where(and(...conditions));

  // If filtering by label, filter in memory for now
  let filteredCards = matchingCards;
  if (subscription.labelId) {
    const cardIdsWithLabel = await db
      .select({ cardId: cardsToLabels.cardId })
      .from(cardsToLabels)
      .where(eq(cardsToLabels.labelId, subscription.labelId));

    const labelCardIds = new Set(cardIdsWithLabel.map((c) => c.cardId));
    filteredCards = matchingCards.filter((c) => labelCardIds.has(c.id));
  }

  // If filtering by member, filter in memory
  if (subscription.memberId) {
    const cardIdsWithMember = await db
      .select({ cardId: cardToWorkspaceMembers.cardId })
      .from(cardToWorkspaceMembers)
      .where(
        eq(cardToWorkspaceMembers.workspaceMemberId, subscription.memberId),
      );

    const memberCardIds = new Set(cardIdsWithMember.map((c) => c.cardId));
    filteredCards = filteredCards.filter((c) => memberCardIds.has(c.id));
  }

  // Get labels for each card
  const cardIds = filteredCards.map((c) => c.id);
  const cardLabelData =
    cardIds.length > 0
      ? await db
          .select({
            cardId: cardsToLabels.cardId,
            labelName: labels.name,
          })
          .from(cardsToLabels)
          .innerJoin(labels, eq(cardsToLabels.labelId, labels.id))
          .where(inArray(cardsToLabels.cardId, cardIds))
      : [];

  // Group labels by card
  const labelsByCard = new Map<number, string[]>();
  for (const { cardId, labelName } of cardLabelData) {
    if (!labelsByCard.has(cardId)) {
      labelsByCard.set(cardId, []);
    }
    if (labelName) {
      labelsByCard.get(cardId)!.push(labelName);
    }
  }

  // TODO: Get workspace slug for URL building
  // For now, using empty string which will be fixed when we have workspace context
  return filteredCards.map((card) => ({
    id: card.id,
    title: card.title,
    publicId: card.publicId,
    dueDate: card.dueDate,
    listName: card.listName,
    boardSlug: card.boardSlug,
    boardWorkspaceSlug: "", // Will need to be resolved
    labels: labelsByCard.get(card.id) ?? [],
  }));
}

/**
 * Process all due digest subscriptions.
 * Called by the scheduler every hour.
 */
export async function processDueDigests(
  db: dbClient,
  baseUrl: string,
): Promise<{ processed: number; errors: number }> {
  const now = new Date();
  const currentHour = now.getUTCHours();

  logger.info("Processing due digests", { currentHour });

  const dueSubscriptions = await subscriptionRepo.listDueDigests(
    db,
    now,
    currentHour,
  );

  let processed = 0;
  let errors = 0;

  for (const subscription of dueSubscriptions) {
    try {
      // Check if we should send based on frequency
      if (subscription.lastNotifiedAt) {
        const daysSinceLast = Math.floor(
          (now.getTime() - subscription.lastNotifiedAt.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (daysSinceLast < (subscription.frequencyDays ?? 1)) {
          continue; // Skip, not time yet
        }
      }

      // Find matching cards
      const matchingCards = await findMatchingCards(db, {
        workspaceId: subscription.workspaceId,
        boardId: subscription.boardId,
        listId: subscription.listId,
        labelId: subscription.labelId,
        memberId: subscription.memberId,
        dueDateWithinDays: subscription.dueDateWithinDays,
      });

      // Build card data for email
      const digestCards: DigestCard[] = matchingCards.map((card) => ({
        title: card.title,
        listName: card.listName,
        dueDate: card.dueDate ? card.dueDate.toLocaleDateString() : undefined,
        labels: card.labels,
        url: `${baseUrl}/b/${card.boardSlug}/c/${card.publicId}`,
      }));

      // Build filter description
      const filters: string[] = [];
      if (subscription.board?.name) {
        filters.push(`Board: ${subscription.board.name}`);
      }
      if (subscription.list?.name) {
        filters.push(`List: ${subscription.list.name}`);
      }
      if (subscription.dueDateWithinDays) {
        filters.push(`Due within ${subscription.dueDateWithinDays} days`);
      }

      // Send the email
      if (subscription.user?.email) {
        await sendDigestEmail(subscription.user.email, {
          userName: subscription.user.name ?? "there",
          workspaceName: subscription.workspace?.name ?? "Workspace",
          boardName: subscription.board?.name,
          cards: digestCards,
          filterDescription:
            filters.length > 0 ? filters.join(", ") : undefined,
        });

        // Log the notification
        await subscriptionRepo.logNotification(
          db,
          subscription.id,
          digestCards.length,
        );

        // Update last notified timestamp
        await subscriptionRepo.updateLastNotified(db, subscription.id);

        processed++;
        logger.info("Digest sent", {
          subscriptionId: subscription.id,
          cardCount: digestCards.length,
        });
      }
    } catch (error) {
      errors++;
      logger.error("Failed to process digest", error, {
        subscriptionId: subscription.id,
      });

      // Log the error
      await subscriptionRepo.logNotification(
        db,
        subscription.id,
        0,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  logger.info("Digest processing complete", { processed, errors });
  return { processed, errors };
}

/**
 * Process queued immediate notifications.
 * Called by the scheduler periodically.
 */
export async function processQueuedNotifications(
  db: dbClient,
  baseUrl: string,
): Promise<{ processed: number; errors: number }> {
  const pending = await subscriptionRepo.getPendingQueue(db);

  let processed = 0;
  let errors = 0;

  for (const item of pending) {
    try {
      if (!item.subscription?.user?.email) {
        await subscriptionRepo.markQueueFailed(db, item.id, "No user email");
        errors++;
        continue;
      }

      // Get card and activity details - use available fields
      if (item.activity) {
        // Build a description from the activity type
        const changeDescription = item.activity.toTitle
          ? `Title changed to: ${item.activity.toTitle}`
          : item.activity.toDescription
            ? "Description updated"
            : item.activity.toComment
              ? "Comment added"
              : undefined;

        await sendCardChangeEmail(item.subscription.user.email, {
          userName: item.subscription.user.name ?? "there",
          cardTitle: item.activity.toTitle ?? "Card",
          cardUrl: `${baseUrl}/card/${item.activity.cardId}`,
          boardName: item.subscription.workspace?.name ?? "Board",
          listName: "List", // Would need to join to get actual list name
          changeType: item.activity.type,
          changeDescription,
          changedBy: "User", // Would need to join to get user name
          timestamp: item.activity.createdAt?.toLocaleString(),
        });
      }

      await subscriptionRepo.markQueueSent(db, item.id);
      processed++;
    } catch (error) {
      errors++;
      await subscriptionRepo.markQueueFailed(
        db,
        item.id,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  return { processed, errors };
}

/**
 * Queue an immediate notification for a card change.
 * Called by card mutations (fire-and-forget pattern).
 */
export async function queueChangeNotification(
  db: dbClient,
  workspaceId: number,
  activityId: number,
  context: {
    boardId?: number;
    listId?: number;
    labelId?: number;
    memberId?: number;
  },
): Promise<void> {
  try {
    // Find subscriptions that match this change
    const matchingSubscriptions =
      await subscriptionRepo.findMatchingChangeSubscriptions(
        db,
        workspaceId,
        context.boardId,
        context.listId,
        context.labelId,
        context.memberId,
      );

    // Queue notification for each matching subscription
    for (const subscription of matchingSubscriptions) {
      await subscriptionRepo.queueNotification(db, subscription.id, activityId);
    }

    if (matchingSubscriptions.length > 0) {
      logger.info("Queued change notifications", {
        activityId,
        subscriptionCount: matchingSubscriptions.length,
      });
    }
  } catch (error) {
    // Log but don't throw - this is fire-and-forget
    logger.error("Failed to queue change notification", error, { activityId });
  }
}

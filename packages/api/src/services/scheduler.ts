/**
 * Notification Scheduler
 *
 * Runs in-process with Next.js to process notification subscriptions.
 * - Runs every hour to check for due digest subscriptions
 * - Runs every minute to process queued immediate notifications
 */

import cron from "node-cron";

import type { dbClient } from "@kan/db/client";
import { logger } from "@kan/logger";

import {
  processDueDigests,
  processQueuedNotifications,
} from "./notification.service";

let isSchedulerStarted = false;

/**
 * Start the notification scheduler.
 * Should be called once during application startup.
 */
export function startNotificationScheduler(
  db: dbClient,
  baseUrl: string,
): void {
  // Prevent multiple scheduler instances
  if (isSchedulerStarted) {
    logger.info("Notification scheduler already running");
    return;
  }

  logger.info("Starting notification scheduler");

  // Process due digests every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    logger.info("Running scheduled digest check");
    try {
      const result = await processDueDigests(db, baseUrl);
      logger.info("Digest check complete", result);
    } catch (error) {
      logger.error("Scheduled digest processing failed", error);
    }
  });

  // Process queued notifications every minute
  cron.schedule("* * * * *", async () => {
    try {
      const result = await processQueuedNotifications(db, baseUrl);
      if (result.processed > 0 || result.errors > 0) {
        logger.info("Queue processing complete", result);
      }
    } catch (error) {
      logger.error("Scheduled queue processing failed", error);
    }
  });

  isSchedulerStarted = true;
  logger.info("Notification scheduler started");
}

/**
 * Check if the scheduler is running.
 */
export function isSchedulerRunning(): boolean {
  return isSchedulerStarted;
}

import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { cardActivities } from "./cards";
import { labels } from "./labels";
import { lists } from "./lists";
import { users } from "./users";
import { workspaceMembers, workspaces } from "./workspaces";

// Notification subscription types
export const subscriptionTypes = ["digest", "changes"] as const;
export type SubscriptionType = (typeof subscriptionTypes)[number];

// Main subscription table - workspace-scoped
export const notificationSubscriptions = pgTable("notification_subscription", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: bigint("workspaceId", { mode: "number" })
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),

  // Notification type: "digest" for scheduled summaries, "changes" for immediate
  type: varchar("type", { length: 20 }).notNull().$type<SubscriptionType>(),

  // Filters (nullable = no filter applied)
  boardId: bigint("boardId", { mode: "number" }).references(() => boards.id, {
    onDelete: "cascade",
  }),
  listId: bigint("listId", { mode: "number" }).references(() => lists.id, {
    onDelete: "cascade",
  }),
  labelId: bigint("labelId", { mode: "number" }).references(() => labels.id, {
    onDelete: "cascade",
  }),
  memberId: bigint("memberId", { mode: "number" }).references(
    () => workspaceMembers.id,
    { onDelete: "cascade" },
  ),
  dueDateWithinDays: integer("dueDateWithinDays"), // Cards due within X days

  // Schedule configuration (for digest type)
  timezone: varchar("timezone", { length: 64 }).default("UTC"),
  notifyAtHour: integer("notifyAtHour").default(9), // Hour of day (0-23)
  frequencyDays: integer("frequencyDays").default(1), // Every X days
  lastNotifiedAt: timestamp("lastNotifiedAt"),

  // Status
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
}).enableRLS();

export const notificationSubscriptionsRelations = relations(
  notificationSubscriptions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [notificationSubscriptions.userId],
      references: [users.id],
      relationName: "notificationSubscriptionsUser",
    }),
    workspace: one(workspaces, {
      fields: [notificationSubscriptions.workspaceId],
      references: [workspaces.id],
      relationName: "notificationSubscriptionsWorkspace",
    }),
    board: one(boards, {
      fields: [notificationSubscriptions.boardId],
      references: [boards.id],
      relationName: "notificationSubscriptionsBoard",
    }),
    list: one(lists, {
      fields: [notificationSubscriptions.listId],
      references: [lists.id],
      relationName: "notificationSubscriptionsList",
    }),
    label: one(labels, {
      fields: [notificationSubscriptions.labelId],
      references: [labels.id],
      relationName: "notificationSubscriptionsLabel",
    }),
    member: one(workspaceMembers, {
      fields: [notificationSubscriptions.memberId],
      references: [workspaceMembers.id],
      relationName: "notificationSubscriptionsMember",
    }),
    logs: many(notificationLogs),
    queue: many(notificationQueue),
  }),
);

// Notification log for tracking sent emails
export const notificationLogs = pgTable("notification_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  subscriptionId: bigint("subscriptionId", { mode: "number" })
    .notNull()
    .references(() => notificationSubscriptions.id, { onDelete: "cascade" }),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  cardCount: integer("cardCount"),
  error: text("error"),
}).enableRLS();

export const notificationLogsRelations = relations(
  notificationLogs,
  ({ one }) => ({
    subscription: one(notificationSubscriptions, {
      fields: [notificationLogs.subscriptionId],
      references: [notificationSubscriptions.id],
      relationName: "notificationLogsSubscription",
    }),
  }),
);

// Queue for immediate notifications (fire-and-forget with retry)
export const notificationQueue = pgTable("notification_queue", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  subscriptionId: bigint("subscriptionId", { mode: "number" })
    .notNull()
    .references(() => notificationSubscriptions.id, { onDelete: "cascade" }),
  activityId: bigint("activityId", { mode: "number" }).references(
    () => cardActivities.id,
    { onDelete: "cascade" },
  ),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, sent, failed
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
  error: text("error"),
}).enableRLS();

export const notificationQueueRelations = relations(
  notificationQueue,
  ({ one }) => ({
    subscription: one(notificationSubscriptions, {
      fields: [notificationQueue.subscriptionId],
      references: [notificationSubscriptions.id],
      relationName: "notificationQueueSubscription",
    }),
    activity: one(cardActivities, {
      fields: [notificationQueue.activityId],
      references: [cardActivities.id],
      relationName: "notificationQueueActivity",
    }),
  }),
);

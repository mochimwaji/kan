import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import {
  cardActivities,
  cards,
  cardsToLabels,
  cardToWorkspaceMembers,
} from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const create = async (
  db: dbClient,
  cardInput: {
    title: string;
    description: string;
    createdBy: string;
    listId: number;
    position: "start" | "end";
    dueDate?: Date | null;
  },
) => {
  return db.transaction(async (tx) => {
    let index = 0;

    if (cardInput.position === "end") {
      const lastCard = await tx.query.cards.findFirst({
        columns: {
          index: true,
        },
        where: and(eq(cards.listId, cardInput.listId), isNull(cards.deletedAt)),
        orderBy: desc(cards.index),
      });

      if (lastCard) index = lastCard.index + 1;
    }

    const getExistingCardAtIndex = async () =>
      tx.query.cards.findFirst({
        columns: {
          id: true,
        },
        where: and(
          eq(cards.listId, cardInput.listId),
          eq(cards.index, index),
          isNull(cards.deletedAt),
        ),
      });

    const existingCardAtIndex = await getExistingCardAtIndex();

    if (existingCardAtIndex?.id) {
      await tx.execute(sql`
        UPDATE card
        SET index = index + 1
        WHERE "listId" = ${cardInput.listId} AND index >= ${index} AND "deletedAt" IS NULL;
      `);
    }

    const result = await tx
      .insert(cards)
      .values({
        publicId: generateUID(),
        title: cardInput.title,
        description: cardInput.description,
        createdBy: cardInput.createdBy,
        listId: cardInput.listId,
        index: index,
        dueDate: cardInput.dueDate ?? null,
      })
      .returning({ id: cards.id, listId: cards.listId });

    if (!result[0]) throw new Error("Unable to create card");

    await tx.insert(cardActivities).values({
      publicId: generateUID(),
      cardId: result[0].id,
      type: "card.created",
      createdBy: cardInput.createdBy,
    });

    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);

    const duplicateIndices = await tx
      .select({
        index: cards.index,
        count: countExpr,
      })
      .from(cards)
      .where(and(eq(cards.listId, result[0].listId), isNull(cards.deletedAt)))
      .groupBy(cards.listId, cards.index)
      .having(gt(countExpr, 1));

    if (duplicateIndices.length > 0) {
      await tx.execute(sql`
        WITH ordered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY "index", id) - 1 AS new_index
          FROM "card"
          WHERE "listId" = ${result[0].listId} AND "deletedAt" IS NULL
        )
        UPDATE "card" c
        SET "index" = o.new_index
        FROM ordered o
        WHERE c.id = o.id;
      `);

      const postFixDupes = await tx
        .select({ index: cards.index, count: countExpr })
        .from(cards)
        .where(and(eq(cards.listId, result[0].listId), isNull(cards.deletedAt)))
        .groupBy(cards.listId, cards.index)
        .having(gt(countExpr, 1));

      if (postFixDupes.length > 0) {
        throw new Error(
          `Invariant violation: duplicate card indices remain after compaction in list ${result[0].listId}`,
        );
      }
    }

    return result[0];
  });
};

export const update = async (
  db: dbClient,
  cardInput: {
    title?: string;
    description?: string;
    dueDate?: Date | null;
    calendarOrder?: number;
  },
  args: {
    cardPublicId: string;
  },
) => {
  const [result] = await db
    .update(cards)
    .set({
      title: cardInput.title,
      description: cardInput.description,
      dueDate: cardInput.dueDate !== undefined ? cardInput.dueDate : undefined,
      calendarOrder: cardInput.calendarOrder ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(cards.publicId, args.cardPublicId), isNull(cards.deletedAt)))
    .returning({
      id: cards.id,
      publicId: cards.publicId,
      title: cards.title,
      description: cards.description,
      dueDate: cards.dueDate,
      calendarOrder: cards.calendarOrder,
    });

  return result;
};

export const bulkCreate = async (
  db: dbClient,
  cardInput: {
    publicId: string;
    title: string;
    description: string;
    createdBy: string;
    listId: number;
    index: number;
    importId?: number;
  }[],
) => {
  if (cardInput.length === 0) return [];

  return db.transaction(async (tx) => {
    const byList = new Map<number, typeof cardInput>();
    for (const item of cardInput) {
      const arr = byList.get(item.listId) ?? [];
      arr.push(item);
      byList.set(item.listId, arr);
    }

    const allValuesToInsert: {
      publicId: string;
      title: string;
      description: string;
      createdBy: string;
      listId: number;
      index: number;
      importId?: number;
    }[] = [];

    for (const [listId, items] of byList.entries()) {
      const last = await tx.query.cards.findFirst({
        columns: { index: true },
        where: and(eq(cards.listId, listId), isNull(cards.deletedAt)),
        orderBy: [desc(cards.index)],
      });

      let nextIndex = last ? last.index + 1 : 0;
      const sorted = [...items].sort((a, b) => a.index - b.index);
      for (const it of sorted) {
        allValuesToInsert.push({
          publicId: it.publicId,
          title: it.title,
          description: it.description,
          createdBy: it.createdBy,
          listId: it.listId,
          index: nextIndex++,
          importId: it.importId,
        });
      }
    }

    const inserted = await tx
      .insert(cards)
      .values(allValuesToInsert)
      .returning({ id: cards.id });

    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);
    for (const listId of byList.keys()) {
      const duplicateIndices = await tx
        .select({ index: cards.index, count: countExpr })
        .from(cards)
        .where(and(eq(cards.listId, listId), isNull(cards.deletedAt)))
        .groupBy(cards.listId, cards.index)
        .having(gt(countExpr, 1));

      if (duplicateIndices.length > 0) {
        await tx.execute(sql`
          WITH ordered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY "index", id) - 1 AS new_index
            FROM "card"
            WHERE "listId" = ${listId} AND "deletedAt" IS NULL
          )
          UPDATE "card" c
          SET "index" = o.new_index
          FROM ordered o
          WHERE c.id = o.id;
        `);

        const postFixDupes = await tx
          .select({ index: cards.index, count: countExpr })
          .from(cards)
          .where(and(eq(cards.listId, listId), isNull(cards.deletedAt)))
          .groupBy(cards.listId, cards.index)
          .having(gt(countExpr, 1));

        if (postFixDupes.length > 0) {
          throw new Error(
            `Invariant violation: duplicate card indices remain after compaction in list ${listId}`,
          );
        }
      }
    }

    return inserted;
  });
};

export const softDelete = async (
  db: dbClient,
  args: {
    cardId: number;
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  return db.transaction(async (tx) => {
    const [result] = await tx
      .update(cards)
      .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
      .where(eq(cards.id, args.cardId))
      .returning({
        id: cards.id,
        listId: cards.listId,
        index: cards.index,
      });

    if (!result)
      throw new Error(`Unable to soft delete card ID ${args.cardId}`);

    await tx.execute(sql`
      UPDATE card
      SET index = index - 1
      WHERE "listId" = ${result.listId} AND index > ${result.index} AND "deletedAt" IS NULL;
    `);

    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);

    const duplicateIndices = await tx
      .select({
        index: cards.index,
        count: countExpr,
      })
      .from(cards)
      .where(and(eq(cards.listId, result.listId), isNull(cards.deletedAt)))
      .groupBy(cards.listId, cards.index)
      .having(gt(countExpr, 1));

    if (duplicateIndices.length > 0) {
      throw new Error(
        `Duplicate indices found after soft deleting ${result.id}`,
      );
    }

    return result;
  });
};

export const softDeleteAllByListIds = async (
  db: dbClient,
  args: {
    listIds: number[];
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  const updatedCards = await db
    .update(cards)
    .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
    .where(and(inArray(cards.listId, args.listIds), isNull(cards.deletedAt)))
    .returning({
      id: cards.id,
    });

  return updatedCards;
};

// Relationship operations
export const bulkCreateCardLabelRelationships = async (
  db: dbClient,
  cardLabelRelationshipInput: {
    cardId: number;
    labelId: number;
  }[],
) => {
  return db
    .insert(cardsToLabels)
    .values(cardLabelRelationshipInput)
    .returning();
};

export const bulkCreateCardWorkspaceMemberRelationships = async (
  db: dbClient,
  cardWorkspaceMemberRelationshipInput: {
    cardId: number;
    workspaceMemberId: number;
  }[],
) => {
  return db
    .insert(cardToWorkspaceMembers)
    .values(cardWorkspaceMemberRelationshipInput)
    .returning();
};

export const createCardLabelRelationship = async (
  db: dbClient,
  cardLabelRelationshipInput: { cardId: number; labelId: number },
) => {
  const [result] = await db
    .insert(cardsToLabels)
    .values({
      cardId: cardLabelRelationshipInput.cardId,
      labelId: cardLabelRelationshipInput.labelId,
    })
    .returning();

  return result;
};

export const createCardMemberRelationship = async (
  db: dbClient,
  cardMemberRelationshipInput: { cardId: number; memberId: number },
) => {
  const [result] = await db
    .insert(cardToWorkspaceMembers)
    .values({
      cardId: cardMemberRelationshipInput.cardId,
      workspaceMemberId: cardMemberRelationshipInput.memberId,
    })
    .returning();

  return { success: !!result };
};

export const hardDeleteCardMemberRelationship = async (
  db: dbClient,
  args: { cardId: number; memberId: number },
) => {
  const [result] = await db
    .delete(cardToWorkspaceMembers)
    .where(
      and(
        eq(cardToWorkspaceMembers.cardId, args.cardId),
        eq(cardToWorkspaceMembers.workspaceMemberId, args.memberId),
      ),
    )
    .returning();

  return { success: !!result };
};

export const hardDeleteCardLabelRelationship = async (
  db: dbClient,
  args: { cardId: number; labelId: number },
) => {
  const [result] = await db
    .delete(cardsToLabels)
    .where(
      and(
        eq(cardsToLabels.cardId, args.cardId),
        eq(cardsToLabels.labelId, args.labelId),
      ),
    )
    .returning();

  return result;
};

export const hardDeleteAllCardLabelRelationships = async (
  db: dbClient,
  labelId: number,
) => {
  const [result] = await db
    .delete(cardsToLabels)
    .where(eq(cardsToLabels.labelId, labelId))
    .returning();

  return result;
};

import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { cards, lists } from "@kan/db/schema";

export const reorder = async (
  db: dbClient,
  args: {
    newListId: number | undefined;
    newIndex: number | undefined;
    cardId: number;
  },
) => {
  return db.transaction(async (tx) => {
    const card = await tx.query.cards.findFirst({
      columns: {
        id: true,
        index: true,
      },
      where: and(eq(cards.id, args.cardId), isNull(cards.deletedAt)),
      with: {
        list: {
          columns: {
            id: true,
            index: true,
          },
        },
      },
    });

    if (!card?.list)
      throw new Error(`Card not found for public ID ${args.cardId}`);

    const currentList = card.list;
    const currentIndex = card.index;
    let newList:
      | { id: number; index: number; cards: { id: number; index: number }[] }
      | undefined;

    if (args.newListId) {
      newList = await tx.query.lists.findFirst({
        columns: {
          id: true,
          index: true,
        },
        with: {
          cards: {
            columns: {
              id: true,
              index: true,
            },
            orderBy: desc(cards.index),
            limit: 1,
          },
        },
        where: and(eq(lists.id, args.newListId), isNull(lists.deletedAt)),
      });

      if (!newList)
        throw new Error(`List not found for public ID ${args.newListId}`);
    }

    let newIndex = args.newIndex;

    if (newIndex === undefined) {
      const lastCardIndex = newList?.cards.length
        ? newList.cards[0]?.index
        : undefined;

      newIndex = lastCardIndex !== undefined ? lastCardIndex + 1 : 0;
    }

    if (currentList.id === newList?.id) {
      await tx.execute(sql`
        UPDATE card
        SET index =
          CASE
            WHEN index = ${currentIndex} THEN ${newIndex}
            WHEN ${currentIndex} < ${newIndex} AND index > ${currentIndex} AND index <= ${newIndex} THEN index - 1
            WHEN ${currentIndex} > ${newIndex} AND index >= ${newIndex} AND index < ${currentIndex} THEN index + 1
            ELSE index
          END
        WHERE "listId" = ${currentList.id} AND "deletedAt" IS NULL;
      `);
    } else {
      await tx.execute(sql`
        UPDATE card
        SET index = index + 1
        WHERE "listId" = ${newList?.id} AND index >= ${newIndex} AND "deletedAt" IS NULL;
      `);

      await tx.execute(sql`
        UPDATE card
        SET index = index - 1
        WHERE "listId" = ${currentList.id} AND index >= ${currentIndex} AND "deletedAt" IS NULL;
      `);

      await tx.execute(sql`
        UPDATE card
        SET "listId" = ${newList?.id}, index = ${newIndex}
        WHERE id = ${card.id} AND "deletedAt" IS NULL;
      `);
    }

    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);

    const duplicateIndices = await tx
      .select({
        index: cards.index,
        count: countExpr,
      })
      .from(cards)
      .where(
        and(
          inArray(
            cards.listId,
            [currentList.id, newList?.id].filter((id) => id !== undefined),
          ),
          isNull(cards.deletedAt),
        ),
      )
      .groupBy(cards.listId, cards.index)
      .having(gt(countExpr, 1));

    if (duplicateIndices.length > 0) {
      // Auto-heal by compacting indices for the affected list(s)
      const affectedListIds = [currentList.id, newList?.id].filter(
        (id): id is number => id !== undefined,
      );

      if (affectedListIds.length === 1) {
        await tx.execute(sql`
          WITH ordered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY "index", id) - 1 AS new_index
            FROM "card"
            WHERE "listId" = ${affectedListIds[0]} AND "deletedAt" IS NULL
          )
          UPDATE "card" c
          SET "index" = o.new_index
          FROM ordered o
          WHERE c.id = o.id;
        `);
      } else if (affectedListIds.length === 2) {
        await tx.execute(sql`
          WITH ordered AS (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY "listId" ORDER BY "index", id) - 1 AS new_index
            FROM "card"
            WHERE "listId" IN (${sql.join(affectedListIds, sql`,`)}) AND "deletedAt" IS NULL
          )
          UPDATE "card" c
          SET "index" = o.new_index
          FROM ordered o
          WHERE c.id = o.id;
        `);
      }

      // Verify fix
      const postFixDupes = await tx
        .select({ index: cards.index, count: countExpr })
        .from(cards)
        .where(
          and(inArray(cards.listId, affectedListIds), isNull(cards.deletedAt)),
        )
        .groupBy(cards.listId, cards.index)
        .having(gt(countExpr, 1));

      if (postFixDupes.length > 0) {
        throw new Error(
          `Invariant violation: duplicate card indices remain after compaction for card ${card.id}`,
        );
      }
    }

    const updatedCard = await tx.query.cards.findFirst({
      columns: {
        id: true,
        publicId: true,
        title: true,
        description: true,
        dueDate: true,
        calendarOrder: true,
      },
      where: eq(cards.id, card.id),
    });

    return updatedCard;
  });
};

export const bulkReorder = async (
  db: dbClient,
  args: {
    cardIds: number[];
    newListId: number;
    startIndex: number;
  },
) => {
  if (args.cardIds.length === 0) return [];

  return db.transaction(async (tx) => {
    // Get current list info for each card
    const cardsToMove = await tx.query.cards.findMany({
      columns: { id: true, index: true, listId: true },
      where: and(inArray(cards.id, args.cardIds), isNull(cards.deletedAt)),
    });

    if (cardsToMove.length === 0) {
      throw new Error("No cards found to move");
    }

    const sourceListIds = [...new Set(cardsToMove.map((c) => c.listId))];

    // Temp: negative to avoid conflicts
    await tx
      .update(cards)
      .set({ index: sql`-1 * id` })
      .where(inArray(cards.id, args.cardIds));

    for (const listId of sourceListIds) {
      await tx.execute(sql`
        WITH ordered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY "index", id) - 1 AS new_index
          FROM "card"
          WHERE "listId" = ${listId} AND "deletedAt" IS NULL AND "index" >= 0
        )
        UPDATE "card" c
        SET "index" = o.new_index
        FROM ordered o
        WHERE c.id = o.id;
      `);
    }

    const numCards = args.cardIds.length;
    await tx.execute(sql`
      UPDATE card
      SET index = index + ${numCards}
      WHERE "listId" = ${args.newListId} AND index >= ${args.startIndex} AND "deletedAt" IS NULL;
    `);

    for (let i = 0; i < args.cardIds.length; i++) {
      const cardId = args.cardIds[i];
      if (cardId === undefined) continue;
      await tx
        .update(cards)
        .set({ listId: args.newListId, index: args.startIndex + i })
        .where(eq(cards.id, cardId));
    }

    const affectedListIds = [...new Set([...sourceListIds, args.newListId])];
    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);

    const duplicateIndices = await tx
      .select({ listId: cards.listId, index: cards.index, count: countExpr })
      .from(cards)
      .where(
        and(inArray(cards.listId, affectedListIds), isNull(cards.deletedAt)),
      )
      .groupBy(cards.listId, cards.index)
      .having(gt(countExpr, 1));

    if (duplicateIndices.length > 0) {
      await tx.execute(sql`
        WITH ordered AS (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY "listId" ORDER BY "index", id) - 1 AS new_index
          FROM "card"
          WHERE "listId" IN (${sql.join(affectedListIds, sql`,`)}) AND "deletedAt" IS NULL
        )
        UPDATE "card" c
        SET "index" = o.new_index
        FROM ordered o
        WHERE c.id = o.id;
      `);

      // Verify fix
      const postFixDupes = await tx
        .select({ count: countExpr })
        .from(cards)
        .where(
          and(inArray(cards.listId, affectedListIds), isNull(cards.deletedAt)),
        )
        .groupBy(cards.listId, cards.index)
        .having(gt(countExpr, 1));

      if (postFixDupes.length > 0) {
        throw new Error(
          "Invariant violation: duplicate card indices after bulk reorder",
        );
      }
    }

    // Return moved cards
    return tx.query.cards.findMany({
      columns: { id: true, publicId: true, index: true, listId: true },
      where: inArray(cards.id, args.cardIds),
    });
  });
};

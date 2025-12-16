import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
} from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { BoardVisibilityStatus } from "@kan/db/schema";
import {
  boards,
  cardActivities,
  cardAttachments,
  cards,
  cardsToLabels,
  cardToWorkspaceMembers,
  checklistItems,
  checklists,
  comments,
  labels,
  lists,
  workspaceMembers,
} from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

/**
 * Retrieves all boards for a workspace with their lists and labels.
 * @param db - Database client instance
 * @param workspaceId - Internal workspace ID
 * @param opts - Optional filters for board type
 * @returns Array of boards with publicId, name, lists, and labels
 */
export const getAllByWorkspaceId = (
  db: dbClient,
  workspaceId: number,
  opts?: { type?: "regular" | "template" },
) => {
  return db.query.boards.findMany({
    columns: {
      publicId: true,
      name: true,
    },
    with: {
      lists: {
        columns: {
          publicId: true,
          name: true,
          index: true,
        },
        orderBy: [asc(lists.index)],
      },
      labels: {
        columns: {
          publicId: true,
          name: true,
          colourCode: true,
        },
      },
    },
    where: and(
      eq(boards.workspaceId, workspaceId),
      isNull(boards.deletedAt),
      opts?.type ? eq(boards.type, opts.type) : undefined,
    ),
  });
};

/**
 * Retrieves the internal board ID and type by public ID.
 * @param db - Database client instance
 * @param boardPublicId - Public board identifier
 * @returns Board with internal id and type, or undefined if not found
 */
export const getIdByPublicId = async (db: dbClient, boardPublicId: string) => {
  const board = await db.query.boards.findFirst({
    columns: {
      id: true,
      type: true,
    },
    where: eq(boards.publicId, boardPublicId),
  });

  return board;
};

/**
 * Filter configuration for card due dates.
 * Used to filter cards by date ranges or by absence of due date.
 */
interface DueDateFilter {
  /** Start of date range (inclusive) */
  startDate?: Date;
  /** End of date range (exclusive) */
  endDate?: Date;
  /** If true, matches cards without any due date */
  hasNoDueDate?: boolean;
}

/**
 * Builds a Drizzle ORM where clause for filtering cards by due date.
 * Supports multiple filter conditions combined with OR logic.
 * @param filters - Array of due date filter configurations
 * @returns Drizzle where clause or undefined if no filters
 */
const buildDueDateWhere = (filters: DueDateFilter[]) => {
  if (!filters.length) return undefined;

  const clauses = filters
    .map((filter) => {
      const conditions: ReturnType<typeof and>[] = [];

      if (filter.hasNoDueDate) {
        conditions.push(isNull(cards.dueDate));
      } else {
        conditions.push(isNotNull(cards.dueDate));

        if (filter.startDate)
          conditions.push(gte(cards.dueDate, filter.startDate));

        if (filter.endDate) conditions.push(lt(cards.dueDate, filter.endDate));
      }

      return conditions.length > 0 ? and(...conditions) : undefined;
    })
    .filter((clause): clause is NonNullable<typeof clause> => !!clause);

  if (!clauses.length) return undefined;

  return or(...clauses);
};

/**
 * Retrieves a board by its public ID with full nested data.
 * Includes workspace members, labels, lists with cards, and all card relations.
 * Supports filtering by members, labels, lists, and due dates.
 * @param db - Database client instance
 * @param boardPublicId - Public board identifier
 * @param filters - Filter configuration for members, labels, lists, due dates, and board type
 * @returns Formatted board with nested data or null if not found
 */
export const getByPublicId = async (
  db: dbClient,
  boardPublicId: string,
  filters: {
    members: string[];
    labels: string[];
    lists: string[];
    dueDate: DueDateFilter[];
    type: "regular" | "template" | undefined;
  },
) => {
  let cardIds: string[] = [];

  if (filters.labels.length > 0 || filters.members.length > 0) {
    const filteredCards = await db
      .select({
        publicId: cards.publicId,
      })
      .from(cards)
      .leftJoin(cardsToLabels, eq(cards.id, cardsToLabels.cardId))
      .leftJoin(labels, eq(cardsToLabels.labelId, labels.id))
      .leftJoin(
        cardToWorkspaceMembers,
        eq(cards.id, cardToWorkspaceMembers.cardId),
      )
      .leftJoin(
        workspaceMembers,
        eq(cardToWorkspaceMembers.workspaceMemberId, workspaceMembers.id),
      )
      .where(
        and(
          isNull(cards.deletedAt),
          or(
            filters.labels.length > 0
              ? inArray(labels.publicId, filters.labels)
              : undefined,
            filters.members.length > 0
              ? inArray(workspaceMembers.publicId, filters.members)
              : undefined,
          ),
        ),
      );

    cardIds = filteredCards.map((card) => card.publicId);
  }

  const board = await db.query.boards.findFirst({
    columns: {
      publicId: true,
      name: true,
      slug: true,
      visibility: true,
    },
    with: {
      workspace: {
        columns: {
          publicId: true,
        },
        with: {
          members: {
            columns: {
              publicId: true,
              email: true,
            },
            with: {
              user: {
                columns: {
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            where: isNull(workspaceMembers.deletedAt),
          },
        },
      },
      labels: {
        columns: {
          publicId: true,
          name: true,
          colourCode: true,
        },
        where: isNull(labels.deletedAt),
      },
      lists: {
        columns: {
          publicId: true,
          name: true,
          boardId: true,
          index: true,
          color: true,
        },
        with: {
          cards: {
            columns: {
              publicId: true,
              title: true,
              description: true,
              listId: true,
              index: true,
              dueDate: true,
            },
            with: {
              labels: {
                with: {
                  label: {
                    columns: {
                      publicId: true,
                      name: true,
                      colourCode: true,
                    },
                  },
                },
              },
              members: {
                with: {
                  member: {
                    columns: {
                      publicId: true,
                      email: true,
                      deletedAt: true,
                    },
                    with: {
                      user: {
                        columns: {
                          name: true,
                          email: true,
                          image: true,
                        },
                      },
                    },
                  },
                },
              },
              attachments: {
                columns: {
                  publicId: true,
                },
                where: isNull(cardAttachments.deletedAt),
                orderBy: asc(cardAttachments.createdAt),
              },
              checklists: {
                columns: {
                  publicId: true,
                  name: true,
                  index: true,
                },
                where: isNull(checklists.deletedAt),
                orderBy: asc(checklists.index),
                with: {
                  items: {
                    columns: {
                      publicId: true,
                      title: true,
                      completed: true,
                      index: true,
                    },
                    where: isNull(checklistItems.deletedAt),
                    orderBy: asc(checklistItems.index),
                  },
                },
              },
              comments: {
                columns: {
                  publicId: true,
                },
                where: isNull(comments.deletedAt),
                limit: 1,
              },
            },
            where: and(
              cardIds.length > 0 ? inArray(cards.publicId, cardIds) : undefined,
              isNull(cards.deletedAt),
              buildDueDateWhere(filters.dueDate),
            ),
            orderBy: [asc(cards.index)],
          },
        },
        where: and(
          isNull(lists.deletedAt),
          filters.lists.length > 0
            ? inArray(lists.publicId, filters.lists)
            : undefined,
        ),
        orderBy: [asc(lists.index)],
      },
      allLists: {
        columns: {
          publicId: true,
          name: true,
        },
        where: isNull(lists.deletedAt),
        orderBy: [asc(lists.index)],
      },
    },
    where: and(
      eq(boards.publicId, boardPublicId),
      isNull(boards.deletedAt),
      eq(boards.type, filters.type ?? "regular"),
    ),
  });

  if (!board) return null;

  const formattedResult = {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => ({
        ...card,
        labels: card.labels.map((label) => label.label),
        members: card.members
          .map((member) => member.member)
          .filter((member) => member.deletedAt === null),
      })),
    })),
  };

  return formattedResult;
};

/**
 * Retrieves a public board by its slug and workspace.
 * Similar to getByPublicId but for public board access.
 * Only returns boards with visibility set to 'public'.
 * @param db - Database client instance
 * @param boardSlug - URL-friendly board slug
 * @param workspaceId - Internal workspace ID
 * @param filters - Filter configuration for members, labels, lists, and due dates
 * @returns Formatted board with nested data or null if not found
 */
export const getBySlug = async (
  db: dbClient,
  boardSlug: string,
  workspaceId: number,
  filters: {
    members: string[];
    labels: string[];
    lists: string[];
    dueDate: DueDateFilter[];
  },
) => {
  let cardIds: string[] = [];

  if (filters.labels.length) {
    const filteredCards = await db
      .select({
        publicId: cards.publicId,
      })
      .from(cards)
      .leftJoin(cardsToLabels, eq(cards.id, cardsToLabels.cardId))
      .leftJoin(labels, eq(cardsToLabels.labelId, labels.id))
      .where(
        and(
          isNull(cards.deletedAt),
          filters.labels.length > 0
            ? inArray(labels.publicId, filters.labels)
            : undefined,
        ),
      );

    cardIds = filteredCards.map((card) => card.publicId);
  }

  const board = await db.query.boards.findFirst({
    columns: {
      publicId: true,
      name: true,
      slug: true,
      visibility: true,
    },
    with: {
      workspace: {
        columns: {
          publicId: true,
          name: true,
          slug: true,
        },
      },
      labels: {
        columns: {
          publicId: true,
          name: true,
          colourCode: true,
        },
        where: isNull(labels.deletedAt),
      },
      lists: {
        columns: {
          publicId: true,
          name: true,
          boardId: true,
          index: true,
          color: true,
        },
        with: {
          cards: {
            columns: {
              publicId: true,
              title: true,
              description: true,
              listId: true,
              index: true,
              dueDate: true,
            },
            with: {
              labels: {
                with: {
                  label: {
                    columns: {
                      publicId: true,
                      name: true,
                      colourCode: true,
                    },
                  },
                },
              },
              attachments: {
                columns: {
                  publicId: true,
                },
                where: isNull(cardAttachments.deletedAt),
                orderBy: asc(cardAttachments.createdAt),
              },
              comments: {
                columns: {
                  publicId: true,
                },
                where: isNull(comments.deletedAt),
                limit: 1,
              },
              checklists: {
                columns: {
                  publicId: true,
                  name: true,
                  index: true,
                },
                where: isNull(checklists.deletedAt),
                orderBy: asc(checklists.index),
                with: {
                  items: {
                    columns: {
                      publicId: true,
                      title: true,
                      completed: true,
                      index: true,
                    },
                    where: isNull(checklistItems.deletedAt),
                    orderBy: asc(checklistItems.index),
                  },
                },
              },
            },
            where: and(
              cardIds.length > 0 ? inArray(cards.publicId, cardIds) : undefined,
              isNull(cards.deletedAt),
              buildDueDateWhere(filters.dueDate),
            ),
            orderBy: [asc(cards.index)],
          },
        },
        where: and(
          isNull(lists.deletedAt),
          filters.lists.length > 0
            ? inArray(lists.publicId, filters.lists)
            : undefined,
        ),
        orderBy: [asc(lists.index)],
      },
      allLists: {
        columns: {
          publicId: true,
          name: true,
        },
        where: isNull(lists.deletedAt),
        orderBy: [asc(lists.index)],
      },
    },
    where: and(
      eq(boards.slug, boardSlug),
      eq(boards.workspaceId, workspaceId),
      isNull(boards.deletedAt),
      eq(boards.visibility, "public"),
    ),
  });

  if (!board) return null;

  const formattedResult = {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => ({
        ...card,
        labels: card.labels.map((label) => label.label),
      })),
    })),
  };

  return formattedResult;
};

/**
 * Retrieves a board with its list IDs by public ID.
 * Lightweight query for operations that only need list references.
 * @param db - Database client instance
 * @param boardPublicId - Public board identifier
 * @returns Board with internal id, workspaceId, and list ids
 */
export const getWithListIdsByPublicId = (
  db: dbClient,
  boardPublicId: string,
) => {
  return db.query.boards.findFirst({
    columns: {
      id: true,
      workspaceId: true,
    },
    with: {
      lists: {
        columns: {
          id: true,
        },
      },
    },
    where: eq(boards.publicId, boardPublicId),
  });
};

/**
 * Retrieves a board with the latest list index for ordering new lists.
 * @param db - Database client instance
 * @param boardPublicId - Public board identifier
 * @returns Board with latest list index or empty lists array
 */
export const getWithLatestListIndexByPublicId = (
  db: dbClient,
  boardPublicId: string,
) => {
  return db.query.boards.findFirst({
    columns: {
      id: true,
      workspaceId: true,
    },
    with: {
      lists: {
        columns: {
          index: true,
        },
        where: isNull(lists.deletedAt),
        orderBy: [desc(lists.index)],
        limit: 1,
      },
    },
    where: eq(boards.publicId, boardPublicId),
  });
};

/**
 * Creates a new board with the specified configuration.
 * @param db - Database client instance
 * @param boardInput - Board creation parameters
 * @returns Created board with id, publicId, and name
 */
export const create = async (
  db: dbClient,
  boardInput: {
    publicId?: string;
    name: string;
    createdBy: string;
    workspaceId: number;
    importId?: number;
    slug: string;
    type?: "regular" | "template";
    sourceBoardId?: number;
  },
) => {
  const [result] = await db
    .insert(boards)
    .values({
      publicId: boardInput.publicId ?? generateUID(),
      name: boardInput.name,
      createdBy: boardInput.createdBy,
      workspaceId: boardInput.workspaceId,
      importId: boardInput.importId,
      slug: boardInput.slug,
      type: boardInput.type ?? "regular",
      sourceBoardId: boardInput.sourceBoardId,
    })
    .returning({
      id: boards.id,
      publicId: boards.publicId,
      name: boards.name,
    });

  return result;
};

/**
 * Updates an existing board's name, slug, or visibility.
 * @param db - Database client instance
 * @param boardInput - Update parameters including boardPublicId
 * @returns Updated board with publicId and name
 */
export const update = async (
  db: dbClient,
  boardInput: {
    name: string | undefined;
    slug: string | undefined;
    visibility: BoardVisibilityStatus | undefined;
    boardPublicId: string;
  },
) => {
  const [result] = await db
    .update(boards)
    .set({
      name: boardInput.name,
      slug: boardInput.slug,
      visibility: boardInput.visibility,
      updatedAt: new Date(),
    })
    .where(eq(boards.publicId, boardInput.boardPublicId))
    .returning({
      publicId: boards.publicId,
      name: boards.name,
    });

  return result;
};

/**
 * Soft deletes a board by setting deletedAt and deletedBy.
 * The board remains in the database but is excluded from queries.
 * @param db - Database client instance
 * @param args - Delete parameters including boardId, deletedAt, and deletedBy
 * @returns Deleted board with publicId and name
 */
export const softDelete = async (
  db: dbClient,
  args: {
    boardId: number;
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  const [result] = await db
    .update(boards)
    .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
    .where(and(eq(boards.id, args.boardId), isNull(boards.deletedAt)))
    .returning({
      publicId: boards.publicId,
      name: boards.name,
    });

  return result;
};

/**
 * Permanently deletes all boards in a workspace.
 * Used for workspace cleanup operations.
 * @param db - Database client instance
 * @param workspaceId - Internal workspace ID
 * @returns Last deleted board with publicId and name
 */
export const hardDelete = async (db: dbClient, workspaceId: number) => {
  const [result] = await db
    .delete(boards)
    .where(eq(boards.workspaceId, workspaceId))
    .returning({
      publicId: boards.publicId,
      name: boards.name,
    });

  return result;
};

/**
 * Checks if a board slug is unique within a workspace.
 * @param db - Database client instance
 * @param args - Slug and workspaceId to check
 * @returns True if slug is unique, false if already exists
 */
export const isSlugUnique = async (
  db: dbClient,
  args: { slug: string; workspaceId: number },
) => {
  const result = await db.query.boards.findFirst({
    columns: {
      slug: true,
    },
    where: and(
      eq(boards.slug, args.slug),
      eq(boards.workspaceId, args.workspaceId),
      isNull(boards.deletedAt),
    ),
  });

  return result === undefined;
};

/**
 * Retrieves internal workspace and board IDs by board public ID.
 * Lightweight query for authorization checks.
 * @param db - Database client instance
 * @param boardPublicId - Public board identifier
 * @returns Object with id and workspaceId, or undefined
 */
export const getWorkspaceAndBoardIdByBoardPublicId = async (
  db: dbClient,
  boardPublicId: string,
) => {
  const result = await db.query.boards.findFirst({
    columns: {
      id: true,
      workspaceId: true,
    },
    where: eq(boards.publicId, boardPublicId),
  });

  return result;
};

/**
 * Checks if a board slug is available for use in a workspace.
 * @param db - Database client instance
 * @param boardSlug - Proposed board slug
 * @param workspaceId - Internal workspace ID
 * @returns True if slug is available, false if taken
 */
export const isBoardSlugAvailable = async (
  db: dbClient,
  boardSlug: string,
  workspaceId: number,
) => {
  const result = await db.query.boards.findFirst({
    columns: {
      id: true,
    },
    where: and(
      eq(boards.slug, boardSlug),
      eq(boards.workspaceId, workspaceId),
      isNull(boards.deletedAt),
    ),
  });

  return result === undefined;
};

/**
 * Creates a new board from a complete board snapshot.
 * Used for cloning boards or creating from templates.
 * Creates all nested entities (labels, lists, cards, checklists) in a transaction.
 * Also creates activity records for each created entity.
 * @param db - Database client instance
 * @param args - Snapshot source data and creation parameters
 * @returns Created board with id, publicId, and name
 */
export const createFromSnapshot = async (
  db: dbClient,
  args: {
    source: {
      name: string;
      labels: { publicId: string; name: string; colourCode: string | null }[];
      lists: {
        name: string;
        index: number;
        cards: {
          title: string;
          description: string | null;
          index: number;
          labels: {
            publicId: string;
            name: string;
            colourCode: string | null;
          }[];
          checklists?: {
            publicId: string;
            name: string;
            index: number;
            items: {
              publicId: string;
              title: string;
              completed: boolean;
              index: number;
            }[];
          }[];
        }[];
      }[];
    };
    workspaceId: number;
    createdBy: string;
    slug: string;
    name?: string;
    type: "regular" | "template";
    sourceBoardId?: number;
  },
) => {
  return db.transaction(async (tx) => {
    const [newBoard] = await tx
      .insert(boards)
      .values({
        publicId: generateUID(),
        name: args.name ?? args.source.name,
        slug: args.slug,
        createdBy: args.createdBy,
        workspaceId: args.workspaceId,
        type: args.type,
        sourceBoardId: args.sourceBoardId,
      })
      .returning({
        id: boards.id,
        publicId: boards.publicId,
        name: boards.name,
      });

    if (!newBoard) throw new Error("Failed to create board");

    // Labels
    const srcLabels = args.source.labels;
    const labelMap = new Map<string, number>();

    if (srcLabels.length) {
      const inserted = await tx
        .insert(labels)
        .values(
          srcLabels.map((l) => ({
            publicId: generateUID(),
            name: l.name,
            colourCode: l.colourCode ?? null,
            createdBy: args.createdBy,
            boardId: newBoard.id,
          })),
        )
        .returning({ id: labels.id });

      for (let i = 0; i < srcLabels.length; i++) {
        const src = srcLabels[i];

        if (!src) throw new Error("Source label not found");

        const created = inserted[i];
        if (created) labelMap.set(src.publicId, created.id);
      }
    }

    // Lists
    const listIndexToId = new Map<number, number>();
    const srcLists = [...args.source.lists].sort((a, b) => a.index - b.index);
    if (srcLists.length) {
      const insertedLists = await tx
        .insert(lists)
        .values(
          srcLists.map((list) => ({
            publicId: generateUID(),
            name: list.name,
            createdBy: args.createdBy,
            boardId: newBoard.id,
            index: list.index,
          })),
        )
        .returning({ id: lists.id, index: lists.index });

      for (const list of insertedLists) listIndexToId.set(list.index, list.id);
    }

    // Cards, card-labels, checklists
    for (const list of srcLists) {
      const newListId = listIndexToId.get(list.index);
      if (!newListId) continue;
      const sortedCards = [...list.cards].sort((a, b) => a.index - b.index);

      for (const card of sortedCards) {
        const [createdCard] = await tx
          .insert(cards)
          .values({
            publicId: generateUID(),
            title: card.title,
            description: card.description ?? "",
            createdBy: args.createdBy,
            listId: newListId,
            index: card.index,
          })
          .returning({ id: cards.id });

        if (!createdCard) throw new Error("Failed to create card");

        // Create card.created activity
        await tx.insert(cardActivities).values({
          publicId: generateUID(),
          type: "card.created",
          cardId: createdCard.id,
          createdBy: args.createdBy,
          sourceBoardId: args.sourceBoardId,
        });

        if (card.labels.length) {
          const cardLabels: { cardId: number; labelId: number }[] = [];
          for (const label of card.labels) {
            const newLabelId = labelMap.get(label.publicId);
            if (newLabelId)
              cardLabels.push({ cardId: createdCard.id, labelId: newLabelId });
          }
          if (cardLabels.length) {
            await tx.insert(cardsToLabels).values(cardLabels);

            // Create card.updated.label.added activities for each label
            const labelActivities = cardLabels.map((cardLabel) => ({
              publicId: generateUID(),
              type: "card.updated.label.added" as const,
              cardId: cardLabel.cardId,
              labelId: cardLabel.labelId,
              createdBy: args.createdBy,
              sourceBoardId: args.sourceBoardId,
            }));
            await tx.insert(cardActivities).values(labelActivities);
          }
        }

        if (card.checklists?.length) {
          const sortedChecklists = [...card.checklists].sort(
            (a, b) => a.index - b.index,
          );
          for (const checklist of sortedChecklists) {
            const [createdChecklist] = await tx
              .insert(checklists)
              .values({
                publicId: generateUID(),
                name: checklist.name,
                createdBy: args.createdBy,
                cardId: createdCard.id,
                index: checklist.index,
              })
              .returning({ id: checklists.id });

            if (!createdChecklist) continue;

            // Create card.updated.checklist.added activity
            await tx.insert(cardActivities).values({
              publicId: generateUID(),
              type: "card.updated.checklist.added",
              cardId: createdCard.id,
              toTitle: checklist.name,
              createdBy: args.createdBy,
              sourceBoardId: args.sourceBoardId,
            });

            if (checklist.items.length) {
              const itemValues = [...checklist.items]
                .sort((a, b) => a.index - b.index)
                .map((checklistItem) => ({
                  publicId: generateUID(),
                  title: checklistItem.title,
                  createdBy: args.createdBy,
                  checklistId: createdChecklist.id,
                  index: checklistItem.index,
                  completed: !!checklistItem.completed,
                }));

              if (itemValues.length) {
                await tx.insert(checklistItems).values(itemValues);

                // Create card.updated.checklist.item.added activities for each item
                const itemActivities = itemValues.map((item) => ({
                  publicId: generateUID(),
                  type: "card.updated.checklist.item.added" as const,
                  cardId: createdCard.id,
                  toTitle: item.title,
                  createdBy: args.createdBy,
                  sourceBoardId: args.sourceBoardId,
                }));
                await tx.insert(cardActivities).values(itemActivities);
              }
            }
          }
        }
      }
    }

    return newBoard;
  });
};

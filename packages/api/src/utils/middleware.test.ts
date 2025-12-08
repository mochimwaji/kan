import { describe, it } from "vitest";

// Note: The requireUserId helper has been deprecated and removed.
// Use resource-scoped procedures (cardProcedure, boardProcedure, etc.) instead.
// These procedures automatically validate resource access and provide userId in context.

describe("middleware procedures", () => {
  // Testing middleware procedures requires full tRPC integration tests
  // which are better suited for E2E testing rather than unit tests.

  it.todo("cardProcedure should validate card access");
  it.todo("boardProcedure should validate board access");
  it.todo("listProcedure should validate list access");
  it.todo("workspaceProcedure should validate workspace access");
});

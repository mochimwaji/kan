import { describe, expect, it, vi } from "vitest";

import { requireUserId } from "./middleware";

describe("requireUserId", () => {
  it("returns userId when user is authenticated", () => {
    const user = {
      id: "user_123",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = requireUserId(user);
    expect(result).toBe("user_123");
  });

  it("throws UNAUTHORIZED when user is null", () => {
    expect(() => requireUserId(null)).toThrow();

    try {
      requireUserId(null);
    } catch (error: unknown) {
      const trpcError = error as { code: string };
      expect(trpcError.code).toBe("UNAUTHORIZED");
    }
  });

  it("throws UNAUTHORIZED when user is undefined", () => {
    expect(() => requireUserId(undefined)).toThrow();

    try {
      requireUserId(undefined);
    } catch (error: unknown) {
      const trpcError = error as { code: string };
      expect(trpcError.code).toBe("UNAUTHORIZED");
    }
  });

  it("throws UNAUTHORIZED when user has no id", () => {
    const userWithoutId = {
      id: "",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(() => requireUserId(userWithoutId)).toThrow();
  });
});

// Note: Testing the middleware procedures would require mocking the tRPC context
// and database calls. For now, we test the exported helper functions.
// Integration tests for the middleware should be added as E2E tests.

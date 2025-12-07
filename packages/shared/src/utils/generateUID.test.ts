import { describe, it, expect } from "vitest";

import { generateUID } from "./generateUID";

describe("generateUID", () => {
  it("generates a 12-character string", () => {
    const uid = generateUID();
    expect(uid).toHaveLength(12);
  });

  it("generates strings containing only lowercase alphanumeric characters", () => {
    const uid = generateUID();
    expect(uid).toMatch(/^[0-9a-z]+$/);
  });

  it("generates unique IDs across multiple calls", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateUID()));
    expect(ids.size).toBe(1000);
  });

  it("generates IDs that are URL-safe", () => {
    const uid = generateUID();
    // Should not need encoding
    expect(encodeURIComponent(uid)).toBe(uid);
  });
});

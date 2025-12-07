import { describe, it, expect } from "vitest";

import { generateSlug } from "./generateSlug";

describe("generateSlug", () => {
  it("converts text to lowercase", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(generateSlug("my board name")).toBe("my-board-name");
  });

  it("removes special characters", () => {
    expect(generateSlug("My Board! @2024")).toBe("my-board-2024");
  });

  it("removes consecutive hyphens", () => {
    expect(generateSlug("hello   world")).toBe("hello-world");
  });

  it("trims whitespace", () => {
    expect(generateSlug("  hello world  ")).toBe("hello-world");
  });

  it("handles empty string", () => {
    expect(generateSlug("")).toBe("");
  });

  it("handles string with only special characters", () => {
    expect(generateSlug("!@#$%")).toBe("");
  });

  it("preserves numbers", () => {
    expect(generateSlug("Project 2024")).toBe("project-2024");
  });

  it("handles unicode characters by removing them", () => {
    expect(generateSlug("Café Project")).toBe("caf-project");
  });
});

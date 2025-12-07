import { describe, it, expect } from "vitest";

import type { Subscription } from "./subscriptions";
import {
  getActiveSubscriptions,
  getSubscriptionByPlan,
  hasActiveSubscription,
  hasUnlimitedSeats,
} from "./subscriptions";

const createSubscription = (
  overrides: Partial<Subscription> = {}
): Subscription => ({
  id: 1,
  plan: "pro",
  status: "active",
  seats: 5,
  unlimitedSeats: false,
  periodStart: new Date("2024-01-01"),
  periodEnd: new Date("2025-01-01"),
  referenceId: "ref_123",
  stripeSubscriptionId: "sub_123",
  stripeCustomerId: "cus_123",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

describe("getActiveSubscriptions", () => {
  it("returns empty array for undefined input", () => {
    expect(getActiveSubscriptions(undefined)).toEqual([]);
  });

  it("returns empty array for empty subscription list", () => {
    expect(getActiveSubscriptions([])).toEqual([]);
  });

  it("returns subscriptions with active status", () => {
    const subs = [
      createSubscription({ id: 1, status: "active" }),
      createSubscription({ id: 2, status: "canceled" }),
      createSubscription({ id: 3, status: "trialing" }),
    ];
    const result = getActiveSubscriptions(subs);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual([1, 3]);
  });

  it("includes past_due subscriptions as active", () => {
    const subs = [createSubscription({ status: "past_due" })];
    expect(getActiveSubscriptions(subs)).toHaveLength(1);
  });

  it("excludes canceled and unpaid subscriptions", () => {
    const subs = [
      createSubscription({ id: 1, status: "canceled" }),
      createSubscription({ id: 2, status: "unpaid" }),
    ];
    expect(getActiveSubscriptions(subs)).toEqual([]);
  });
});

describe("getSubscriptionByPlan", () => {
  it("returns undefined for undefined input", () => {
    expect(getSubscriptionByPlan(undefined, "pro")).toBeUndefined();
  });

  it("returns the subscription matching the plan", () => {
    const subs = [
      createSubscription({ id: 1, plan: "pro" }),
      createSubscription({ id: 2, plan: "team" }),
    ];
    const result = getSubscriptionByPlan(subs, "team");
    expect(result?.id).toBe(2);
  });

  it("only returns active subscriptions", () => {
    const subs = [createSubscription({ plan: "pro", status: "canceled" })];
    expect(getSubscriptionByPlan(subs, "pro")).toBeUndefined();
  });

  it("returns first matching subscription if multiple exist", () => {
    const subs = [
      createSubscription({ id: 1, plan: "pro" }),
      createSubscription({ id: 2, plan: "pro" }),
    ];
    const result = getSubscriptionByPlan(subs, "pro");
    expect(result?.id).toBe(1);
  });
});

describe("hasActiveSubscription", () => {
  it("returns false for undefined input", () => {
    expect(hasActiveSubscription(undefined, "pro")).toBe(false);
  });

  it("returns true when active subscription exists for plan", () => {
    const subs = [createSubscription({ plan: "pro", status: "active" })];
    expect(hasActiveSubscription(subs, "pro")).toBe(true);
  });

  it("returns false when no subscription exists for plan", () => {
    const subs = [createSubscription({ plan: "team", status: "active" })];
    expect(hasActiveSubscription(subs, "pro")).toBe(false);
  });

  it("returns false when subscription for plan is canceled", () => {
    const subs = [createSubscription({ plan: "pro", status: "canceled" })];
    expect(hasActiveSubscription(subs, "pro")).toBe(false);
  });
});

describe("hasUnlimitedSeats", () => {
  it("returns false for undefined input", () => {
    expect(hasUnlimitedSeats(undefined)).toBe(false);
  });

  it("returns false when no subscriptions have unlimited seats", () => {
    const subs = [
      createSubscription({ unlimitedSeats: false }),
      createSubscription({ unlimitedSeats: false }),
    ];
    expect(hasUnlimitedSeats(subs)).toBe(false);
  });

  it("returns true when any active subscription has unlimited seats", () => {
    const subs = [
      createSubscription({ unlimitedSeats: false }),
      createSubscription({ unlimitedSeats: true }),
    ];
    expect(hasUnlimitedSeats(subs)).toBe(true);
  });

  it("ignores canceled subscriptions with unlimited seats", () => {
    const subs = [
      createSubscription({ unlimitedSeats: true, status: "canceled" }),
    ];
    expect(hasUnlimitedSeats(subs)).toBe(false);
  });
});

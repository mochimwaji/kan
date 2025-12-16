/** Valid subscription status values from Stripe */
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid";

/** Available subscription plan types */
export type SubscriptionPlan = "team" | "pro";

/** Subscription data structure */
export interface Subscription {
  id: number | null;
  plan: string;
  status: string;
  seats: number | null;
  unlimitedSeats: boolean;
  periodStart: Date | null;
  periodEnd: Date | null;
  referenceId: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Statuses that represent an active/usable subscription */
const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

/**
 * Filters subscriptions to only include active ones.
 * @param subscriptions - Array of subscriptions to filter
 * @returns Array of subscriptions with active status
 */
export const getActiveSubscriptions = (
  subscriptions: Subscription[] | undefined,
) => {
  if (!subscriptions) return [];
  return subscriptions.filter((sub) => ACTIVE_STATUSES.includes(sub.status));
};

/**
 * Finds an active subscription for a specific plan.
 * @param subscriptions - Array of subscriptions to search
 * @param plan - The plan type to find
 * @returns The matching active subscription or undefined
 */
export const getSubscriptionByPlan = (
  subscriptions: Subscription[] | undefined,
  plan: SubscriptionPlan,
) => {
  if (!subscriptions) return undefined;
  return subscriptions.find(
    (sub) => sub.plan === plan && ACTIVE_STATUSES.includes(sub.status),
  );
};

/**
 * Checks if there's an active subscription for a specific plan.
 * @param subscriptions - Array of subscriptions to check
 * @param plan - The plan type to check for
 * @returns True if an active subscription exists for the plan
 */
export const hasActiveSubscription = (
  subscriptions: Subscription[] | undefined,
  plan: SubscriptionPlan,
) => {
  return getSubscriptionByPlan(subscriptions, plan) !== undefined;
};

/**
 * Checks if any active subscription has unlimited seats.
 * @param subscriptions - Array of subscriptions to check
 * @returns True if any active subscription has unlimitedSeats flag
 */
export const hasUnlimitedSeats = (
  subscriptions: Subscription[] | undefined,
) => {
  const activeSubscriptions = getActiveSubscriptions(subscriptions);
  return activeSubscriptions.some((sub) => sub.unlimitedSeats);
};

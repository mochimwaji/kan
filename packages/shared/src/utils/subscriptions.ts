/** Subscription type stub for self-hosted version (no Stripe) */
export interface Subscription {
  plan: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
}

/**
 * Get subscription by plan name.
 * For self-hosted, this always returns undefined since there's no billing.
 */
export function getSubscriptionByPlan(
  _subscriptions: Subscription[] | undefined,
  _plan: string,
): Subscription | undefined {
  return undefined;
}

/**
 * Check if workspace has unlimited seats.
 * For self-hosted, this always returns true.
 */
export function hasUnlimitedSeats(
  _subscriptions: Subscription[] | undefined,
): boolean {
  return true;
}

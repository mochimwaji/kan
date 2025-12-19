/**
 * Validation constants used across the application.
 * Centralizes magic numbers to improve maintainability.
 */

/** Minimum length for public IDs (used in Zod schemas) */
export const PUBLIC_ID_MIN_LENGTH = 12;

/** Maximum length for card/board descriptions */
export const DESCRIPTION_MAX_LENGTH = 10000;

/** Minimum length for workspace slugs */
export const SLUG_MIN_LENGTH = 3;

/** Maximum length for workspace slugs */
export const SLUG_MAX_LENGTH = 24;

/** Maximum length for workspace names */
export const WORKSPACE_NAME_MAX_LENGTH = 64;

import { customAlphabet } from "nanoid";

/** Alphanumeric characters used for UID generation (lowercase only) */
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Default length for generated UIDs */
const length = 12;

const nanoid = customAlphabet(alphabet, length);

/**
 * Generates a unique 12-character alphanumeric identifier.
 * Uses nanoid with a custom alphabet for URL-safe, collision-resistant IDs.
 * @returns A 12-character unique identifier string
 * @example generateUID() // "ab12cd34ef56"
 */
export function generateUID() {
  return nanoid();
}

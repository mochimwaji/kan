/**
 * Generates a URL-friendly slug from text.
 * Converts to lowercase, removes special characters, and replaces spaces with hyphens.
 * @param text - The input text to convert to a slug
 * @returns A URL-safe slug string
 * @example generateSlug("My Board Name") // "my-board-name"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Remove consecutive hyphens
}

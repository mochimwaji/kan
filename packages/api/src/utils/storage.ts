import * as fs from "fs";
import * as path from "path";

import { DEFAULT_STORAGE_PATH } from "@kan/db/constants";

const STORAGE_PATH = process.env.STORAGE_PATH ?? DEFAULT_STORAGE_PATH;

export const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
};

/**
 * Get the base storage directory path
 */
export function getStoragePath(): string {
  return STORAGE_PATH;
}

/**
 * Get the full path for a file in a category
 */
export function getFilePath(
  category: "avatars" | "attachments",
  filename: string,
): string {
  // Sanitize filename to prevent path traversal
  const sanitized = path.basename(filename);
  return path.join(STORAGE_PATH, category, sanitized);
}

/**
 * Ensure the storage directory exists
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Save a file to local storage
 * @returns The filename (for storing in database)
 */
export async function saveFile(
  category: "avatars" | "attachments",
  filename: string,
  buffer: Buffer,
): Promise<string> {
  const categoryPath = path.join(STORAGE_PATH, category);
  ensureDirectoryExists(categoryPath);

  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(categoryPath, sanitizedFilename);

  await fs.promises.writeFile(filePath, buffer);

  return sanitizedFilename;
}

/**
 * Read a file from local storage
 */
export async function readFile(
  category: "avatars" | "attachments",
  filename: string,
): Promise<Buffer> {
  const filePath = getFilePath(category, filename);
  return fs.promises.readFile(filePath);
}

/**
 * Delete a file from local storage
 */
export async function deleteFile(
  category: "avatars" | "attachments",
  filename: string,
): Promise<void> {
  const filePath = getFilePath(category, filename);

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    // File might not exist, which is fine
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Check if a file exists in local storage
 */
export function fileExists(
  category: "avatars" | "attachments",
  filename: string,
): boolean {
  const filePath = getFilePath(category, filename);
  return fs.existsSync(filePath);
}

/**
 * Get the MIME type based on file extension
 */
export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

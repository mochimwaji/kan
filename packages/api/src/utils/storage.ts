import * as fs from "fs";
import * as path from "path";

const STORAGE_ROOT = process.env.STORAGE_PATH || "/app/data";

/**
 * Validates and resolves a relative path to prevent path traversal attacks.
 * Returns the absolute path if valid, throws if path escapes storage root.
 */
export function resolvePath(relativePath: string): string {
  // Normalize and resolve the path
  const normalized = path
    .normalize(relativePath)
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.resolve(STORAGE_ROOT, normalized);

  // Ensure the resolved path is within STORAGE_ROOT
  if (!absolutePath.startsWith(path.resolve(STORAGE_ROOT))) {
    throw new Error("Invalid path: attempted path traversal");
  }

  return absolutePath;
}

/**
 * Saves a file to local storage.
 * Creates parent directories if they don't exist.
 */
export async function saveFile(
  relativePath: string,
  data: Buffer,
): Promise<void> {
  const absolutePath = resolvePath(relativePath);
  const dir = path.dirname(absolutePath);

  // Create directory recursively if it doesn't exist
  await fs.promises.mkdir(dir, { recursive: true });

  // Write file
  await fs.promises.writeFile(absolutePath, data);
}

/**
 * Deletes a file from local storage.
 * Silently ignores if file doesn't exist.
 */
export async function deleteFile(relativePath: string): Promise<void> {
  const absolutePath = resolvePath(relativePath);

  try {
    await fs.promises.unlink(absolutePath);
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Checks if a file exists in local storage.
 */
export async function fileExists(relativePath: string): Promise<boolean> {
  const absolutePath = resolvePath(relativePath);

  try {
    await fs.promises.access(absolutePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a read stream for a file.
 * Used for streaming large files.
 */
export function createReadStream(relativePath: string): fs.ReadStream {
  const absolutePath = resolvePath(relativePath);
  return fs.createReadStream(absolutePath);
}

/**
 * Gets the public URL for a stored file.
 * Returns a path that can be used with the file serving API.
 */
export function getPublicUrl(relativePath: string): string {
  // Validate the path first
  resolvePath(relativePath);
  return `/api/files/${relativePath}`;
}

/**
 * Gets the storage root directory.
 */
export function getStorageRoot(): string {
  return STORAGE_ROOT;
}

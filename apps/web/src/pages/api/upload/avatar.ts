import * as fs from "fs";
import * as path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";

import { createNextApiContext } from "@kan/api/trpc";

const STORAGE_ROOT = process.env.STORAGE_PATH || "/app/data";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for avatars

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Validates and resolves a path to prevent traversal attacks.
 */
function resolvePath(relativePath: string): string | null {
  const normalized = path
    .normalize(relativePath)
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.resolve(STORAGE_ROOT, normalized);

  if (!absolutePath.startsWith(path.resolve(STORAGE_ROOT))) {
    return null;
  }

  return absolutePath;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Require authenticated user
    const { user } = await createNextApiContext(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Build storage path for this user's avatar
    const avatarDir = `avatars/${user.id}`;
    const absoluteDir = resolvePath(avatarDir);
    if (!absoluteDir) {
      return res.status(400).json({ error: "Invalid path" });
    }

    // Create directory if needed
    await fs.promises.mkdir(absoluteDir, { recursive: true });

    // Parse multipart form data
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      uploadDir: absoluteDir,
      filter: (part) => {
        // Only allow image files
        return part.mimetype?.startsWith("image/") ?? false;
      },
    });

    const [, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Determine extension from mimetype
    const ext = file.mimetype?.split("/")[1] ?? "jpg";
    const allowedExts = ["jpg", "jpeg", "png", "webp", "gif"];
    const safeExt = allowedExts.includes(ext) ? ext : "jpg";

    // Final filename
    const finalFilename = `avatar.${safeExt}`;
    const finalPath = path.join(absoluteDir, finalFilename);

    // Move/rename file to final location
    await fs.promises.rename(file.filepath, finalPath);

    // Return the storage key (relative path)
    const storageKey = `avatars/${user.id}/${finalFilename}`;

    return res.status(200).json({ success: true, key: storageKey });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

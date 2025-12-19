import * as fs from "fs";
import * as path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";

import { createNextApiContext } from "@kan/api/trpc";

const STORAGE_ROOT = process.env.STORAGE_PATH || "/app/data";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

    // Get destination key from query
    const { key } = req.query;
    if (!key || typeof key !== "string") {
      return res.status(400).json({ error: "Missing key parameter" });
    }

    // Validate path
    const absolutePath = resolvePath(`attachments/${key}`);
    if (!absolutePath) {
      return res.status(400).json({ error: "Invalid key" });
    }

    // Create directory if needed
    const dir = path.dirname(absolutePath);
    await fs.promises.mkdir(dir, { recursive: true });

    // Parse multipart form data
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      uploadDir: dir,
      filename: () => path.basename(absolutePath),
    });

    const [, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Move file to final location if needed
    if (file.filepath !== absolutePath) {
      await fs.promises.rename(file.filepath, absolutePath);
    }

    return res.status(200).json({ success: true, key });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

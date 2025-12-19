import * as fs from "fs";
import * as path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { lookup } from "mime-types";

import { createNextApiContext } from "@kan/api/trpc";

const STORAGE_ROOT = process.env.STORAGE_PATH || "/app/data";

/**
 * Validates and resolves a path to prevent traversal attacks.
 */
function resolvePath(relativePath: string): string | null {
  const normalized = path
    .normalize(relativePath)
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.resolve(STORAGE_ROOT, normalized);

  // Ensure path is within storage root
  if (!absolutePath.startsWith(path.resolve(STORAGE_ROOT))) {
    return null;
  }

  return absolutePath;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get path from URL first to determine if it's a public path
    const { path: pathSegments } = req.query;
    if (!pathSegments || !Array.isArray(pathSegments)) {
      return res.status(400).json({ error: "Invalid path" });
    }

    const relativePath = pathSegments.join("/");

    // Avatars are public, attachments require authentication
    const isPublicPath = relativePath.startsWith("avatars/");

    if (!isPublicPath) {
      // Require authenticated user for non-public paths
      const { user } = await createNextApiContext(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    // Validate and resolve path
    const absolutePath = resolvePath(relativePath);
    if (!absolutePath) {
      return res.status(400).json({ error: "Invalid path" });
    }

    // Check if file exists
    try {
      await fs.promises.access(absolutePath, fs.constants.F_OK);
    } catch {
      return res.status(404).json({ error: "File not found" });
    }

    // Get file stats
    const stats = await fs.promises.stat(absolutePath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: "Not a file" });
    }

    // Determine content type
    const ext = path.extname(absolutePath);
    const contentType = lookup(ext) || "application/octet-stream";

    // Set headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stats.size);
    res.setHeader("Cache-Control", "private, max-age=3600");

    // Stream file to response
    const stream = fs.createReadStream(absolutePath);
    stream.pipe(res);
  } catch (error) {
    console.error("Error serving file:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
};

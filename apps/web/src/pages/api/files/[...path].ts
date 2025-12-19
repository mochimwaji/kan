import * as fs from "fs";
import * as path from "path";
import type { NextApiRequest, NextApiResponse } from "next";

import { getMimeType } from "@kan/api/storage";
import { DEFAULT_STORAGE_PATH } from "@kan/db/constants";

import { env } from "~/env";

const STORAGE_PATH = env.STORAGE_PATH ?? DEFAULT_STORAGE_PATH;
const ALLOWED_CATEGORIES = ["avatars", "attachments"] as const;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { path: pathSegments } = req.query;

  if (!Array.isArray(pathSegments) || pathSegments.length < 2) {
    return res.status(400).json({ message: "Invalid path" });
  }

  const [category, ...filenameParts] = pathSegments;
  if (!category) {
    return res.status(400).json({ message: "Invalid path" });
  }
  const filename = filenameParts.join("/");

  // Validate category
  if (
    !ALLOWED_CATEGORIES.includes(
      category as (typeof ALLOWED_CATEGORIES)[number],
    )
  ) {
    return res.status(400).json({ message: "Invalid category" });
  }

  // Security: Prevent path traversal
  // Construct the absolute path and ensure it's within the STORAGE_PATH/category directory
  const categoryPath = path.resolve(STORAGE_PATH, category);
  const filePath = path.resolve(categoryPath, filename);

  if (!filePath.startsWith(categoryPath) || filename.includes("..")) {
    return res.status(400).json({ message: "Invalid filename" });
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }

  try {
    const fileBuffer = await fs.promises.readFile(filePath);
    const mimeType = getMimeType(filename);

    // Set cache headers for avatars (they don't change often)
    if (category === "avatars") {
      res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hours
    }

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", fileBuffer.length);

    return res.send(fileBuffer);
  } catch (error) {
    console.error("Error serving file:", error);
    return res.status(500).json({ message: "Failed to serve file" });
  }
}

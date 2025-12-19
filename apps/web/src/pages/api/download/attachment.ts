import * as fs from "fs";
import * as path from "path";
import type { NextApiRequest, NextApiResponse } from "next";

import { DEFAULT_STORAGE_PATH } from "@kan/db/constants";

import { env } from "~/env";

const STORAGE_PATH = env.STORAGE_PATH ?? DEFAULT_STORAGE_PATH;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { filename } = req.query;

  if (!filename || typeof filename !== "string") {
    return res.status(400).json({
      message: "filename parameter is required",
    });
  }

  try {
    // Sanitize filename
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(STORAGE_PATH, "attachments", sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    const fileBuffer = await fs.promises.readFile(filePath);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(sanitizedFilename)}"`,
    );

    return res.send(fileBuffer);
  } catch (error) {
    console.error("Error downloading attachment:", error);
    return res.status(500).json({ message: "Failed to download attachment" });
  }
}

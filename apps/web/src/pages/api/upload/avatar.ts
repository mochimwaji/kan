import * as fs from "fs";
import * as path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";

import { initAuth } from "@kan/auth/server";
import { createDrizzleClient } from "@kan/db/client";
import { DEFAULT_STORAGE_PATH } from "@kan/db/constants";
import * as userRepo from "@kan/db/repository/user.repo";

import { env } from "~/env";

const STORAGE_PATH = env.STORAGE_PATH ?? DEFAULT_STORAGE_PATH;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for avatars

export const config = {
  api: {
    bodyParser: false,
  },
};

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const db = createDrizzleClient();
    const auth = initAuth(db);
    const session = await auth.api.getSession({ headers: req.headers as any });

    if (!session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = session.user.id;

    // Parse form data
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({ message: "File is required" });
    }

    // Sanitize and generate filename
    const fileExtension =
      uploadedFile.originalFilename?.split(".").pop() || "jpg";
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
    const ext = allowedExtensions.includes(fileExtension.toLowerCase())
      ? fileExtension.toLowerCase()
      : "jpg";

    const uniqueFilename = `${userId}-avatar-${Date.now()}.${ext}`;

    // Ensure avatars directory exists
    const avatarsPath = path.join(STORAGE_PATH, "avatars");
    ensureDirectoryExists(avatarsPath);

    // Save file to storage
    const destPath = path.join(avatarsPath, uniqueFilename);
    const fileBuffer = await fs.promises.readFile(uploadedFile.filepath);
    await fs.promises.writeFile(destPath, fileBuffer);

    // Clean up temp file
    await fs.promises.unlink(uploadedFile.filepath);

    // Update user record in database
    await userRepo.update(db, userId, {
      image: uniqueFilename,
    });

    return res.status(200).json({
      success: true,
      filename: uniqueFilename,
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return res.status(500).json({ message: "Failed to upload avatar" });
  }
}

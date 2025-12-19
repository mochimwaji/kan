import * as fs from "fs";
import * as path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";

import { initAuth } from "@kan/auth/server";
import { createDrizzleClient } from "@kan/db/client";
import { DEFAULT_STORAGE_PATH } from "@kan/db/constants";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { generateUID } from "@kan/shared/utils";

import { env } from "~/env";

const STORAGE_PATH = env.STORAGE_PATH ?? DEFAULT_STORAGE_PATH;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

    const cardPublicId = fields.cardPublicId?.[0];
    const uploadedFile = files.file?.[0];

    if (!cardPublicId || !uploadedFile) {
      return res
        .status(400)
        .json({ message: "cardPublicId and file are required" });
    }

    // Validate user has access to the card
    const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
      db,
      cardPublicId,
    );

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    const hasAccess = await workspaceRepo.isUserInWorkspace(
      db,
      userId,
      card.workspaceId,
    );

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Sanitize and generate unique filename
    const originalFilename = uploadedFile.originalFilename || "attachment";
    const sanitizedFilename = originalFilename
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .substring(0, 200);
    const uniqueFilename = `${generateUID()}-${sanitizedFilename}`;

    // Ensure attachments directory exists
    const attachmentsPath = path.join(STORAGE_PATH, "attachments");
    ensureDirectoryExists(attachmentsPath);

    // Move file to storage
    const destPath = path.join(attachmentsPath, uniqueFilename);
    const fileBuffer = await fs.promises.readFile(uploadedFile.filepath);
    await fs.promises.writeFile(destPath, fileBuffer);

    // Clean up temp file
    await fs.promises.unlink(uploadedFile.filepath);

    // Create database record
    const attachment = await cardAttachmentRepo.create(db, {
      cardId: card.id,
      filename: uniqueFilename,
      originalFilename: originalFilename,
      contentType: uploadedFile.mimetype || "application/octet-stream",
      size: uploadedFile.size,
      createdBy: userId,
    });

    // Log activity
    await cardActivityRepo.create(db, {
      type: "card.updated.attachment.added",
      cardId: card.id,
      createdBy: userId,
    });

    if (!attachment) {
      throw new Error("Failed to create attachment record");
    }

    return res.status(200).json({
      success: true,
      attachment: {
        publicId: attachment.publicId,
        filename: uniqueFilename,
        originalFilename: originalFilename,
      },
    });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return res.status(500).json({ message: "Failed to upload attachment" });
  }
}

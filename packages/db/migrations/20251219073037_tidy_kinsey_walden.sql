-- Rename s3Key to storageKey to reflect local storage backend
ALTER TABLE "card_attachment" RENAME COLUMN "s3Key" TO "storageKey";
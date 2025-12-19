# Feedback: Legacy Code Cleanup Implementation Plan

After reviewing the [implementation_plan.md.resolved](file:///root/.gemini/antigravity/brain/f6a3a148-0022-4952-829f-a268ddb4644b/implementation_plan.md.resolved), here is the detailed feedback to ensure a comprehensive cleanup and a smoother transition to a self-hosted codebase.

## 1. Missing Marketing & Public UI Cleanup

The current plan focuses on settings and internal views, but several "Public" marketing components still reference legacy features:

- **[Features.tsx](file:///home/kan/apps/web/src/views/home/components/Features.tsx)**:
  - Remove the "Trello imports" feature card (Lines 95-99).
- **[Faqs.tsx](file:///home/kan/apps/web/src/views/home/components/Faqs.tsx)**:
  - Remove or update questions regarding Trello imports (Lines 46-62).
  - Remove questions about getting a custom URL via "purchasing a pro workspace subscription" (Lines 64-81).
- **[Testimonials.tsx](file:///home/kan/apps/web/src/views/home/components/Testimonials.tsx)**:
  - Several testimonials (e.g., JR Raphael) focus heavily on the "Trello alternative" aspect. Consider if these should be updated or if the wording should be generalized.
- **[\_app.tsx](file:///home/kan/apps/web/src/pages/_app.tsx)**:
  - The metadata description still refers to the app as "The open source Trello alternative" (Line 29).

## 2. Environment Variable & Config Cleanup

To fully prepare the codebase for self-hosting, all cloud-specific configuration should be purged:

- **[cloud/docker-compose.yml](file:///home/kan/cloud/docker-compose.yml)**:
  - Delete the `STRIPE_*` environment variable block (Lines 22-30).
  - Delete `TRELLO_*` variables (Lines 61-62).
- **[.env.example](file:///home/kan/.env.example)**:
  - Remove all `STRIPE_` and `TRELLO_` related variables.
  - **Value-Add Suggestion**: Rename `S3_` prefixed variables to `STORAGE_` (e.g., `S3_ENDPOINT` -> `STORAGE_ENDPOINT`) to align with the `s3Key` -> `storageKey` database change.

## 3. Database Migration Risk (Phase 3)

The plan suggests that no data migration is needed because there is "no user data."

- **Risk**: Even if there is no production data, any existing attachments in local dev environments will become inaccessible once the column is renamed.
- **Recommendation**: Instead of a drop/create migration, use an explicit `ALTER TABLE` rename to ensure local data persistence for developers:
  ```sql
  ALTER TABLE "card_attachments" RENAME COLUMN "s3Key" TO "storageKey";
  ```

## 4. Backend Logic & OpenAPI Documentation

- **[cardAttachment.repo.ts](file:///home/kan/packages/db/src/repository/cardAttachment.repo.ts)**: Ensure that all return types and utility methods are checked for any hardcoded "s3" strings in property names or error messages.
- **OpenAPI Specs**: Update the descriptions in [attachment.ts](file:///home/kan/packages/api/src/routers/attachment.ts) to ensure the generated documentation doesn't mention S3 or presigned URLs if those concepts are being abstracted or replaced by local storage logic.

## 5. Documentation Update

- **[README.md](file:///home/kan/README.md)**:
  - Update the "Features" list to remove Trello/Integration mentions if they are being removed.
  - Update the "Environment Variables" table to reflect the new generic storage naming.

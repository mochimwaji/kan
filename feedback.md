# Implementation Plan Review: S3 Migration & Lingui Removal

## Critical Issues

### 1. Missing Attachment Upload Flow Modification

> [!CAUTION]
> The plan modifies `apps/web/src/pages/api/upload/image.ts` which handles **avatar uploads only**. The actual **attachment upload flow** is completely different and is **not addressed** in the plan.

**Current attachment flow:**

- `apps/web/src/views/card/components/AttachmentUpload.tsx` - Frontend component
- `packages/api/src/routers/attachment.ts` - tRPC router with `generateUploadUrl`, `confirm`, and `delete` procedures
- Uses `generateUploadUrl` and `deleteObject` from `packages/api/src/utils/s3.ts`

**What's missing from the plan:**

- [ ] Modification of `packages/api/src/routers/attachment.ts` to use local storage
- [ ] Modification of `AttachmentUpload.tsx` to upload directly to server instead of presigned URLs
- [ ] New upload endpoint to receive file data (current approach uses presigned URLs for direct S3 upload)

---

### 2. Avatar URL Resolution Not Addressed

> [!CAUTION]
> The plan doesn't address how existing avatar URLs will be resolved after migration.

**Current implementation in `apps/web/src/utils/helpers.ts`:**

```typescript
export const getAvatarUrl = (imageOrKey: string | null) => {
  if (!imageOrKey) return "";

  if (imageOrKey.startsWith("http://") || imageOrKey.startsWith("https://")) {
    return imageOrKey;
  }

  return `${env("NEXT_PUBLIC_STORAGE_URL")}/${env("NEXT_PUBLIC_AVATAR_BUCKET_NAME")}/${imageOrKey}`;
};
```

**What's missing:**

- [ ] Update `getAvatarUrl` to point to new `/api/files/[...path].ts` endpoint
- [ ] Database stores S3 key format (e.g., `{userId}/avatar.jpg`) - how will this map to the new local storage path?

---

### 3. Missing `NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME` Cleanup

The attachment router in `packages/api/src/routers/attachment.ts` uses `NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME` (line 66), which is **different from** `NEXT_PUBLIC_AVATAR_BUCKET_NAME`. This env var is not mentioned in the plan's cleanup.

---

### 4. Docker Volume Strategy Needs Clarification

> [!IMPORTANT]
> The plan mentions storing files in `/data` but doesn't clarify behavior across multiple containers.

**Questions to address:**

- Will the Next.js container and worker container share the same volume?
- How does horizontal scaling affect file access if multiple web containers run?
- Should the `/data` path be configurable per container or shared via NFS/similar?

---

## High Impact Issues

### 5. Database Migration Not Addressed

The `card_attachments` table stores `s3_key` field (seen in `attachment.ts` line 134). After migration:

- Existing attachments in the database have S3 keys that won't work with local storage
- **No data migration strategy** is mentioned for existing attachments/avatars

Consider:

- [ ] Add a database migration to update URL format
- [ ] Or implement backwards-compatible URL resolution

---

### 6. Attachment Download Proxy Incomplete

The existing `attatchment.ts` (note: typo in filename) downloads from any URL:

```typescript
const upstream = await fetch(url);
```

If attachments move to local storage:

- [ ] The frontend `handleDownload` function in `AttachmentThumbnails.tsx` constructs URLs pointing to this proxy
- [ ] Need to ensure the new file-serving endpoint works with the existing download flow
- [ ] Security: Consider restricting which URLs can be proxied

---

### 7. Missing Consideration: NEXT_PUBLIC_STORAGE_URL

The plan mentions removing `NEXT_PUBLIC_STORAGE_DOMAIN` but `NEXT_PUBLIC_STORAGE_URL` is also used in `helpers.ts` for constructing avatar URLs. This should be cleaned up as well.

---

### 8. File Serving Security

> [!WARNING]
> The proposed `[...path].ts` catch-all route needs security considerations.

- **Authorization**: Should users only access their own files? Current S3 uses `ACL: "public-read"` for avatars
- **Path traversal**: Must sanitize path to prevent `../../etc/passwd` attacks
- **Rate limiting**: Consider adding rate limits to prevent abuse

---

## Medium Impact Issues

### 9. TypeScript Type Changes

The `s3Key` field in attachment-related types will need updating or aliasing if the storage layer changes. This affects:

- `cardAttachmentRepo.create()` input type
- API response types

---

### 10. Lingui Removal Scope

The plan says 92 files are affected but doesn't address:

- **Error messages** in API routes (e.g., `attachment.ts` uses plain strings, but other routers may use `t` macro)
- **Email templates** - do they use Lingui?
- **Worker codebase** - any i18n there?

---

### 11. Testing Gap

Verification plan is minimal. Recommend adding:

- [ ] Test that existing attachments (if any in test data) still display
- [ ] Test file deletion (both avatar and attachment)
- [ ] Test concurrent file uploads
- [ ] Test cross-container file access in Docker

---

## Minor Issues

### 12. Filename Typo

`attatchment.ts` is misspelled - consider fixing to `attachment.ts` as part of this cleanup.

---

## Summary

The most critical gaps are:

1. **Attachment upload flow is completely missed** - the plan only covers avatar uploads
2. **Avatar URL resolution** needs updating in `helpers.ts`
3. **Database migration** strategy for existing S3 keys is absent
4. **Multiple S3-related env vars** are not fully enumerated for cleanup

The Lingui removal section appears reasonably scoped, though testing should verify no i18n in API/worker code.

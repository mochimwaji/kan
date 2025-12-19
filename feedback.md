# Feedback: Local Storage Migration Audit

Following a comprehensive review and audit of the "S3 to Local Storage Migration" implementation, I have identified several issues ranging from critical build failures to performance and security improvements.

## ⚠️ Critical Issues

### 1. Build Failure: `env` Is Not a Function

The following files incorrectly attempt to call the `env` object as a function:

- `apps/web/src/pages/api/attachments/upload.ts:16`
- `apps/web/src/pages/api/download/attachment.ts:7`
- `apps/web/src/pages/api/files/[...path].ts:7`

The `env` object exported from `~/env` is a T3-Env object, not a function. Calling it as a function causes a runtime crash and prevent successful typechecking (verified via `pnpm typecheck`).

**Recommended Fix:**
Change `env("STORAGE_PATH")` to `env.STORAGE_PATH`.

> [!IMPORTANT]
> The provided `walkthrough.md` incorrectly states that `Typecheck: ✅ PASSED`. My audit confirms it consistently fails with 3 errors.

---

## 🚫 Bugs & Regressions

### 2. Broken Download Feature

The file `apps/web/src/views/card/components/AttachmentThumbnails.tsx` was not correctly updated for the migration:

- **Wrong Endpoint:** It still points to `/api/download/attatchment` (with the old typo), but the file was renamed to `attachment.ts`.
- **Wrong Parameters:** It uses `?url=...&filename=...`, but the new API requires `?filename=...` to serve from the local filesystem.

**Recommended Fix:**
Update line 148 in `AttachmentThumbnails.tsx` to:

```typescript
const downloadUrl = `/api/download/attachment?filename=${attachment.s3Key}`;
```

---

## 🛡️ Security Audit

### 3. Path Traversal Protection

The path traversal protection in `[...path].ts` and `storage.ts` using `path.basename()` is effective for individual filename segments.

### 4. MIME Type Validation

The MIME type mapping is manual but comprehensive. However, `[...path].ts` duplicates the logic already present in `storage.ts`.

---

## 🧹 Code Hygiene

### 5. Misleading Column Names

The database still uses the `s3Key` column to store local filenames. While functional, it is confusing for future maintenance. A schema migration to rename `s3Key` to `filename` (and adjusting the repository) is recommended for clarity.

### 6. Hardcoded Path Default

Throughout the codebase, `/app/data` is used as a hardcoded default. It would be better to centralize this in a constant within `packages/api/src/utils/storage.ts`.

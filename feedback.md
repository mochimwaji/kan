# Feedback: Lingui i18n Removal Implementation

## Audit Complete ✅

Ran comprehensive audit and fixed the following issues:

---

### 1. Missed `<Trans>` Component

**File**: [ActivityList.tsx](file:///home/kan/apps/web/src/views/card/components/ActivityList.tsx#L217-221)

A `<Trans>` component was not replaced with a React fragment. Fixed by replacing with `<>`.

---

### 2. Missing `zodResolver` Import

**File**: [UpdateBoardSlugForm.tsx](file:///home/kan/apps/web/src/views/board/components/UpdateBoardSlugForm.tsx)

The `zodResolver` import from `@hookform/resolvers/zod` was accidentally removed during Lingui cleanup. Re-added.

---

### 3. Stale `pnpm-lock.yaml`

The lockfile still contained Lingui package references, causing Docker build failures. Regenerated with `pnpm install` (263 packages removed, 12 added).

---

### 4. Lingui Commands in Dockerfile

**File**: [Dockerfile](file:///home/kan/apps/web/Dockerfile)

Line 57-58 still contained `lingui:extract` and `lingui:compile` commands. Removed.

---

## Verification Results

| Check                       | Result                                       |
| --------------------------- | -------------------------------------------- |
| `pnpm typecheck`            | ✅ Pass (pre-existing `__ENV.js` issue only) |
| `pnpm lint`                 | ✅ Pass (pre-existing warnings only)         |
| No `@lingui` imports in src | ✅ Confirmed                                 |
| No lingui in package.json   | ✅ Confirmed                                 |
| Docker build                | ✅ Success                                   |
| Container running           | ✅ `kan-web` up on port 3007                 |

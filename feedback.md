# Critical Feedback on Implementation Plan

## 1. Repository Refactoring (Risk Assessment)
> [!WARNING]
> The plan correctly identifies the risk of **Drizzle type inference issues** (Option B). This is a known issue in the project (`KNOWN_ISSUES.md`).

**Recommendation**: Proceed with **Option B (Full Extraction)** to achieve the maintainability goal, but with a **Mandatory Verification Step**:
- Do **NOT** refactor the entire `card.repo.ts` at once.
- **Spike**: Refactor *only* the `create` or `read` operations first into a sub-file.
- **Verify**: Immediately check if `drizzle-orm` type inference (e.g., `Explicit result types` or `inferred types`) holds up in the consuming service/router. If types break (become `any` or lose relationships), you must fallback to **Option A** or be prepared to add explicit return types to every repository function (which adds maintenance overhead).

## 2. Board View Refactoring
The plan to extract hooks (`useVisualLists`, `useBoardMutations`) is excellent and necessary.
**Critical Check**: Ensure `useVisualState` and `useVisualLists` rigorously preserve the **"Freeze while Dragging"** logic.
- Current Logic: `useEffect(() => { if (!isDragging && boardData) setVisualLists(boardData.lists) }, ...)`
- Proposed Logic: `unfreeze()` should only be called when drag *ends* and animations settle.
- **Potential Pitfall**: If `useVisualState` automatically syncs on `serverData` change, it **must** have a `frozen` override (as proposed in the plan with `freezeOnPredicate` or manual `freeze/unfreeze`). The implementation must favor the local state over server state whenever `isFrozen` is true, *even if* `serverData` updates in the background.

## 3. Optimistic Helpers
The generic `createOptimisticUpdate` factory is valuable for reducing boilerplate.
**Suggestion**: Ensure the `updateFn` signature accepts the **entire Query Data object** (e.g., `BoardData`) as the first argument, not just the changed item.
- Most Board mutations (like `bulkMove`) define state changes that affect the whole board structure (multiple lists).
- If `updateFn` is scoped too narrowly (e.g., just `Card`), it won't be usable for Board-level cache updates.

## 4. Simplified Scope for Card View
The extraction of `useTransitionState` is valid.
**Note**: `apps/web/src/views/card/index.tsx` is a standalone page and does seemingly **not** use `BoardTransitionProvider` (which is used in `BoardPage` for the grid-to-card morph).
- The proposed `useTransitionState` (simple opacity fade) is the correct approach for this isolated view.
- No conflict found with `BoardTransitionProvider`.

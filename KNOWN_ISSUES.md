# Known Issues

## Multi-Drag Transition Timing Not Configurable

**Status**: Unresolved (tabled)

**Expected**: Ghost cards should fade out over configured duration (e.g., 400ms) when multi-dragging

**Actual**: Fade happens almost instantly regardless of CSS timing values

### What was tried:

1. **Created `.multi-drag-ghost` CSS class** with `transition: opacity Xms ease-out`
   - Tested with 200ms, 250ms, 300ms, 400ms, 700ms - no visible difference

2. **Applied class in Card.tsx** via `isGhosting` prop
   - Changed from inline `opacity-40` to CSS class `multi-drag-ghost`

3. **Added `!important`** to override `.transition-dnd-safe` class
   - `.transition-dnd-safe` also transitions opacity at 200ms
   - Still no visible effect

### Likely cause:

The transition may not trigger because:

- The class is applied instantly (no starting opacity state to transition FROM)
- DnD library may be doing its own transforms/rendering
- React state change causes immediate re-render before transition can run

### Potential solutions to explore:

- Add explicit starting opacity and transition on next frame using `requestAnimationFrame`
- Use CSS animation instead of transition
- Track "justBecameGhost" state to trigger animation

---

## Deferred Work (Optional/Future)

| Finding                          | Priority | Notes                                             |
| -------------------------------- | -------- | ------------------------------------------------- |
| Lazy loading checklists/comments | High     | Deferred - requires query restructuring           |
| Lazy load Tiptap editor          | Low      | Bundle size optimization                          |
| Lazy load Lottie player          | Low      | Bundle size optimization                          |
| Repository file decomposition    | Medium   | Deferred - Drizzle types make abstraction complex |
| Duplicate query consolidation    | Medium   | Deferred - Same reason as above                   |
| Add pagination for cards         | Medium   | Future performance work                           |
| Expand test coverage             | Medium   | Repository tests need DB integration              |
| Tailwind v4 migration            | Low      | Tabled per user request                           |

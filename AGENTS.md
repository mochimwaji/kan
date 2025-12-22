# AGENTS.md - AI Agent Development Guide for Kan

This document provides a structured framework to guide AI agents working on the Kan codebase. It covers project structure, coding conventions, debugging strategies, and common tasks.

## Project Overview

Kan is an open-source Kanban board application built as a **monorepo** using:

- **Runtime**: Node.js 20+
- **Package Manager**: pnpm 9.14+ with workspaces
- **Build Tool**: Turborepo
- **Frontend**: Next.js (Pages Router) with React
- **Backend**: tRPC for type-safe APIs
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS
- **Logging**: @kan/logger

> **Note**: This is a self-hosted focused fork. Marketing pages (home, pricing, terms, privacy) and i18n support have been removed for a streamlined deployment.

## Directory Structure

- `apps/web/`: Main Next.js (Pages Router) application.
- `packages/api/`: tRPC routers and API logic.
- `packages/db/`: Database layer (Drizzle ORM) and repository patterns.
- `packages/auth/`, `packages/email/`, `packages/logger/`, `packages/shared/`: Core services.

## Coding Conventions

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer explicit types over `any`
- Use type imports: `import type { X } from "..."`

### Naming Conventions

| Element             | Convention             | Example                 |
| ------------------- | ---------------------- | ----------------------- |
| Files (components)  | PascalCase             | `BoardView.tsx`         |
| Files (utilities)   | camelCase              | `generateUID.ts`        |
| Files (repos)       | camelCase + `.repo.ts` | `card.repo.ts`          |
| Variables/Functions | camelCase              | `getUserById`           |
| Types/Interfaces    | PascalCase             | `BoardVisibilityStatus` |
| Constants           | UPPER_SNAKE_CASE       | `LOG_LEVEL_PRIORITY`    |
| React Components    | PascalCase             | `function CardModal()`  |

### Import Order

1. External dependencies
2. Internal packages (`@kan/*`)
3. Relative imports (components, utils)
4. Type imports (last)

### Logging & Error Handling

- **API Errors**: Use `TRPCError` with codes like `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`.
- **Structured Logging**: Use `@kan/logger` instead of `console.log`.
  - Use `logger.info`, `logger.error`, `apiLogger`, `dbLogger`.
  - Set `LOG_LEVEL` (debug/info/warn/error) and `DB_LOG_QUERIES=true` for debugging.

### Theming, Styling & Animations

- **Tailwind & CSS Variables**: Use Tailwind utility classes and CSS variables (e.g., `var(--kan-bg-default)`).
- **Themes**: Supports 7 presets in `themePresets.ts`. Use `ThemePresetSelector` for switching.
- **Color Utils**: Use `colorUtils.ts` (e.g., `deriveListBackground`, `getContrastColor`) for dynamic styling.
- **Animations**:
  - `useBoardTransition`: Morph animations between board lists and views.
  - `PageTransition` / `TabTransition`: Fade transitions for navigation and content.

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests for specific package
pnpm -F @kan/shared test
```

### Test File Location

Test files are co-located with source files:

- `src/utils/generateUID.ts` → `src/utils/generateUID.test.ts`

### Test Structure

```typescript
import { describe, expect, it, vi } from "vitest";

import { functionToTest } from "./module";

describe("functionToTest", () => {
  it("should do expected behavior", () => {
    const result = functionToTest(input);
    expect(result).toBe(expectedOutput);
  });
});
```

## Development Guide

### Adding New Features

1.  **API**: Define router in `packages/api/src/routers/` and register in `root.ts`.
2.  **Database**: Create schema in `packages/db/src/schema/`, push with `pnpm db:push`, and implement repository in `packages/db/src/repository/`.
3.  **Patterns**:
    - **Procedures**: Use `loggedProtectedProcedure` for automatic logging.
    - **Scoped Procedures**: Use `cardProcedure`, `boardProcedure`, etc., to eliminate repetitive auth/lookup logic.
    - **Repository Pattern**: Co-locate database logic in `*.repo.ts` files.

## Environment Variables

### Required

| Variable               | Description                   |
| ---------------------- | ----------------------------- |
| `BETTER_AUTH_SECRET`   | Secret for authentication     |
| `POSTGRES_URL`         | PostgreSQL connection string  |
| `NEXT_PUBLIC_BASE_URL` | Public URL of the application |

### Optional (Logging)

| Variable         | Description          | Default                       |
| ---------------- | -------------------- | ----------------------------- |
| `LOG_LEVEL`      | Minimum log level    | `info` (prod) / `debug` (dev) |
| `DB_LOG_QUERIES` | Log database queries | `false`                       |

### Optional (Features)

| Variable                           | Description                 |
| ---------------------------------- | --------------------------- |
| `NEXT_PUBLIC_DISABLE_SIGN_UP`      | Disable public registration |
| Various OAuth provider credentials | Enable social login         |

## Troubleshooting

### Common Errors

| Error              | Cause                        | Solution                    |
| ------------------ | ---------------------------- | --------------------------- |
| `UNAUTHORIZED`     | Missing/invalid session      | Check authentication flow   |
| `FORBIDDEN`        | User not in workspace        | Verify workspace membership |
| `NOT_FOUND`        | Resource deleted or wrong ID | Check publicId format       |
| Connection refused | DB not running               | Start PostgreSQL container  |
| Module not found   | Dependencies out of sync     | Run `pnpm install`          |

### Performance Tips

- Use `keepPreviousData` in React Query for smoother UX
- Batch database operations in transactions
- Use indexed columns in WHERE clauses
- Limit nested relation fetches in Drizzle queries

### Codebase Quality & Code Organization

#### Large File Guidelines

Some files are intentionally left large due to tight coupling requirements:

| File              | Lines | Reason                                                                                                                                                 |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `board/index.tsx` | ~1500 | Two-phase visual state pattern requires coupling between drag-drop handlers, mutations, and visual state management. Extracting causes animation bugs. |
| `card.repo.ts`    | ~1100 | Single-table repository with related operations; organized with section headers.                                                                       |
| `board.repo.ts`   | ~1050 | Complex nested queries require co-location; organized with section headers.                                                                            |

**When reviewing large files**, check for section headers (e.g., `// ============================================================================`) that divide code into logical groups.

#### Two-Phase Visual State Pattern

The board view uses a two-phase rendering strategy to prevent UI flashing during drag-drop:

1. **Visual State** (`visualLists`, `isDragging`): Drives what the user sees
2. **Server State**: The tRPC query cache

When dragging starts, `isDragging = true` freezes visual state. After drop, mutations update server state, then `isDragging = false` triggers sync. This prevents the brief flash where items appear at old positions.

**Critical**: Do not extract drag-drop handlers and mutations to separate hooks. They must remain coupled to the visual state.

#### Code Organization Patterns

**Section Headers**: Large files use divider comments:

```typescript
// ============================================================================
// CREATE OPERATIONS
// ============================================================================
```

**Extracted Hooks** (board/index.tsx):

- `useBoardKeyboardShortcuts` - Extracted (~79 lines) because it has no dependency on visual state

**Not Extracted** (intentional):

- Mutations - Call `setIsDragging(false)` on error/success
- Drag handlers - Control `visualLists` state directly

#### Strings

All user-facing strings are hardcoded in English. The i18n (Lingui) library was removed to simplify the self-hosted deployment.

### Known Issues

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for the current tracker.

### Scripts

```bash
pnpm dev          # Start development
pnpm build        # Build all packages
pnpm test         # Run tests
pnpm lint         # Check linting
pnpm typecheck    # Check types
pnpm db:studio    # Open Drizzle Studio
pnpm db:migrate   # Run migrations
```

### Package Dependencies

```
apps/web → @kan/api → @kan/db → @kan/shared
                   ↘ @kan/auth
                   ↘ @kan/logger
```

### Key Files

| Purpose           | Location                                      |
| ----------------- | --------------------------------------------- |
| API Routes        | `packages/api/src/routers/`                   |
| DB Schema         | `packages/db/src/schema/`                     |
| DB Queries        | `packages/db/src/repository/`                 |
| React Pages       | `apps/web/src/pages/`                         |
| React Views       | `apps/web/src/views/`                         |
| Components        | `apps/web/src/components/`                    |
| Providers         | `apps/web/src/providers/`                     |
| Environment       | `apps/web/src/env.ts`                         |
| Theme Presets     | `apps/web/src/utils/themePresets.ts`          |
| Color Utilities   | `apps/web/src/utils/colorUtils.ts`            |
| Board Transitions | `apps/web/src/providers/board-transition.tsx` |

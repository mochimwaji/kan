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
- **i18n**: Lingui

## Directory Structure

```
kan/
├── apps/
│   ├── web/                 # Next.js application (main app)
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── pages/       # Next.js pages (file-based routing)
│   │   │   ├── providers/   # React context providers
│   │   │   ├── views/       # Page-specific view components
│   │   │   ├── utils/       # Frontend utilities
│   │   │   └── env.ts       # Environment variable validation
│   │   └── public/          # Static assets
│   └── docs/                # Documentation site
│
├── packages/
│   ├── api/                 # tRPC routers and API logic
│   │   └── src/
│   │       ├── routers/     # Domain-specific routers (card, board, etc.)
│   │       ├── utils/       # API utilities (auth, s3)
│   │       ├── trpc.ts      # tRPC initialization and context
│   │       └── root.ts      # Root router combining all routers
│   │
│   ├── db/                  # Database layer (Drizzle ORM)
│   │   ├── migrations/      # Database migrations
│   │   └── src/
│   │       ├── schema/      # Drizzle table definitions
│   │       ├── repository/  # Data access layer (*.repo.ts)
│   │       └── client.ts    # Database client factory
│   │
│   ├── auth/                # Authentication (Better Auth)
│   ├── email/               # Email service
│   ├── logger/              # Structured logging (NEW)
│   ├── shared/              # Shared utilities and constants
│   └── stripe/              # Stripe integration
│
└── tooling/                 # Shared tooling configs
    ├── eslint/              # ESLint configuration
    ├── prettier/            # Prettier configuration
    ├── tailwind/            # Tailwind configuration
    └── typescript/          # TypeScript configuration
```

## Coding Conventions

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer explicit types over `any`
- Use type imports: `import type { X } from "..."`

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (components) | PascalCase | `BoardView.tsx` |
| Files (utilities) | camelCase | `generateUID.ts` |
| Files (repos) | camelCase + `.repo.ts` | `card.repo.ts` |
| Variables/Functions | camelCase | `getUserById` |
| Types/Interfaces | PascalCase | `BoardVisibilityStatus` |
| Constants | UPPER_SNAKE_CASE | `LOG_LEVEL_PRIORITY` |
| React Components | PascalCase | `function CardModal()` |

### Import Order

1. External dependencies
2. Internal packages (`@kan/*`)
3. Relative imports (components, utils)
4. Type imports (last)

### Error Handling

- Use `TRPCError` for API errors with appropriate codes:
  - `UNAUTHORIZED` - User not authenticated
  - `FORBIDDEN` - User lacks permission
  - `NOT_FOUND` - Resource doesn't exist
  - `INTERNAL_SERVER_ERROR` - Unexpected errors

### Logging

Use the `@kan/logger` package instead of `console.log`:

```typescript
import { logger, apiLogger, dbLogger } from "@kan/logger";

// Basic logging
logger.info("Server started", { port: 3000 });
logger.error("Failed to process request", error, { requestId: "..." });

// Scoped logging
apiLogger.debug("Processing card update", { cardId: "..." });
dbLogger.info("Query executed", { table: "cards", duration: 45 });

// Child loggers for request context
const reqLogger = logger.child({ requestId, userId });
reqLogger.info("Request started");
```

**Environment Variables:**
- `LOG_LEVEL`: `debug` | `info` | `warn` | `error` | `silent`
- `DB_LOG_QUERIES`: `true` | `false` - Enable database query logging

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
import { describe, it, expect, vi } from "vitest";
import { functionToTest } from "./module";

describe("functionToTest", () => {
  it("should do expected behavior", () => {
    const result = functionToTest(input);
    expect(result).toBe(expectedOutput);
  });
});
```

## Common Tasks

### Adding a New API Endpoint

1. **Define the router** in `packages/api/src/routers/`
2. **Add repository functions** in `packages/db/src/repository/`
3. **Register the router** in `packages/api/src/root.ts`
4. **Add tests** for both router and repository

### Adding a New Database Table

1. **Create schema** in `packages/db/src/schema/`
2. **Export from index** in `packages/db/src/schema/index.ts`
3. **Generate migration**: `pnpm db:push`
4. **Create repository** in `packages/db/src/repository/`

### Adding a New Package

1. Create directory under `packages/`
2. Add `package.json` with `"name": "@kan/packagename"`
3. Add `tsconfig.json` extending `@kan/tsconfig/internal-package.json`
4. Add `eslint.config.js` extending `@kan/eslint-config/base`

## Debugging Guide

### API Issues

1. **Check logs**: Look for structured log output with request context
2. **Enable debug logging**: Set `LOG_LEVEL=debug`
3. **Check tRPC error**: Response includes detailed error info
4. **Verify authentication**: Check for UNAUTHORIZED errors
5. **Verify authorization**: Check for FORBIDDEN errors

### Database Issues

1. **Enable query logging**: Set `DB_LOG_QUERIES=true`
2. **Check connection**: Verify `POSTGRES_URL` is set correctly
3. **Run migrations**: `pnpm db:migrate`
4. **Check schema**: Use `pnpm db:studio` for Drizzle Studio

### Frontend Issues

1. **Check React Query state**: Use React Query Devtools
2. **Check tRPC errors**: Errors are typed and include details
3. **Check console**: Look for React warnings/errors
4. **Verify API calls**: Network tab shows tRPC requests

### Running Locally

```bash
# Install dependencies
pnpm install

# Start development servers (all packages)
pnpm dev

# Start only the web app
pnpm dev:next

# Run with specific log level
LOG_LEVEL=debug pnpm dev
```

## Architecture Patterns

### tRPC Router Pattern

```typescript
export const entityRouter = createTRPCRouter({
  // Query: Read operations
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // 1. Get user ID
      const userId = ctx.user?.id;
      if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });
      
      // 2. Fetch resource
      const entity = await entityRepo.getById(ctx.db, input.id);
      if (!entity) throw new TRPCError({ code: "NOT_FOUND" });
      
      // 3. Verify access
      await assertUserInWorkspace(ctx.db, userId, entity.workspaceId);
      
      // 4. Return result
      return entity;
    }),
    
  // Mutation: Write operations  
  create: protectedProcedure
    .input(z.object({ ... }))
    .mutation(async ({ ctx, input }) => {
      // Similar pattern: auth → validate → execute → return
    }),
});
```

### Repository Pattern

```typescript
// packages/db/src/repository/entity.repo.ts

// Read operations
export const getById = (db: dbClient, id: string) => {
  return db.query.entities.findFirst({
    where: eq(entities.id, id),
  });
};

// Write operations
export const create = async (db: dbClient, input: EntityInput) => {
  const [result] = await db
    .insert(entities)
    .values({ ...input, publicId: generateUID() })
    .returning();
  return result;
};

// Transactions for complex operations
export const complexOperation = async (db: dbClient, ...) => {
  return db.transaction(async (tx) => {
    // Multiple operations in single transaction
  });
};
```

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_SECRET` | Secret for authentication |
| `POSTGRES_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_BASE_URL` | Public URL of the application |

### Optional (Logging)

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Minimum log level | `info` (prod) / `debug` (dev) |
| `DB_LOG_QUERIES` | Log database queries | `false` |

### Optional (Features)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_DISABLE_EMAIL` | Disable email features |
| `NEXT_PUBLIC_DISABLE_SIGN_UP` | Disable public registration |
| Various OAuth provider credentials | Enable social login |

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `UNAUTHORIZED` | Missing/invalid session | Check authentication flow |
| `FORBIDDEN` | User not in workspace | Verify workspace membership |
| `NOT_FOUND` | Resource deleted or wrong ID | Check publicId format |
| Connection refused | DB not running | Start PostgreSQL container |
| Module not found | Dependencies out of sync | Run `pnpm install` |

### Performance Tips

- Use `keepPreviousData` in React Query for smoother UX
- Batch database operations in transactions
- Use indexed columns in WHERE clauses
- Limit nested relation fetches in Drizzle queries

## Quick Reference

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

| Purpose | Location |
|---------|----------|
| API Routes | `packages/api/src/routers/` |
| DB Schema | `packages/db/src/schema/` |
| DB Queries | `packages/db/src/repository/` |
| React Pages | `apps/web/src/pages/` |
| React Views | `apps/web/src/views/` |
| Components | `apps/web/src/components/` |
| Environment | `apps/web/src/env.ts` |

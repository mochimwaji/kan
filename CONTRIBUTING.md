# Code Quality Best Practices

This document outlines coding standards and best practices to maintain code quality and avoid common lint errors.

## Table of Contents

1. [TypeScript Best Practices](#typescript-best-practices)
2. [React Best Practices](#react-best-practices)
3. [Promise Handling](#promise-handling)
4. [Environment Variables](#environment-variables)
5. [Unused Variables](#unused-variables)

---

## TypeScript Best Practices

### Avoid `any` Type

**❌ Don't:**

```typescript
const data: any = fetchData();
const handleClick = (event: any) => { ... };
```

**✅ Do:**

```typescript
interface DataType {
  id: string;
  name: string;
}
const data: DataType = fetchData();
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => { ... };
```

**When `any` is unavoidable:**

- Use `unknown` first, then narrow the type
- If truly needed, add an eslint-disable comment with explanation:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- External library returns untyped data
const result = externalLibrary.process() as any;
```

### Use Nullish Coalescing (`??`) Over Logical OR (`||`)

**❌ Don't:**

```typescript
const value = input || "default"; // Treats "" and 0 as falsy
```

**✅ Do:**

```typescript
const value = input ?? "default"; // Only treats null/undefined as nullish
```

### Use Optional Chaining

**❌ Don't:**

```typescript
if (obj && obj.prop && obj.prop.nested) { ... }
```

**✅ Do:**

```typescript
if (obj?.prop?.nested) { ... }
```

---

## React Best Practices

### Complete Hook Dependencies

**❌ Don't:**

```typescript
useEffect(() => {
  fetchData(userId);
}, []); // Missing userId dependency
```

**✅ Do:**

```typescript
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

**If a dependency should be excluded intentionally (rarely needed if using `useMemo`/`useCallback`):**

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps -- Only run on mount
useEffect(() => {
  initializeOnce();
}, []);
```

### Stable Function and Object Dependencies

To avoid unnecessary re-renders or infinite loops in `useEffect`, wrap objects and functions in `useMemo` or `useCallback`.

**❌ Don't:**

```typescript
// Recreated on every render, triggering useEffect every time
const options = { id: 1 };
const handleClick = () => { ... };

useEffect(() => {
  doSomething(options);
}, [options, handleClick]);
```

**✅ Do:**

```typescript
const options = useMemo(() => ({ id: 1 }), []);
const handleClick = useCallback(() => { ... }, []);

useEffect(() => {
  doSomething(options);
}, [options, handleClick]);
```

### Unnecessary Conditionals (Defensive Checks)

The `@typescript-eslint/no-unnecessary-condition` rule flags checks on values that TypeScript believes are always defined.

**❌ Don't (redundant optional chaining):**

```typescript
const user = { name: "Kan" };
console.log(user?.name); // Linter: Unnecessary optional chain
```

**✅ Do - Clean up redundant checks:**

```typescript
const user = { name: "Kan" };
console.log(user.name);
```

**✅ Do - Use `eslint-disable` with explanation for truly defensive runtime checks:**

```typescript
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive check for API consistency
if (!result) throw new Error("API failure");
```

### Unused Props/Variables

**❌ Don't:**

```typescript
function Component({ used, unused }) {
  return <div>{used}</div>;
}
```

**✅ Do - Remove if not needed:**

```typescript
function Component({ used }) {
  return <div>{used}</div>;
}
```

**✅ Do - Prefix with underscore if reserved for future use:**

```typescript
function Component({
  used,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Reserved for future collapsed UI
  unused: _unused
}) {
  return <div>{used}</div>;
}
```

---

## Promise Handling

### Always Handle Promises

**❌ Don't:**

```typescript
const handleClick = () => {
  fetchData(); // Floating promise!
};
```

**✅ Do - Await in async function:**

```typescript
const handleClick = async () => {
  await fetchData();
};
```

**✅ Do - Use void for intentional fire-and-forget:**

```typescript
const handleClick = () => {
  void fetchData(); // Explicitly marked as fire-and-forget
};
```

**✅ Do - Handle with .catch():**

```typescript
const handleClick = () => {
  fetchData().catch(console.error);
};
```

### Mutation Callbacks

In tRPC/React Query mutation callbacks, promises from invalidation calls should use `void`:

```typescript
const mutation = api.item.update.useMutation({
  onSuccess: () => {
    void utils.item.all.invalidate(); // ✅ Explicitly fire-and-forget
  },
});
```

---

## Environment Variables

### Use Validated Environment Access

**❌ Don't:**

```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

**✅ Do:**

```typescript
import { env } from "~/env";

const apiUrl = env.NEXT_PUBLIC_API_URL; // Validated and typed
```

**For runtime env (client-side):**

```typescript
import { env } from "next-runtime-env";

const baseUrl = env("NEXT_PUBLIC_BASE_URL");
```

**Exception - Server-only SSR logic:**

```typescript
// In api.ts for SSR URL detection
// eslint-disable-next-line no-restricted-properties -- SSR needs direct process.env access
if (process.env.VERCEL_URL) { ... }
```

---

## Unused Variables

### Remove Unused Imports

Run `pnpm lint --fix` to auto-remove some unused imports, or configure your editor to do this on save.

### Prefix Intentionally Unused Variables

When a variable is intentionally unused (e.g., destructured but not needed):

```typescript
// Array destructuring - skip first element
const [_first, second] = array;

// Object destructuring - keep for documentation/future use
const { used, unused: _unused } = props;
```

### Remove Unused Code

Don't leave dead code commented out. Use git history to recover if needed.

---

## Pre-commit Checklist

Before committing, ensure:

1. ✅ `pnpm typecheck` or `npx turbo run build` passes
2. ✅ `pnpm lint` or `npx turbo run lint` shows no new errors
3. ✅ No `any` types without justification
4. ✅ All promises are handled (use `void` if intentional fire-and-forget)
5. ✅ No unnecessary optional chaining or type assertions
6. ✅ Environment variables are declared in `turbo.json` under `globalEnv`
7. ✅ Environment variables use validated access

---

## IDE Setup (Recommended)

### VS Code Extensions

- ESLint
- TypeScript Vue Plugin (Volar)
- Prettier - Code formatter

### Settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

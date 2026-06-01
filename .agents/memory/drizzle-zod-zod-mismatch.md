---
name: drizzle-zod + zod 3.25 TS2344
description: createInsertSchema return type fails z.infer constraint; how to type insert rows instead.
---
With drizzle-zod 0.8.3 + zod 3.25.76, `createInsertSchema(table)` returns a ZodObject whose type does NOT satisfy `z.infer`'s `ZodType` constraint, producing TS2344 ("missing _type, _parse, ...") during `tsc --build` (gates `pnpm run typecheck` and the codegen typecheck:libs step).

**Why:** version/internal-shape mismatch between drizzle-zod's bundled zod and the workspace zod v4 surface.

**How to apply:** These insert schemas/types were unused app-wide. Derive insert row types from Drizzle natively instead: `export type InsertX = typeof xTable.$inferInsert;` and drop the createInsertSchema/z.infer lines. Runtime input validation uses the orval-generated api-zod schemas, not drizzle-zod.

---
name: Yajja frontend typecheck baseline
description: The yajja artifact ships with known pre-existing tsc errors that are not regressions.
---

# Yajja frontend has a known tsc error baseline

`pnpm --filter @workspace/yajja run typecheck` reports a set of **pre-existing** errors
that are unrelated to most feature work:

- `Property 'queryKey' is missing` on many `useGetX`/`useListX` calls that pass
  `{ query: { enabled, refetchInterval } }` without a `queryKey`.
- `Object literal may only specify known properties, and 'query' does not exist in
  type 'ListXParams'` / `status` typed as `OrderStatus` rejecting `string`.
- A few `'r' is of type 'unknown'` in admin-portal pages.

**Why:** These stem from the Orval-generated hook option shapes; they predate recent
features and don't affect runtime — the API server runs on `tsx` and the frontend on
Vite (esbuild), neither of which typechecks.

**How to apply:** After editing yajja, run typecheck and **diff against this baseline** —
only treat *new* errors in files you touched as yours to fix. Fixing the whole baseline is
a separate, systemic task (adjust Orval config or add `queryKey` everywhere), not a
prerequisite for shipping a feature.

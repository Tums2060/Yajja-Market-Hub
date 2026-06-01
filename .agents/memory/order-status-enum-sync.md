---
name: OrderStatus enum must match across OpenAPI, DB, and frontend
description: Why order status transitions can silently 400, and which enum is the source of truth.
---

# OrderStatus enum sync

The order status lifecycle is encoded in three places that must stay aligned:
- the Postgres `order_status` DB enum (the superset / source of truth),
- the OpenAPI `OrderStatus` schema in `lib/api-spec/openapi.yaml` (drives the Zod
  body validators via codegen),
- the frontend transition maps (e.g. the vendor portal `nextStatus` map).

**Rule:** the OpenAPI `OrderStatus` enum must contain every value the DB enum and the
frontend can send. The full set is:
`pending, accepted, confirmed, preparing, ready, picked_up, delivered, cancelled, rejected`
(`picked_up` doubles as "in transit"; there is no `in_transit` value).

**Why:** the OpenAPI enum was missing `accepted` and `rejected`. The vendor "advance
order" action sends `pending → accepted`, but `UpdateOrderStatusBody` (generated from
the spec) rejected `accepted`, so the route returned `400 Invalid body` — silently
breaking the very first step of the order flow. The DB accepted it fine; only the
generated Zod validator blocked it.

**How to apply:** if a status transition returns 400 "Invalid body", check the
OpenAPI `OrderStatus` enum first, add the missing value, then run
`pnpm --filter @workspace/api-spec run codegen`. Do not narrow this enum below the DB
enum.

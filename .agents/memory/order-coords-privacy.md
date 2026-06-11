---
name: Order delivery coordinates privacy
description: Policy for who may receive raw delivery coordinates on order payloads
---

Raw delivery coordinates (`deliveryLat`/`deliveryLng`) are sensitive. Policy:
only the **customer who owns the order**, the **rider assigned to it**, and
**admins** may ever receive them. Vendors NEVER get coordinates (address text
only); riders do NOT get coordinates for orders not assigned to them.

**Why:** order-enrichment spreads the raw order row, so any endpoint returning an
enriched order silently leaks coordinates unless the policy is applied. Leaks
previously slipped through list endpoints, single-order detail (IDOR), mutation
responses, and group-order fetches.

**How to apply:** there is a single policy source — a `canSeeCoords(user, order)`
helper in the orders route. Every enriched-order response must pass an explicit
coord-visibility decision derived from it; never return an enriched order with
coordinates unconditionally. When adding a new order endpoint, route its response
through this same helper so the rule can't drift.

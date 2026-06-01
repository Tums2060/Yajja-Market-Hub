---
name: Order lifecycle has multiple write paths
description: Status transitions and escrow release happen through more than one route — guards/side-effects must be mirrored on all of them.
---

# Order status / escrow has duplicate write paths

An order's status can be changed (and money side-effects triggered) through **more
than one endpoint**, not a single chokepoint:

- Generic `PUT /orders/:id/status` (vendor/rider/admin) — has the `ALLOWED_TRANSITIONS` guard.
- Dedicated rider routes `POST /riders/pickup/:id` and `POST /riders/deliver/:id` — these
  set status directly and originally **bypassed** the transition guard.
- Escrow release (`releaseEscrowForOrder`) must fire on delivery, but delivery can happen
  via *either* the deliver route *or* the generic status route → it must be called from both.

**Why:** A bug shipped where escrow was only released in `POST /riders/deliver`, so an
order delivered via `PUT /orders/:id/status` never paid out the vendor/rider. Same class of
gap for transition validation on pickup/deliver.

**How to apply:** When adding any new status-changing route or side-effect (payout,
notification, inventory), audit *every* route that can reach that status and apply the same
guard + side-effect. Keep `releaseEscrowForOrder` and the settle functions idempotent
(they check for existing ledger rows / non-pending payment) precisely because they can be
invoked from multiple paths.

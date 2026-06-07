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

# Payment gating: vendors only see PAID orders

Checkout is create-then-pay: `POST /orders` creates orders as `pending`/`unpaid` and
clears the cart, then the client calls `POST /orders/:id/mock-payment-confirm`.

**Decision:** The vendor notification + realtime `order:new` fire only at
**payment-confirm**, NOT at order creation, and the `/vendor-orders` feed filters
`paymentStatus === "paid"`. So unpaid/abandoned orders never reach the vendor.

**Why:** Order creation used to broadcast `order:new` immediately, so vendors saw unpaid
orders (and abandoned ones when the user cancelled the payment modal after the cart was
already cleared). `mock-payment-confirm` also guards against paying `cancelled`/`rejected`
orders.

**How to apply:** Any new vendor-facing order surface must filter to paid orders, and any
new "notify vendor of new order" side-effect belongs on the payment-confirm path, not
creation.

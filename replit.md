# Yajja — Multi-Category Delivery Platform

## Overview

Yajja is a Uganda-based multi-category delivery platform (Food, Liquor, Pharmacy, Household) with individual and group shopping modes. Built as a pnpm workspace monorepo using TypeScript.

## Portals
- **Customer Portal** (`/`) — shop, cart, checkout, orders, groups with chat & bill-split, leaderboard
- **Vendor Portal** (`/vendor-portal`) — dashboard, order management, product CRUD
- **Rider Portal** (`/rider-portal`) — order assignment, GPS tracking, delivery confirmation

## Seed Users (all passwords: `password123`)
- Customer: `kira@yajja.com`
- Vendor: `mamafua@yajja.com`
- Rider: `kasim@yajja.com`

## Seed Data
- 4 vendors (food, liquor, pharmacy, household)
- 13 products across all categories
- 1 group "Nakasero Crew"
- Rider "Kasim" registered

## Architecture

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

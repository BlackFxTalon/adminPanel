# AdminPanel

AdminPanel is migrating from the existing Astro prototype to a Nuxt 4 web
application. The Astro code at the repository root is a read-only visual
reference until migration parity is complete.

## Requirements

- Node.js 22.12 or newer
- pnpm 11.24.0 (`corepack enable && corepack prepare pnpm@11.24.0 --activate`)
- Google Chrome (used by the Playwright E2E suite)
- PostgreSQL 17 reachable through `DATABASE_URL` (Docker Desktop is also
  required by the disposable integration and E2E database tests)

## Clean installation

```sh
git clone https://github.com/BlackFxTalon/adminPanel
cd adminPanel
pnpm install --frozen-lockfile
```

The committed `pnpm-lock.yaml` is the only dependency lockfile. Applications
live under `apps/`, shared contracts and configuration under `packages/`, and
the root package contains the Astro reference.

## Development

Copy `.env.example` to `.env` and provide a JWT secret of at least 32
characters, local admin and User credentials, and a PostgreSQL connection URL.
The local auth seed reads credentials only from these environment variables;
`.env` is not committed. Apply the committed migrations and deterministic seed
before starting the applications. Set `NUXT_PUBLIC_ORDERS_DATA_MODE=http` to
exercise the real Orders path; leave it empty to use the mock adapter.

```sh
cp .env.example .env
pnpm --filter @admin-panel/api db:migrate
pnpm --filter @admin-panel/api db:seed
pnpm dev
```

The development command starts Nuxt at `http://localhost:3000` and NestJS at
`http://127.0.0.1:3001`. A Nitro server route proxies `/api/v1` to NestJS in
development and production so the browser uses one origin and the secure
HttpOnly refresh-cookie flow. Auth and E2E tests also load these values from
`.env` when the invoking environment does not provide them. The E2E gate runs
against the production Nuxt build.

The application shell owns one typed Overlay lifecycle and host. Feature pages
open registered Overlay implementations through `useOverlayLifecycle`; the
host centralizes stacking, focus, dismissal, dirty-form confirmation, inert
background state, route reset and scroll locking.

The protected `/orders` list and `/orders/:id` detail routes depend on the
typed `OrdersData` seam. The provider defaults to deterministic mock records;
set `NUXT_PUBLIC_ORDERS_DATA_MODE=http` to use the authenticated NestJS
implementation without changing the UI. Both adapters preserve pagination,
search, sort, status and Contragent filtering. Create Order uses the same seam
and shared Overlay lifecycle. The NestJS path derives Organization and
responsible User from the access token, validates referenced records inside
that Organization, calculates RUB totals on the server and persists the Order
and its items transactionally through Prisma/PostgreSQL.

| Command | Action |
| :-- | :-- |
| `pnpm dev` | Start the Nuxt and NestJS applications |
| `pnpm dev:astro` | Start the read-only Astro reference |
| `pnpm preview` | Preview the Nuxt production build |
| `pnpm --filter @admin-panel/api db:migrate` | Apply committed Prisma migrations to `DATABASE_URL` |
| `pnpm --filter @admin-panel/api db:seed` | Load the deterministic local Orders seed |

## Staging deployment (Timeweb VDS)

Staging runs web and API as separate containers under Docker Compose behind a
Caddy reverse proxy: Nuxt serves `/` and NestJS serves `/api/v1` on one public
origin, so the HttpOnly refresh cookie stays same-site. `GET /api/v1/health`
returns `{"status":"ok"}` when the application is up.

Configuration lives in `.env.staging` (copy `.env.staging.example`; never
committed): `DATABASE_URL` (staging Supabase PostgreSQL), `AUTH_JWT_SECRET`,
the four `AUTH_TEST_*` seed credentials the API loads at boot, and
`STAGING_DOMAIN`. Secrets are supplied to containers at run time only — they
never enter the repository or image layers.

```sh
cp .env.staging.example .env.staging   # fill in values
sh deploy/release.sh                   # build images, migrate, start, health check
sh deploy/seed.sh                      # optional deterministic Orders seed
```

`deploy/release.sh` builds the images, runs `prisma migrate deploy` through a
dedicated migration image before any application starts, then starts the
containers and polls the health endpoint for up to 60 seconds. A migration or
health-check failure stops the released containers and exits non-zero, leaving
the previously running version untouched until the next `docker compose up`.
Rollback boundary: re-deploy the previous image tags (`admin-panel-api:staging`,
`admin-panel-web:staging`) — migrations are forward-only and never run inside
the rollback path. Container logs are the operational log surface
(`docker compose logs -f api web`).

An E2E smoke against a staged origin runs with
`E2E_STAGING_BASE_URL=https://<staging-domain> pnpm --filter @admin-panel/web exec playwright test test/e2e/real-orders.spec.ts`
(using the same `AUTH_TEST_*` credentials).

## Quality gates

Every command fails when its configured check or test suite fails. Vitest and
Playwright also fail when their suite is unexpectedly empty.

| Command | Action |
| :-- | :-- |
| `pnpm typecheck` | Typecheck the strict Nuxt and API workspaces |
| `pnpm lint` | Lint the Nuxt and API workspaces |
| `pnpm test:unit` | Run unit tests for public domain/configuration seams |
| `pnpm test:component` | Run user-visible Vue component tests |
| `pnpm test:e2e` | Run Playwright browser tests against the Nuxt production build |
| `pnpm test` | Run unit and component suites |
| `pnpm build:web` | Build the Nuxt application |
| `pnpm build:api` | Build the typed API foundation |
| `pnpm build:shared` | Build shared HTTP-contract foundations |
| `pnpm build:astro` | Build the unchanged Astro visual reference |
| `pnpm build` | Build web, API and Astro in sequence |

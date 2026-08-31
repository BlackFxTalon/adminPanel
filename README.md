# AdminPanel

AdminPanel is migrating from the existing Astro prototype to a Nuxt 4 web
application. The Astro code at the repository root is a read-only visual
reference until migration parity is complete.

## Requirements

- Node.js 22.12 or newer
- pnpm 11.24.0 (`corepack enable && corepack prepare pnpm@11.24.0 --activate`)
- Google Chrome (used by the Playwright E2E suite)

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
characters plus local admin and User credentials. The local auth seed reads
credentials only from these environment variables; `.env` is not committed.

```sh
cp .env.example .env
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

| Command | Action |
| :-- | :-- |
| `pnpm dev` | Start the Nuxt and NestJS applications |
| `pnpm dev:astro` | Start the read-only Astro reference |
| `pnpm preview` | Preview the Nuxt production build |

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

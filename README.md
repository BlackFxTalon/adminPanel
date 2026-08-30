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

| Command | Action |
| :-- | :-- |
| `pnpm dev` | Start the Nuxt application at `http://localhost:3000` |
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
| `pnpm test:e2e` | Run Playwright browser tests against the Nuxt dev server |
| `pnpm test` | Run unit and component suites |
| `pnpm build:web` | Build the Nuxt application |
| `pnpm build:api` | Build the typed API foundation |
| `pnpm build:shared` | Build shared HTTP-contract foundations |
| `pnpm build:astro` | Build the unchanged Astro visual reference |
| `pnpm build` | Build web, API and Astro in sequence |

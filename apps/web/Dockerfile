# syntax=docker/dockerfile:1

FROM node:22.22-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/contracts/tsconfig.json packages/contracts/
COPY packages/contracts/src packages/contracts/src
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/ packages/typescript-config/
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile \
    && pnpm --filter @admin-panel/api run db:generate \
    && pnpm run build:shared
# Web sources land in a staging directory and are merged in only after the
# install-time node_modules is intact; host files never touch container-managed
# node_modules, so pnpm's symlinks stay valid for `nuxt build`.
COPY apps/web/nuxt.config.ts apps/web/nuxt.config.ts
COPY apps/web/tsconfig.json apps/web/tsconfig.json
COPY apps/web/eslint.config.mjs apps/web/eslint.config.mjs
COPY apps/web/app apps/web/app
COPY apps/web/server apps/web/server
RUN pnpm --filter @admin-panel/web exec nuxt prepare \
    && pnpm run build:web

FROM node:22.22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build /repo/apps/web/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

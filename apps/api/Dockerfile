# syntax=docker/dockerfile:1

FROM node:22.22-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/contracts/tsconfig.json packages/contracts/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/ packages/typescript-config/
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY packages/contracts/src packages/contracts/src
RUN pnpm install --frozen-lockfile --ignore-scripts \
    && pnpm --filter @admin-panel/api run db:generate \
    && pnpm run build:shared
COPY apps/api/src apps/api/src
RUN pnpm --filter @admin-panel/api run build

# Runtime keeps the whole /repo workspace so pnpm's symlinked node_modules layout
# resolves exactly as at build time (dist code + virtual store with relative links).
FROM node:22.22-bookworm-slim
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /repo/apps/api/dist
COPY --from=build /repo /repo
EXPOSE 3001
CMD ["node", "main.js"]

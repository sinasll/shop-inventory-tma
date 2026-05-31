# ── Multi-stage Docker build for the API (works on Fly.io / Railway / any VPS) ──
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @inv/api... --prod=false

# ---- build ----
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @inv/api db:generate \
 && pnpm --filter @inv/shared build \
 && pnpm --filter @inv/api build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/shared /app/packages/shared
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/api/prisma /app/apps/api/prisma
COPY --from=build /app/apps/api/package.json /app/apps/api/package.json
WORKDIR /app/apps/api
EXPOSE 4000
# Run pending migrations on boot, then start the server (which also runs cron).
CMD ["sh", "-c", "node ../../node_modules/prisma/build/index.js migrate deploy && node dist/server.js"]

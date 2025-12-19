ARG NODE_VERSION=22
ARG APP_DIRNAME=web
ARG PROJECT=@kan/web

# 1. Alpine image
FROM node:${NODE_VERSION}-alpine AS alpine
RUN apk update
RUN apk add --no-cache libc6-compat python3 make g++

# Setup pnpm and turbo on the alpine base
FROM alpine AS base
RUN corepack enable
# Replace <your-major-version> with the major version installed in your repository. For example:
# RUN npm install turbo@2.1.3 --global
RUN npm install turbo@2.3.1 --global

RUN pnpm config set store-dir ~/.pnpm-store

# 2. Prune projects
FROM base AS pruner
# https://stackoverflow.com/questions/49681984/how-to-get-version-value-of-package-json-inside-of-dockerfile
# RUN export VERSION=$(npm run version)

ARG PROJECT

# Set working directory
WORKDIR /app

# It might be the path to <ROOT> turborepo
COPY . .
 
# Generate a partial monorepo with a pruned lockfile for a target workspace.
# Assuming "@acme/nextjs" is the name entered in the project's package.json: { name: "@acme/nextjs" }
RUN turbo prune --scope=${PROJECT} --scope=@kan/db --docker
 
# 3. Build the project
FROM base AS builder
ARG PROJECT

# Environment to skip .env validation on build
ENV CI=true
ENV NEXT_PUBLIC_USE_STANDALONE_OUTPUT=true

WORKDIR /app

# Copy lockfile and package.json's of isolated subworkspace
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/out/json/ .

# First install the dependencies (as they change less often)
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store,sharing=locked pnpm install --frozen-lockfile
 
# Copy source code of isolated subworkspace
COPY --from=pruner /app/out/full/ .

# Compile Lingui translations before build
RUN pnpm --filter=@kan/web lingui:extract && pnpm --filter=@kan/web lingui:compile

RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store \
    --mount=type=cache,target=/app/apps/${APP_DIRNAME}/.next/cache,sharing=locked \
    --mount=type=cache,target=/app/node_modules/.cache \
    --mount=type=cache,target=/app/.turbo \
    pnpm build --filter=${PROJECT}

# 4. Final image - runner stage to run the application
FROM base AS runner
ARG APP_DIRNAME

# Setup production user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_PUBLIC_USE_STANDALONE_OUTPUT=true
ENV MIGRATIONS_PATH=/app/migrations

COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_DIRNAME}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_DIRNAME}/.next/static ./apps/${APP_DIRNAME}/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_DIRNAME}/public ./apps/${APP_DIRNAME}/public
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/src/migrate.ts ./migrate.ts
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_DIRNAME}/entrypoint.sh ./entrypoint.sh

# Final root-level setup: generate ESM package.json and set ownership
USER root
# We need to ensure /app and /app/data are owned by nextjs
RUN echo '{"type": "module"}' > /app/package.json && \
    mkdir -p /app/data/avatars /app/data/attachments && \
    chown -R nextjs:nodejs /app && \
    sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

USER nextjs

ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["./entrypoint.sh"]

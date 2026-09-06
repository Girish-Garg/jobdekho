# syntax=docker/dockerfile:1

# Stage 1: build the SPA. This needs the whole workspace, dev dependencies
# included: vite and tailwind are devDependencies of apps/web, and npm resolves
# every @jobdekho/* link from the root lockfile, so one package copied on its
# own does not install. Node 20 to match .nvmrc.
FROM node:20-alpine AS build
WORKDIR /app
# Manifests first, so a source-only change reuses the cached npm ci layer.
COPY package.json package-lock.json ./
COPY apps/scraper/package.json apps/scraper/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/notify/package.json packages/notify/
COPY packages/sources/package.json packages/sources/
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: the runtime. Production dependencies only, no bundler, and the built
# SPA copied over from stage 1 so apps/server hosts it on one origin - the same
# `npm run build && npm start` path the README describes, minus the host.
FROM node:20-alpine
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node apps/scraper/package.json apps/scraper/
COPY --chown=node:node apps/server/package.json apps/server/
COPY --chown=node:node apps/web/package.json apps/web/
COPY --chown=node:node packages/core/package.json packages/core/
COPY --chown=node:node packages/db/package.json packages/db/
COPY --chown=node:node packages/notify/package.json packages/notify/
COPY --chown=node:node packages/sources/package.json packages/sources/
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node packages ./packages
COPY --chown=node:node apps/server ./apps/server
COPY --chown=node:node apps/scraper ./apps/scraper
COPY --chown=node:node config ./config
COPY --chown=node:node --from=build /app/apps/web/dist ./apps/web/dist
# The image's built-in unprivileged user. Its home, /home/node, is where
# docker-compose.yml mounts the host's Claude Code credentials.
USER node
EXPOSE 3000
# The migration is additive and IF NOT EXISTS throughout (see
# packages/db/src/migrate.js), so running it on every boot is what lets a fresh
# volume come up usable without a second command, at the cost of a few
# no-op statements on every later boot. exec hands the process to node so a
# stop signal reaches the server rather than the shell.
CMD ["sh", "-c", "node packages/db/src/migrate.js && exec node apps/server/src/server.js"]

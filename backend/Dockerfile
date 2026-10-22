# PetsApp backend (NestJS 12, ESM). Build context: backend/
# Dokploy: buildType=dockerfile, dockerfile=backend/Dockerfile, context=backend
FROM node:24.22.1-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build && test -f dist/main.js && test -f dist/db/migrate.js

FROM node:24.22.1-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
# bcrypt ships N-API prebuilds (including linux musl) inside its tarball and
# loads them with node-gyp-build, so no compiler is needed. The hash call
# fails the build if the native binding cannot be loaded on this platform.
RUN npm ci --omit=dev \
  && npm cache clean --force \
  && node -e "require('bcrypt').hashSync('build-check', 4)"

COPY --from=builder /app/dist ./dist
# SQL migrations applied at startup by dist/db/migrate.js
COPY --from=builder /app/drizzle ./drizzle

USER node
EXPOSE 3000
# Liveness only: GET / never touches the database, so a database outage cannot
# make the platform restart a healthy app. start-period covers the migrations
# that run before the app listens.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Migrations run first; the app only starts if they succeed. exec hands PID 1
# to Node so SIGTERM reaches Nest's shutdown hooks (pool close).
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/main.js"]

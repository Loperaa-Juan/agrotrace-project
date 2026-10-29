# 1. deps: todas las dependencias (necesarias para compilar) ----------
FROM node:24-alpine AS deps
RUN corepack enable
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

# 2. build: compila SOLO el microservicio indicado ----------
FROM deps AS build
COPY . .
ARG APP
RUN pnpm exec nest build ${APP}

# 3. prod-deps: solo dependencias de producción ----------
FROM node:24-alpine AS prod-deps
RUN corepack enable
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --prod

# 4. runtime: imagen final ligera ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --from=prod-deps /usr/src/app/node_modules ./node_modules

ARG APP
COPY --from=build /usr/src/app/dist/apps/${APP} ./dist

USER node
CMD ["node", "dist/main.js"]

FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Vite incrusta las VITE_* al compilar, por eso llegan como build args
ARG VITE_USERS_API_URL
ARG VITE_CATALOG_API_URL
ARG VITE_ORDERS_API_URL

COPY . .
RUN pnpm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
# --- Build: install dependencies and compile the TanStack Start app (Nitro node-server output) ---
FROM node:22-slim AS build

ARG PNPM_VERSION=12
RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app

# Dependency manifests first, so the install layer is cached until they change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build


# --- Run: the build output is self-contained (Nitro bundles its dependencies) ---
FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3003 \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3003

COPY --from=build /app/.output ./.output

USER node
EXPOSE 3003

CMD ["node", ".output/server/index.mjs"]

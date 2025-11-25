# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps

# Install canvas native dependencies for Alpine Linux
RUN apk add --no-cache \
    build-base \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

COPY package.json package-lock.json ./
RUN npm install

FROM deps AS build
COPY frontend frontend
COPY server server
COPY scripts scripts
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Install canvas build and runtime dependencies for Alpine Linux
# Python and build tools are needed to compile canvas during npm install
RUN apk add --no-cache \
    python3 \
    build-base \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY --from=build /app/server ./server
COPY --from=build /app/frontend/dist ./frontend/dist
COPY simulator simulator

EXPOSE 8082

CMD ["npm", "start"]

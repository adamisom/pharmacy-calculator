FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY svelte.config.js ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY src ./src
COPY static ./static
COPY postcss.config.js ./
COPY tailwind.config.ts ./
COPY eslint.config.js ./
RUN npm ci && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
EXPOSE 3000
CMD ["node", "build"]


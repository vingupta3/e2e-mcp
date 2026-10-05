# Multi-stage Docker build for E2E Networks MCP Server
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Default to hosted HTTP/SSE mode in container
CMD ["node", "dist/index.js", "--http"]

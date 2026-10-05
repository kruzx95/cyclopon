# ── Stage 1: Build & Dependencies ──
FROM node:22-alpine AS builder

WORKDIR /app

# Install native build tools for compiling better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: Production Runtime ──
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime utilities (wget for health check)
RUN apk add --no-cache wget

# Copy production node_modules from builder
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Ensure persistent directories exist
RUN mkdir -p data public/gpx

EXPOSE 3000

# Native health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]

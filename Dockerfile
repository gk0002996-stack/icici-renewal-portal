# ==============================================================================
# Production Dockerfile for High-Volume (10,000+ Customer) Deployments
# Multi-stage optimized build for Node.js / Express + React Vite
# Zero Rate Limits, Full Concurrency, Autoscaling Ready
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with clean cache
COPY package*.json ./
RUN npm ci

# Copy source and build single-bundle production assets
COPY . .
RUN npm run build

# --- PRODUCTION RUNTIME ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled production artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/data ./data
COPY --from=builder /app/assets ./assets

EXPOSE 3000

# Start high-performance Node production server
CMD ["node", "server.ts"]

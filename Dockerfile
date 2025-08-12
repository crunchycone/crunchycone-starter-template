# ============================================
# CrunchyCone Platform Dockerfile
# ============================================
# This is a specialized Dockerfile for the CrunchyCone platform.
# DO NOT modify this file if you are deploying to CrunchyCone.
# The platform expects this specific configuration for optimal performance.
# ============================================

# Multi-stage build for optimized production image
# Stage 1: Dependencies
FROM node:22-slim AS deps
# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Builder
FROM node:22-slim AS builder
# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package.json package-lock.json ./
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application
# Set dummy DATABASE_URL for build time (will be overridden at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:./db/dummy.db"
RUN npm run build

# Stage 3: Runner (production image)
# Using debian-slim instead of alpine for better native module compatibility
FROM node:22-slim AS runner
# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install Prisma CLI for migrations (required for entrypoint)
RUN npm install -g prisma@6.13.0

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary files from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and migrations for runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy Turso adapter dependencies (from deps stage that has production dependencies)
COPY --from=deps /app/node_modules/@libsql ./node_modules/@libsql
COPY --from=deps /app/node_modules/libsql ./node_modules/libsql

# Copy entrypoint script
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create writable directories for the app (entrypoint will handle db folder creation)
RUN chown -R nextjs:nodejs /app/prisma

# Switch to non-root user
USER nextjs

# Expose port (Next.js default)
EXPOSE 3000

# Environment variables will be read from external environment at runtime
# The following are common variables that should be set:
# DATABASE_URL - SQLite file path or external database URL
# JWT_SECRET - Secret key for JWT tokens
# NEXT_PUBLIC_APP_URL - Public URL of the application
# EMAIL_FROM - Default from email address

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)}).on('error', () => process.exit(1))"

# Use entrypoint script for database initialization
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Start the application
CMD ["node", "server.js"]
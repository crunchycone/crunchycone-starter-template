#!/bin/sh
set -e

echo "🚀 Starting CrunchyCone application..."

# ============================================
# Platform Auto-Detection
# ============================================

echo "🔍 Auto-detecting deployment platform..."

# Auto-detect platform based on environment variables
DETECTED_PLATFORM="default"

if [ -n "$CLOUDFLARE_DEPLOYMENT_ID" ] || [ -n "$CLOUDFLARE_LOCATION" ] || [ "$PLATFORM" = "cloudflare" ]; then
    DETECTED_PLATFORM="cloudflare"
    echo "  🟧 Cloudflare Containers detected"
elif [ -n "$RENDER_SERVICE_ID" ] || [ "$RENDER" = "true" ] || [ "$PLATFORM" = "render" ]; then
    DETECTED_PLATFORM="render"
    echo "  🟦 Render.com detected"
elif [ -n "$FLY_APP_NAME" ] || [ -n "$PRIMARY_REGION" ] || [ "$PLATFORM" = "flyio" ]; then
    DETECTED_PLATFORM="flyio"
    echo "  🟪 Fly.io detected"
elif [ -n "$PORT" ] && [ -n "$K_SERVICE" ] || [ "$PLATFORM" = "gcp" ]; then
    DETECTED_PLATFORM="gcp"
    echo "  🟨 Google Cloud Run detected"
else
    echo "  🟫 Unknown platform, using default configuration"
fi

echo "🎯 Platform: $DETECTED_PLATFORM"

# ============================================
# Platform-Specific Configuration
# ============================================

# Default configuration (works for Render, GCP, Fly.io)
export HOSTNAME="0.0.0.0"
MIGRATION_STRICT=false

# Cloudflare-specific overrides
if [ "$DETECTED_PLATFORM" = "cloudflare" ]; then
    echo "🔧 Applying Cloudflare-specific configuration"
    export PORT="8080"           # Cloudflare uses port 8080
    MIGRATION_STRICT=true        # Stricter error handling for Cloudflare
else
    echo "🔧 Using default configuration"
    # PORT remains from environment (Render/GCP/Fly.io set this)
fi

echo "📋 Final Configuration:"
echo "  - Platform: $DETECTED_PLATFORM"
echo "  - DATABASE_URL: $(echo "$DATABASE_URL" | cut -c1-30)..."
echo "  - TURSO_AUTH_TOKEN: $([ -n "$TURSO_AUTH_TOKEN" ] && echo "SET" || echo "unset")"
echo "  - JWT_SECRET: $([ -n "$JWT_SECRET" ] && echo "SET" || echo "unset")"
echo "  - NODE_ENV: $NODE_ENV"
echo "  - PORT: $PORT"
echo "  - HOSTNAME: $HOSTNAME"

# ============================================
# Database Setup (Unified Logic)
# ============================================

# Function to run standard Prisma migrations
run_prisma_migrations() {
  echo "🔍 Checking migration status..."
  if npx prisma migrate status >/dev/null 2>&1; then
    echo "✅ Database is up-to-date, no migrations needed"
    return 0
  fi
  
  echo "🔄 Running database migrations..."
  npx prisma migrate deploy 2>/dev/null || {
    echo "⚠️  Migrations failed or not found, pushing schema directly..."
    npx prisma db push --skip-generate
  }
}

# Check if we're using Turso (libSQL) - requires special handling
if echo "$DATABASE_URL" | grep -q "^libsql://"; then
  echo "📡 Detected Turso database configuration"
  if [ -z "$TURSO_AUTH_TOKEN" ]; then
    echo "❌ TURSO_AUTH_TOKEN is required for Turso database"
    exit 1
  fi

  echo "🔄 Running Turso database migrations..."
  if node /app/scripts/turso-migrate.js; then
    echo "✅ Turso migrations completed successfully"
  else
    if [ "$MIGRATION_STRICT" = "true" ]; then
      echo "❌ Migration failed"
      exit 1
    else
      echo "⚠️  Some migrations may have failed, but continuing..."
    fi
  fi
  echo "✅ Turso database ready"

# SQLite (file-based) - needs directory setup + seeding
elif echo "$DATABASE_URL" | grep -q "^file:"; then
  echo "📁 Detected SQLite database configuration"

  # Extract database path and setup directory
  DB_PATH=$(echo "$DATABASE_URL" | sed 's/^file://')
  DB_DIR=$(dirname "$DB_PATH")

  if [ ! -d "$DB_DIR" ]; then
    echo "📂 Creating database directory: $DB_DIR"
    mkdir -p "$DB_DIR" || true
  fi

  if [ ! -w "$DB_DIR" ]; then
    echo "⚠️  Warning: Database directory is not writable. Volume permissions may need adjustment."
  fi

  # Handle new vs existing database
  if [ ! -f "$DB_PATH" ]; then
    echo "🔧 Database not found at $DB_PATH"
    run_prisma_migrations
    
    # Seed new database
    if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
      echo "🌱 Seeding database with initial data..."
      npx prisma db seed || echo "⚠️  Seeding failed, continuing anyway..."
    fi
  else
    echo "✅ Database found at $DB_PATH"
    run_prisma_migrations
  fi

# All other databases (PostgreSQL, MySQL, etc.) - standard migrations
else
  # Detect and display database type
  if echo "$DATABASE_URL" | grep -q "^postgres"; then
    echo "🐘 Detected PostgreSQL database configuration"
  elif echo "$DATABASE_URL" | grep -q "^mysql"; then
    echo "🐬 Detected MySQL database configuration"
  else
    echo "🗄️  Detected external database configuration"
  fi
  
  run_prisma_migrations
fi

echo "✨ Database setup complete!"

# ============================================
# Application Startup
# ============================================

echo "🚀 Starting Next.js application..."

echo "🔍 Application startup verification:"
echo "  - HOSTNAME: $HOSTNAME"
echo "  - PORT: $PORT"
echo "  - NODE_ENV: $NODE_ENV"
echo "  - Platform: $DETECTED_PLATFORM"
echo "  - Static files: $([ -d '.next/static' ] && echo 'Ready' || echo 'Missing')"
echo "  - Server: $([ -f 'server.js' ] && echo 'Ready' || echo 'Missing')"

# Start with additional logging
echo "🚀 Executing: $@"
exec "$@"

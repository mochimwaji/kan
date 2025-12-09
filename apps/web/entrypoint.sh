#!/bin/sh

# Entrypoint script for Kan web application
# Regenerates runtime environment, runs database migrations if needed, then starts the Next.js server

set -e

echo "=========================================="
echo "Kan Web Application Startup"
echo "=========================================="

# Run database migrations if POSTGRES_URL is set
if [ -n "$POSTGRES_URL" ]; then
    echo ""
    echo "Checking database schema..."
    
    # Run the migration script using Node.js with TypeScript loader
    # The migrate.ts script checks if schema exists and runs migrations if needed
    if [ -f "./migrate.ts" ]; then
        node --experimental-strip-types ./migrate.ts
        MIGRATE_EXIT_CODE=$?
        
        if [ $MIGRATE_EXIT_CODE -ne 0 ]; then
            echo "ERROR: Database migration failed with exit code $MIGRATE_EXIT_CODE"
            echo "Please check your database connection and try again."
            exit 1
        fi
    else
        echo "WARNING: migrate.ts not found, skipping migrations"
    fi
else
    echo "POSTGRES_URL not set, skipping database migrations"
fi

echo ""
echo "Generating runtime environment configuration..."

# Generate __ENV.js with all NEXT_PUBLIC_* environment variables at runtime
# This is needed because Next.js standalone mode bakes NEXT_PUBLIC_* at build time,
# but we need them to be configurable via .env at runtime.
ENV_FILE="./apps/web/.next/static/__ENV.js"
PUBLIC_DIR="./apps/web/public"

# Create the __ENV.js content by extracting all NEXT_PUBLIC_* environment variables
echo -n 'window.__ENV = {' > "$ENV_FILE"
first=true
for var in $(printenv | grep '^NEXT_PUBLIC_' | cut -d= -f1); do
    value=$(printenv "$var")
    if [ "$first" = true ]; then
        first=false
    else
        echo -n ',' >> "$ENV_FILE"
    fi
    # Escape quotes in the value and wrap in quotes
    escaped_value=$(echo "$value" | sed 's/"/\\"/g')
    echo -n "\"$var\":\"$escaped_value\"" >> "$ENV_FILE"
done
echo '};' >> "$ENV_FILE"

# Also copy to public directory for serving
if [ -d "$PUBLIC_DIR" ]; then
    cp "$ENV_FILE" "$PUBLIC_DIR/__ENV.js"
fi

echo "Runtime environment configured with $(printenv | grep -c '^NEXT_PUBLIC_' || echo 0) public variables"

echo ""
echo "Starting Next.js application..."

# Check if we should use standalone mode
if [ "$NEXT_PUBLIC_USE_STANDALONE_OUTPUT" = "true" ]; then
    echo "Starting in standalone mode..."
    # The standalone output preserves the directory structure relative to the project root
    exec node apps/web/server.js
else
    echo "Starting in standard mode..."
    exec pnpm start
fi


#!/bin/bash
set -e

# Debug: Check if REDIS_URL is available (write to stderr for Railway logs)
>&2 echo "=== DEBUG: REDIS_URL is: $REDIS_URL ==="
>&2 echo "=== DEBUG: DATABASE_URL is: ${DATABASE_URL:0:30}... ==="

# Create .env file from Railway environment variables
cat > .env << EOF
DATABASE_URL=$DATABASE_URL
REDIS_URL=$REDIS_URL
JWT_SECRET=$JWT_SECRET
COOKIE_SECRET=$COOKIE_SECRET
STORE_CORS=$STORE_CORS
ADMIN_CORS=$ADMIN_CORS
AUTH_CORS=$AUTH_CORS
EOF

# Debug: Show .env file contents
>&2 echo "=== DEBUG: .env file created ==="
>&2 cat .env | head -5

# Run migrations from root
yarn medusa db:migrate

# Start from .medusa/server directory (required by Medusa)
cd .medusa/server
exec npx medusa start

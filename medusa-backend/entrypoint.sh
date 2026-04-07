#!/bin/bash
set -e

# Debug: Check if REDIS_URL is available
echo "=== DEBUG: REDIS_URL is: $REDIS_URL ==="
echo "=== DEBUG: DATABASE_URL is: ${DATABASE_URL:0:30}... ==="

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
echo "=== DEBUG: .env file created ==="
cat .env | head -5

# Run migrations from root
yarn medusa db:migrate

# Create publishable key if PUBLISHABLE_KEY is set
if [ -n "$PUBLISHABLE_KEY" ]; then
  echo "Publishable key provided: $PUBLISHABLE_KEY"
fi

# Start from .medusa/server directory (required by Medusa)
cd .medusa/server
exec npx medusa start

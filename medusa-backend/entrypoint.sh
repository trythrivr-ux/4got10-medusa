#!/bin/bash
set -e

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

# Run migrations from root
yarn medusa db:migrate

# Create publishable key if PUBLISHABLE_KEY is set
if [ -n "$PUBLISHABLE_KEY" ]; then
  echo "Publishable key provided: $PUBLISHABLE_KEY"
fi

# Start from .medusa/server directory (required by Medusa)
cd .medusa/server
exec npx medusa start

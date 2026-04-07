#!/bin/bash
set -e

# Create .env file from Railway environment variables
cat > .env << EOF
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
COOKIE_SECRET=$COOKIE_SECRET
STORE_CORS=$STORE_CORS
ADMIN_CORS=$ADMIN_CORS
AUTH_CORS=$AUTH_CORS
EOF

# Debug: Check if .medusa folder exists
echo "Checking .medusa folder..."
ls -la .medusa/ 2>/dev/null || echo ".medusa folder not found"
ls -la .medusa/server/ 2>/dev/null || echo ".medusa/server not found"

# Run migrations and start
yarn medusa db:migrate
exec yarn start

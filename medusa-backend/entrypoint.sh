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

# Debug: Find admin build
echo "=== Checking .medusa structure ==="
ls -laR .medusa/ 2>/dev/null | head -100
echo "=== Searching for index.html ==="
find .medusa -name "*.html" 2>/dev/null
find . -name "index.html" -path "*/.medusa/*" 2>/dev/null

# Run migrations and start
yarn medusa db:migrate
exec yarn start

FROM node:20-bookworm

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN corepack enable && corepack prepare yarn@1.22.22 --activate && yarn install --frozen-lockfile

# Copy source files - this invalidates cache when any source file changes
COPY medusa-config.ts ./
COPY src ./src
COPY entrypoint.sh ./

# Build the application (no cache from previous builds)
RUN yarn build --force 2>&1

# Verify build output and config contains redisUrl
RUN ls -la .medusa/server/public/admin/
RUN grep "redisUrl" .medusa/server/medusa-config.js && echo "redisUrl found in config!"

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 9000

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

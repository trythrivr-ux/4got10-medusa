FROM node:20-bookworm

# Force rebuild timestamp
ARG REBUILD_DATE=2026-04-07-v2

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN corepack enable && corepack prepare yarn@1.22.22 --activate && yarn install --frozen-lockfile

# Copy source files
COPY . .

# Clean previous build and rebuild
RUN rm -rf .medusa && yarn build

# Verify build output and config
RUN ls -la .medusa/server/public/admin/ && cat .medusa/server/public/admin/index.html
RUN grep -A2 "redisUrl" .medusa/server/medusa-config.js || echo "redisUrl not found in compiled config!"

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 9000

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

# Force cache invalidation with build timestamp
ARG BUILD_DATE=2026-04-08-v2
FROM node:20.12-bookworm-slim

# Re-declare ARG after FROM
ARG BUILD_DATE
RUN echo "Build date: $BUILD_DATE"

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN corepack enable && corepack prepare yarn@1.22.22 --activate && yarn install --frozen-lockfile

# Copy all source files
COPY . .

# Remove any cached build and rebuild fresh
RUN rm -rf .medusa && yarn build

# Verify redisUrl and cookieOptions are in compiled config
RUN echo "=== Checking compiled config ===" && \
    grep "redisUrl" .medusa/server/medusa-config.js && echo "SUCCESS: redisUrl found" && \
    grep "cookieOptions" .medusa/server/medusa-config.js && echo "SUCCESS: cookieOptions found"

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/app/entrypoint.sh"]

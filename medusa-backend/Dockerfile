FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN corepack enable && corepack prepare yarn@1.22.22 --activate && yarn install --frozen-lockfile

# Copy all source files
COPY . .

# Build the application
RUN yarn build

# Verify redisUrl is in compiled config
RUN grep "redisUrl" .medusa/server/medusa-config.js && echo "SUCCESS: redisUrl in config"

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/app/entrypoint.sh"]

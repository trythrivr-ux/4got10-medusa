FROM node:20-bookworm

# Cache bust
ARG CACHE_BUST=1

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN corepack enable && corepack prepare yarn@1.22.22 --activate && yarn install --frozen-lockfile

# Copy source files (excluding .medusa via .dockerignore)
COPY . .

# Build the application
RUN yarn build

# Verify build output
RUN ls -la .medusa/server/public/admin/ && cat .medusa/server/public/admin/index.html

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Debug: show entrypoint contents
RUN echo "=== Entrypoint contents ===" && head -10 /app/entrypoint.sh

# Expose port
EXPOSE 9000

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

FROM node:20-bookworm

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN corepack enable && corepack prepare yarn@1.22.22 --activate && yarn install --frozen-lockfile

# Copy source and build
COPY . .
RUN yarn build

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 9000

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

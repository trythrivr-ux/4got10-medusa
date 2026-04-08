# Force cache invalidation with alpine image
FROM node:20-alpine

# Install build dependencies and bash for entrypoint
RUN apk add --no-cache python3 make g++ bash

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN corepack enable && corepack prepare yarn@1.22.22 --activate && yarn install --frozen-lockfile

# Copy source files individually to control what gets copied
COPY medusa-config.ts ./
COPY medusa-config.runtime.js ./
COPY tsconfig.json ./
COPY src ./src
COPY entrypoint.sh ./
COPY .build-cache ./

# Build the application (no .medusa folder exists at this point)
RUN yarn build

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/app/entrypoint.sh"]

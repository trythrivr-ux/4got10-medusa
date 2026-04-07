FROM node:20-bookworm

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN corepack enable && corepack prepare yarn@1.22.22 --activate && yarn install --frozen-lockfile

# Copy source and build
COPY . .
RUN yarn build

# Expose port
EXPOSE 9000

# Start command
CMD ["yarn", "start"]

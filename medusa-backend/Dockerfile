FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Remove devDependencies after build to keep image small
RUN npm prune --production

# Expose port
EXPOSE 9000

# Start
CMD ["npm", "run", "start"]

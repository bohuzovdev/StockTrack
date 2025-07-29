# Simple single-stage build for Railway
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files for caching
COPY package*.json ./

# Install dependencies
RUN npm install --production=false

# Copy all project files
COPY . .

# Build the client - simple approach
RUN npm run build

# Clean up dev dependencies to save space
RUN npm prune --production

# Expose port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["npm", "start"] 
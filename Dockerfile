# Use official Node.js runtime as base image
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm install

# Copy project files in the correct order
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./
COPY drizzle.config.ts ./

# Copy source directories
COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/

# Verify the client directory structure exists
RUN echo "=== Checking client directory ===" && ls -la client/
RUN echo "=== Checking if index.html exists ===" && ls -la client/index.html

# Build the client (Vite expects client/index.html to exist)
RUN npm run build

# Verify build output
RUN echo "=== Checking build output ===" && ls -la client/dist/

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Expose port (Railway will override this)
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["npm", "start"] 
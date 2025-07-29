# Multi-stage build for better Vite handling
FROM node:18-alpine AS builder

# Set working directory for build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm install

# Copy all source files
COPY . .

# Debug: Show directory structure before build
RUN echo "=== Directory structure ===" && ls -la
RUN echo "=== Client directory ===" && ls -la client/
RUN echo "=== Vite config ===" && cat vite.config.ts

# Build the application
RUN npm run build

# Debug: Show build output
RUN echo "=== Build output ===" && ls -la client/dist/

# Production stage
FROM node:18-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/vite.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# Expose port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["npm", "start"] 
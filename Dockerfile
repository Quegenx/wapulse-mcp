FROM node:22-slim

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Create non-root user for security
RUN addgroup --gid 1001 --system nodejs
RUN adduser --system --uid 1001 sunday

# Change ownership of the app directory
RUN chown -R sunday:nodejs /app
USER sunday

# Expose the port
EXPOSE 8080

# Set default PORT if not provided
ENV PORT=8080

# Start the server
CMD ["node", "dist/index.js"] 
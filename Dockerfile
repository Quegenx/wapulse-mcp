FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and config files
COPY src/ ./src/
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Set environment variables (will be overridden by Smithery)
ENV WAPULSE_TOKEN=""
ENV WAPULSE_INSTANCE_ID=""
ENV PORT=3000

# Expose port (Smithery will handle this)
EXPOSE $PORT

# Start the HTTP server wrapper
CMD ["node", "dist/http-server.js"] 
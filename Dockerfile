FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code and config files
COPY src/ ./src/
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Set environment variable for API token (will be overridden by Smithery)
ENV MEDICI_API_TOKEN=""

# Expose port (Smithery will handle this)
EXPOSE 3000

# Start the MCP server
CMD ["node", "dist/index.js"] 
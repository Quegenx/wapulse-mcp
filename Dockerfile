FROM node:22-slim

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build with Smithery CLI to get streamable HTTP
RUN npx -y @smithery/cli@1.2.9 build -o .smithery/index.cjs

# Create non-root user for security
RUN addgroup --gid 1001 --system nodejs
RUN adduser --system --uid 1001 sunday

# Change ownership of the app directory
RUN chown -R sunday:nodejs /app
USER sunday

# Expose the port that Smithery expects
EXPOSE 8080

# Set default PORT if not provided
ENV PORT=8080

# Start the Smithery-built server with streamable HTTP
CMD ["node", ".smithery/index.cjs"] 
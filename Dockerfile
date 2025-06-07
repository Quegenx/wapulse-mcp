FROM node:22-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build with Smithery CLI
RUN npx -y @smithery/cli@1.2.9 build -o .smithery/index.cjs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sunday -u 1001

# Change ownership of the app directory
RUN chown -R sunday:nodejs /app
USER sunday

# Expose the port that Smithery will use
EXPOSE 8080

# Set default PORT if not provided
ENV PORT=8080

# Start the Smithery-built application
CMD ["node", ".smithery/index.cjs"] 
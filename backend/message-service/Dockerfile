FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5002

# Expose the port and the WebSocket port
EXPOSE 5002

# Run the application
CMD ["node", "src/index.js"] 
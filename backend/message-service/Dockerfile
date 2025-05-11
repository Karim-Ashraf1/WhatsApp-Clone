FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .


# Expose the port and the WebSocket port
EXPOSE 5002

# Run the application
CMD ["npm", "start"] 
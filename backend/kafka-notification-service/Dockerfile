FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all other files
COPY . .

# Expose port
EXPOSE 3000

# Command to run the app
CMD ["npm", "start"] 
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Bundle app source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Set environment variables
ENV PORT=8081
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 8081

# Command to run the application
CMD ["npm", "start"]
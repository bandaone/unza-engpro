FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package.json ./

# Install dependencies and create a new lock file
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm i --save-dev @types/node

# Install serve to run the built app
RUN npm install -g serve

EXPOSE 5173

# Run the app
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

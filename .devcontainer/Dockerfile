# Use the specified Node.js image as a base
FROM node:18 AS builder

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install git
    
# Set the working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker caching
COPY package*.json .

# Install dependencies
RUN npm install

# Copy the rest of the project (except .devcontainer)
COPY . .

# Build the Svelte application
RUN npm run build

# Specify the command to run the app
CMD ["npm", "run", "dev"]

# Expose the port on which the app runs
EXPOSE 3000

# Use the specified Node.js image as a base
FROM node:18 AS builder

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install git

# RUN apt install -y default-jdk
    
# Set the working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker caching
COPY package*.json .

# Install dependencies
RUN npm install

# Copy the rest of the project (except .devcontainer)
COPY . .

RUN git config --global --add safe.directory /workspaces/Natural-Highs

RUN npm install -g firebase-tools && apt install -y default-jdk && npm install firebase-admin

RUN npm i

# Build the Svelte application
#RUN npm run build

# Specify the command to run the app
CMD ["npm", "run", "dev"]

# Expose the port on which the app runs
EXPOSE 3000

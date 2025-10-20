# Bun-based development container
FROM oven/bun:1

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install git default-jdk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies early to leverage Docker layer caching
COPY package.json ./
RUN bun install

# Copy the remainder of the repo
COPY . .

RUN git config --global --add safe.directory /workspaces/Natural-Highs

# Ensure Firebase CLI is available inside the container
RUN bun install -g firebase-tools

CMD ["bun", "run", "dev"]

EXPOSE 5174

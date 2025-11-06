# Natural Highs Dev Container
# Fully self-contained environment - only requires VS Code and Docker

FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install Node.js LTS (needed for commitlint and some tools)
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest

# Install Bun (system-wide to /usr/local/bin)
RUN curl -fsSL https://bun.sh/install | bash && \
    cp /root/.bun/bin/bun /usr/local/bin/bun && \
    chmod +x /usr/local/bin/bun && \
    bun --version

# Install Firebase Tools globally (for emulator access)
RUN npm install -g firebase-tools@latest

# Install common development tools
RUN apt-get update && \
    apt-get install -y \
    zsh \
    git \
    curl \
    wget \
    ca-certificates \
    apt-transport-https \
    gnupg \
    lsb-release \
    build-essential \
    procps \
    lsof \
    && rm -rf /var/lib/apt/lists/*

# Install oh-my-zsh
RUN mkdir -p /home/vscode && \
    chown -R vscode:vscode /home/vscode && \
    su vscode -c 'sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended' || true

# Install mise 
RUN su vscode -c 'curl https://mise.run | bash' || true
    
# Install Doppler CLI (using official method from https://docs.doppler.com/docs/dockerfile)
RUN curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | tee /etc/apt/sources.list.d/doppler-cli.list && \
    apt-get update && \
    apt-get -y install doppler

# Set up Bun environment variables
ENV BUN_INSTALL=/usr/local
ENV PATH="/usr/local/bin:$PATH"

# Verify installations
RUN bun --version && \
    doppler --version && \
    node --version && \
    npm --version && \
    firebase --version

# Create workspace directory
WORKDIR /workspace

# Set up git (will be overridden by devcontainer user setup)
RUN git config --global --add safe.directory /workspace

# Download and set up .zshrc from Gist
RUN curl -sLf --retry 3 --tlsv1.2 --proto "=https" \
    "https://gist.githubusercontent.com/wistb/879ddbec01b9c6ebaa04bc1fd1630ad8/raw/0b73e3e3f335ab0229b6d993ab45f8de79bf4560/.zshrc" \
    -o /tmp/.zshrc && \
    chmod 644 /tmp/.zshrc

# Clean up
RUN apt-get autoremove -y && \
    apt-get clean -y


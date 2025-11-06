#!/bin/bash
# Post-creation script for devcontainer
# Runs automatically after container creation

set -e

echo "Setting up Natural Highs development environment..."
echo ""

# Set up .zshrc from Gist
if [ -f /tmp/.zshrc ]; then
    echo "Setting up .zshrc from Gist..."
    cp /tmp/.zshrc ~/.zshrc
    chmod 644 ~/.zshrc
    echo ".zshrc configured"
    echo ""
fi

echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Warning: package.json not found. Make sure you're in the project root."
    exit 1
fi

echo "Step 1/4: Installing dependencies..."
bun install --no-progress
echo "Dependencies installed"
echo ""

echo "Step 2/4: Verifying installations..."
echo "Bun: $(bun --version)"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Doppler: $(doppler --version)"
echo "Firebase Tools: $(firebase --version)"
echo "All tools verified"
echo ""

echo "Step 3/4: Running initial format check..."
if bun run format:check > /dev/null 2>&1; then
    echo "Code is formatted"
else
    echo "Code needs formatting. Run 'bun run format' to fix."
fi
echo ""

echo "Step 4/4: Checking Doppler setup..."
if doppler secrets --only-names &> /dev/null; then
    echo "Doppler is already configured"
    echo "Doppler secrets:"
    doppler configs
    doppler secrets --only-names

    if doppler configure get project &> /dev/null; then
        echo "  Project: $(doppler configure get project --plain 2>/dev/null || echo 'auto-selected')"
    fi
    if doppler configure get config &> /dev/null; then
        echo "  Config: $(doppler configure get config --plain 2>/dev/null || echo 'auto-selected')"
    fi
elif [ -n "$DOPPLER_TOKEN" ]; then
    echo "Doppler token found - configuring automatically..."
    if doppler setup -t "$DOPPLER_TOKEN" --no-interactive &> /dev/null && doppler secrets --only-names &> /dev/null; then
        echo "Doppler configured successfully"
    else
        echo "Doppler token found but configuration failed"
        echo "Please verify the token is correct"
    fi
elif [ -f ".doppler.token" ]; then
    echo "Doppler token file found - configuring automatically..."
    TOKEN=$(cat .doppler.token)
    if doppler setup -t "$TOKEN" --no-interactive &> /dev/null && doppler secrets --only-names &> /dev/null; then
        echo "Doppler configured successfully"
    else
        echo "Doppler token file found but configuration failed"
        echo "Please verify the token is correct"
    fi
else
    echo "Attempting automatic Doppler setup from team Gist..."
    if bun run setup &> /dev/null && doppler secrets --only-names &> /dev/null; then
        echo "Doppler configured automatically from team Gist"

        echo "Doppler secrets:"
        doppler configs
        doppler secrets --only-names
    else
        echo "Doppler not configured automatically"
        echo ""
        echo "To set up Doppler (required for development):"
        echo "  Run: bun run setup"
        echo "  The setup script will automatically try the team Gist"
    fi
fi
echo ""

echo "Setup complete"
echo ""
echo "Quick Start:"
echo "  1. If Doppler not configured: Run 'bun run setup' (automatically uses team Gist)"
echo "  2. Start development:"
echo "     - Use task 'Start Full Dev Environment' (Ctrl+Shift+P → Tasks: Run Task)"
echo "     - OR manually: bun run dev:full"
echo ""
echo "URLs (auto-forwarded in VS Code):"
echo "  - Frontend: http://localhost:5174"
echo "  - Backend: http://localhost:3000"
echo "  - Firebase UI: http://localhost:4000"
echo ""
echo "Available Tasks (Ctrl+Shift+P → Tasks: Run Task):"
echo "  - Start Full Dev Environment"
echo "  - Lint & Format"
echo "  - Type Check"
echo "  - Run Tests"
echo "  - Setup Doppler"
echo "  - Check Setup"
echo ""
echo "Documentation: See docs/RUNBOOK.md"
echo ""


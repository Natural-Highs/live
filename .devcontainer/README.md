# Natural Highs Dev Container

## Requirements

1. **VS Code** (with Dev Containers extension)
2. **Docker Desktop** (Mac/Windows) or **Docker Engine** (Linux/WSL)

## First Time Setup

1. **Install VS Code Dev Containers extension**

   - https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers

2. **Install Docker**

   - **macOS/Windows**: Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
     - [WSL](https://docs.docker.com/desktop/features/wsl/)
   - Verify: `docker --version` in terminal

3. **Open project in VS Code container**
   - Open command menu with `F1` / `Ctrl+Shift+P` (or `CMD+Shift+P` on mac)
   - Type: "Dev Containers: Reopen in Container"

## After Container Starts

### 0. Setup Doppler (Automatic)

Doppler is automatically configured during container creation using the team Gist. No manual setup needed.

If automatic setup fails, you can run:

```bash
bun run setup
```

The setup script will automatically fetch the token from the team Gist - no manual token entry required unless it fails.

### 1. Start Development

**Option 1: Use VS Code task (recommended)**

- Press `F1` → "Tasks: Run Task" → "Start Full Dev Environment"

**Option 2: Manual commands**

```bash
# Single command (all services)
bun dev:full

# OR separate terminals:
bun emulators  # Terminal 1
bun server     # Terminal 2
bun dev        # Terminal 3
```

## What's Included

### Tools (Pre-installed)

- **Bun** - Runtime and package manager
- **Node.js LTS** - For firebase and some tools
- **Doppler CLI** - Secrets management
- **Firebase Tools** - Firebase emulators
- **zsh** - Default shell with oh-my-zsh
- **Biome** - Linting and formatting (via npm)

### VS Code Extensions (Auto-installed)

- Biome - Code formatting and linting
- Bun - Bun language support
- Playwright - E2E testing
- Tailwind CSS - IntelliSense
- TypeScript - Enhanced TypeScript support

### VS Code Tasks

Access via `F1` → "Tasks: Run Task":

- **Start Full Dev Environment** - Starts all services
- **Kill Ports** - Free development ports (3000, 4000, 5174, 8080, 9099)
- **Start Firebase Emulators** - Firebase emulator suite
- **Type Check** - TypeScript validation
- **Lint & Format** - Biome check and fix
- **Run Tests** - All tests
- **Run Unit Tests** - Vitest only
- **Run Integration Tests** - Playwright only
- **Setup Doppler** - Configure Doppler CLI
- **Check Setup** - Verify all services are running
- **Install Dependencies** - Run `bun install`

## Ports

Automatically forwarded by VS Code:

- **5174** - Frontend dev server
- **3000** - Backend API
- **4000** - Firebase Emulator UI
- **8080** - Firestore emulator
- **9099** - Firebase Auth emulator

## Configuration Files

- `.devcontainer/devcontainer.json` - Dev container configuration
- `.devcontainer/Dockerfile` - Container image definition
- `.devcontainer/postCreateCommand.sh` - Post-creation setup script

## Troubleshooting

### Container won't start

- Verify Docker is running: `docker ps`
- Check Docker Desktop is started (Mac/Windows)
- Try rebuilding: `F1` → "Dev Containers: Rebuild Container"

### Doppler not working

- Run setup again: `bun run setup` (automatically uses team Gist)
- Check configuration: `doppler configs`
- Verify: `doppler secrets --only-names` (should list secrets)

### Ports already in use

- Run task: `F1` → "Tasks: Run Task" → "Kill Ports" to free all development ports
- Or manually stop services using ports (3000, 5174, etc.)
- Or change ports in `devcontainer.json` and `package.json`

### Slow first build

- Normal: ~3-5 minutes first time
- Subsequent opens: ~10-30 seconds
- Uses Docker layer caching

## Update Container

To rebuild with latest changes:

- `F1` → "Dev Containers: Rebuild Container"

## Manual Commands

```bash
# Install dependencies
bun install

# Type check
bun run check

# Format code
bun run format

# Lint and format
bun run check:biome:fix

# Run tests
bun run test

# Check setup status
bash scripts/check-setup.sh
```

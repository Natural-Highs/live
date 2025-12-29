# Initialize

## Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Bun | 1.0+ | [bun.sh](https://bun.sh) |
| Node.js | 20+ | Required for some dependencies |
| Doppler CLI | Latest | [doppler.com/docs/cli](https://docs.doppler.com/docs/install-cli) |

Optional but recommended:
- [Firebase CLI](https://firebase.google.com/docs/cli) - For emulators
- Biome extension for your editor

## Setup Steps

### 1. Clone and Install

```bash
git clone https://github.com/your-org/natural-highs.git
cd natural-highs
bun install
```

### 2. Configure Secrets

Natural-Highs uses [Doppler](https://doppler.com) for secrets management.

```bash
# Login to Doppler (one-time)
doppler login

# Configure project access
bun run setup
```

This links your local environment to the Doppler project.
Secrets are injected at runtime - never stored in files.

### 3. Start Development Server

```bash
bun run dev
```

The app runs at `http://localhost:3000`.

## Development Modes

### Full Mode (with secrets)

```bash
bun run dev
```

Uses Doppler to inject all environment variables. Required for:
- Firebase Auth
- Firestore access
- Session management

### Bare Mode (without secrets)

```bash
bun run dev:bare
```

Runs without Doppler. Use with Firebase emulators for offline development.

### With Emulators

```bash
# Terminal 1: Start emulators
bun run emulators

# Terminal 2: Start dev server (bare mode)
bun run dev:bare
```

Emulators provide local Firebase Auth and Firestore without cloud access.

## Verify Setup

After starting the dev server:

1. Open `http://localhost:3000`
2. You should see the login page
3. Check the terminal for any errors

### Common Issues

`SESSION_SECRET not found`
- Run `bun run setup` to configure Doppler
- Or use `bun run dev:bare` with emulators

`Firebase config missing`
- Ensure Doppler is configured
- Check that `VITE_*` variables are set

`Port 3000 in use`
- Stop other processes on port 3000
- Or modify `vite.config.ts` to use a different port

## Project Scripts

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start dev server with secrets |
| `bun run dev:bare` | Start without secrets |
| `bun run emulators` | Start Firebase emulators |
| `bun run build` | Production build |
| `bun run lint` | Check code quality |
| `bun run test` | Run unit tests (watch) |
| `bun run test:ci` | Run unit tests (single run) |
| `bun run test:e2e` | Run E2E tests (UI mode) |
| `bun run validate` | Full validation (lint + tests) |

## IDE Setup

### VS Code

Recommended extensions:
- **Biome** - Linting and formatting
- **Tailwind CSS IntelliSense** - CSS autocomplete
- **ES7+ React Snippets** - Component snippets

Settings (`.vscode/settings.json`):
```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

### Other Editors

Use Biome CLI for formatting:
```bash
bun run format
```

_Previous: [Overview](00-overview) | Next: [Architecture](02-architecture)_

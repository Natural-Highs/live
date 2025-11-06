# Natural Highs

## Prerequisites

- VS Code
- Docker Desktop (Mac/Windows) or Docker Engine (Linux/WSL)

## Setup (VS Code Dev Container)

1.  Open VS Code
2.  Open command palette (F1 / Ctrl|Cmd+Shift+P)
3.  Type "Dev Containers: Reopen in Container"
4.  Wait for container to start (first build can take ~3-5 minutes)
5.  Run `bun dev:full` to start all services or use tasks in VS Code (F1)

## Setup (Manual)

1.  Clone repository
2.  Install dependencies: `bun install`
3.  Setup Doppler: `bun run setup`

    The setup script automatically fetches the doppler service token. No manual configuration needed.

    **Optional**: You can override the automatic setup by:

    - Setting environment variable: `export DOPPLER_TOKEN='dp.st.dev.xxxx'`
    - Creating a local file: `.doppler.token` with the token
    - Using a custom Gist via environment variables: `DOPPLER_GIST_ID`, `DOPPLER_GIST_USER`, `DOPPLER_GIST_FILE`

    **Note**: Only the service token (not secrets) is stored in the Gist. The token authenticates with Doppler, which then provides the actual secrets securely.

4.  Start development:

    ```bash
    # Terminal 1: Database
    bun emulators

    # Terminal 2: Backend
    bun server

    # Terminal 3: Frontend
    bun dev
    ```

    or use `bun dev:full` to start all services (database, backend, frontend).

    **Note**: Scripts like `bun run dev` will inject secrets from Doppler. You can view secrets with `doppler secrets` or `doppler tui`.

5.  Open: http://localhost:5174

## Docs

For detailed notes see [docs/RUNBOOK.md](docs/RUNBOOK.md):

- Project structure
- Common tasks (add pages, forms, routes, components)
- Testing guide
- Secrets management
- Troubleshooting
- Git workflow

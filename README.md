# Natural Highs

## Contributors

| Name           | Github         | Email                     |
| -------------- | -------------- | ------------------------- |
| Aidan Donnelly | AidanDonnelly1 | aido4381@colorado.edu     |
| Ishan Gohil    | IshanGProjects | ishan10.gohil@gmail.com   |
| Ari Guzzi      | ari-guzzi      | argu4451@colorado.edu     |
| Alex Savard    | asavy79        | alsa8624@colorado.edu     |
| Luke Wu        | lukewu1        | Luke.Wu@colorado.edu      |
| Eric David     | EricDavidd     | Eric.David@colorado.edu   |
| Alicia Zhang   | alzh42         | Alicia.Zhang@colorado.edu |

## Quick Start

### Prerequisites

- Bun: https://bun.sh
  - Linux/WSL/MacOS: `curl -fsSL https://bun.sh/install | bash`
  - Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`
- Doppler CLI: https://docs.doppler.com/docs/install-cli

### Setup

1.  Clone repository
2.  Install dependencies: `bun install`
3.  Setup Doppler: `bun run setup` (requires shared service token from team)
4.  Start development:

    ```bash
    # Terminal 1: Database
    doppler run -- bun run emulators

    # Terminal 2: Backend
    doppler run -- bun run server

    # Terminal 3: Frontend
    doppler run -- bun run dev
    ```

    or use `bun run dev:full` to start all services (database, backend, frontend).

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

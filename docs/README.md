# Natural Highs

[![Netlify Status](https://api.netlify.com/api/v1/badges/249379ce-fd70-454b-9988-b45769ebcb8c/deploy-status)](https://app.netlify.com/sites/naturalhighs/deploys)
[![Tests](https://github.com/Natural-Highs/live/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/Natural-Highs/live/actions/workflows/pr-checks.yml)
[![codecov](https://codecov.io/gh/Natural-Highs/live/branch/main/graph/badge.svg)](https://codecov.io/gh/Natural-Highs/live)

## Quick Start

```bash
bun install
bun run setup          # Configure Doppler secrets
bun run dev            # Start development server
```

## Documentation Map

```mermaid
flowchart TD
    subgraph START["Getting Started"]
        INIT[01-initialize]
    end

    subgraph CORE["Core Design"]
        ARCH[02-architecture]
        AUTH[03-authentication]
        DATA[04-data-layer]
    end

    subgraph PATTERNS["Development Patterns"]
        ROUTE[05-routing]
        SERVER[06-server-functions]
        COMP[07-components]
    end

    subgraph OPERATIONS["Development Operations"]
        TEST[08-testing]
        DEPLOY[09-deployment]
        SEC[10-security]
    end

    INIT --> ARCH
    ARCH --> AUTH
    ARCH --> DATA
    AUTH --> ROUTE
    DATA --> SERVER
    ROUTE --> COMP
    SERVER --> COMP
    COMP --> TEST
    TEST --> DEPLOY
    DEPLOY --> SEC

    click INIT "01-initialize"
    click ARCH "02-architecture"
    click AUTH "03-authentication"
    click DATA "04-data-layer"
    click ROUTE "05-routing"
    click SERVER "06-server-functions"
    click COMP "07-components"
    click TEST "08-testing"
    click DEPLOY "09-deployment"
    click SEC "10-security"
```

## Document Index

| Doc | Title | Audience | Purpose |
|-----|-------|----------|---------|
| [01](01-initialize) | Initialize | All | Clone, setup, run locally |
| [02](02-architecture) | Architecture | All | System overview, tech stack |
| [03](03-authentication) | Authentication | Backend | Auth flows, sessions, passkeys |
| [04](04-data-layer) | Data Layer | Backend | Firebase, Firestore patterns |
| [05](05-routing) | Routing | Frontend | File-based routes, guards |
| [06](06-server-functions) | Server Functions | Backend | RPC patterns, middleware |
| [07](07-components) | Components | Frontend | UI organization, patterns |
| [08](08-testing) | Testing | All | Vitest, Playwright setup |
| [09](09-deployment) | Deployment | DevOps | CI/CD, Netlify, Doppler |
| [10](10-security) | Security | All | Threat model, mitigations |

## Reading Paths

**New contributor:**
1. [Initialize](01-initialize) - Get running locally
2. [Architecture](02-architecture) - Understand the system

**Frontend:**
1. Initialize → Architecture → [Routing](05-routing) → [Components](07-components)

**Backend:**
1. Initialize → Architecture → [Authentication](03-authentication) → [Data Layer](04-data-layer) → [Server Functions](06-server-functions)

**DevOps:**
1. Initialize → [Deployment](09-deployment) → [Security](10-security)

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (React 19) |
| Routing | TanStack Router (file-based) |
| State | TanStack Query |
| Forms | TanStack Form + Zod |
| Backend | Firebase (Auth + Firestore) |
| Hosting | Netlify |
| Secrets | Doppler |
| Testing | Vitest + Playwright |

## Commands Reference

```bash
# Setup
bun install
bun run setup          # Configure Doppler

# Development
bun run dev            # Start with secrets
bun run emulators      # Firebase emulators

# Quality
bun run lint           # Check code
bun run test           # Unit tests (watch)
bun run test:e2e       # E2E tests (UI)

# Build
bun run build          # Production build
```

## Project Structure

```text
src/
├── routes/            # File-based routing
├── components/        # React components
│   ├── ui/           # Primitives (shadcn)
│   ├── forms/        # Form components
│   └── auth/         # Auth UI
├── server/
│   ├── functions/    # Server functions (RPC)
│   ├── middleware/   # Auth guards
│   └── schemas/      # Zod validation
├── lib/
│   ├── firebase/     # Firebase clients
│   ├── session.ts    # Session management
│   └── queries/      # TanStack Query
└── context/          # React contexts
```

## Visual Overview

For system architecture diagrams and visual references, see the [Visual Overview](00-overview).

---

_Next: [Initialize](01-initialize)_

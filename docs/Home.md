# Natural Highs

[![Netlify Status](https://api.netlify.com/api/v1/badges/249379ce-fd70-454b-9988-b45769ebcb8c/deploy-status)](https://app.netlify.com/sites/naturalhighs/deploys)
[![Tests](https://github.com/Natural-Highs/live/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/Natural-Highs/live/actions/workflows/pr-checks.yml)
[![codecov](https://codecov.io/gh/Natural-Highs/live/branch/main/graph/badge.svg)](https://codecov.io/gh/Natural-Highs/live)

> **TL;DR**: `bun install && bun run setup && bun run dev` to start. See [Initialize](01-initialize) for full setup.

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

    style INIT fill:#22c55e,stroke:#16a34a,color:#fff
    style ARCH fill:#3b82f6,stroke:#2563eb,color:#fff
    style AUTH fill:#3b82f6,stroke:#2563eb,color:#fff
    style DATA fill:#3b82f6,stroke:#2563eb,color:#fff
    style ROUTE fill:#a855f7,stroke:#9333ea,color:#fff
    style SERVER fill:#a855f7,stroke:#9333ea,color:#fff
    style COMP fill:#a855f7,stroke:#9333ea,color:#fff
    style TEST fill:#f97316,stroke:#ea580c,color:#fff
    style DEPLOY fill:#f97316,stroke:#ea580c,color:#fff
    style SEC fill:#f97316,stroke:#ea580c,color:#fff
```

## Documents

| # | Document | Summary |
|---|----------|---------|
| 00 | [Visual Overview](00-overview) | Architecture diagrams |
| 01 | [Initialize](01-initialize) | Setup, commands, structure |
| 02 | [Architecture](02-architecture) | System design, tech stack |
| 03 | [Authentication](03-authentication) | Auth flows, sessions, passkeys |
| 04 | [Data Layer](04-data-layer) | Firebase, Firestore patterns |
| 05 | [Routing](05-routing) | File-based routes, guards |
| 06 | [Server Functions](06-server-functions) | RPC patterns, middleware |
| 07 | [Components](07-components) | UI organization, patterns |
| 08 | [Testing](08-testing) | Vitest, Playwright |
| 09 | [Deployment](09-deployment) | CI/CD, Netlify, Doppler |
| 10 | [Security](10-security) | Threat model, mitigations |

## Reading Paths

| Role | Path |
|------|------|
| New contributor | [Initialize](01-initialize) → [Architecture](02-architecture) |
| Frontend | Initialize → Architecture → [Routing](05-routing) → [Components](07-components) |
| Backend | Initialize → Architecture → [Authentication](03-authentication) → [Data Layer](04-data-layer) → [Server Functions](06-server-functions) |
| DevOps | Initialize → Architecture → [Deployment](09-deployment) → [Security](10-security) |

## Stack

**Framework**: TanStack Start (React 19) with file-based routing and server functions
**Backend**: Firebase Auth + Firestore
**Infrastructure**: Netlify (hosting) + Doppler (secrets)
**Testing**: Vitest (unit) + Playwright (E2E)

---

_Next: [Initialize](01-initialize)_

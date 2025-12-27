# Architecture

System overview of Natural-Highs

## System Diagram

```mermaid
flowchart TB
    subgraph CLIENT["Browser"]
        UI[React Components]
        ROUTER[TanStack Router]
        QUERY[TanStack Query]
        FORM[TanStack Form]
    end

    subgraph SERVER["Server Runtime"]
        SSR[SSR Engine]
        SF[Server Functions]
        MW[Middleware]
        SESSION[Session Manager]
    end

    subgraph EXTERNAL["External Services"]
        FB_AUTH[Firebase Auth]
        FIRESTORE[Firestore]
        DOPPLER[Doppler Secrets]
    end

    subgraph INFRA["Infrastructure"]
        NETLIFY[Netlify Edge]
    end

    UI --> ROUTER
    UI --> QUERY
    UI --> FORM
    ROUTER --> SSR
    QUERY --> SF
    FORM --> SF
    SF --> MW
    MW --> SESSION
    SF --> FB_AUTH
    SF --> FIRESTORE
    SESSION --> FIRESTORE
    NETLIFY --> SSR
    DOPPLER -.-> SERVER

    style UI fill:#3b82f6,stroke:#2563eb,color:#fff
    style ROUTER fill:#3b82f6,stroke:#2563eb,color:#fff
    style QUERY fill:#3b82f6,stroke:#2563eb,color:#fff
    style FORM fill:#3b82f6,stroke:#2563eb,color:#fff
    style SSR fill:#a855f7,stroke:#9333ea,color:#fff
    style SF fill:#a855f7,stroke:#9333ea,color:#fff
    style MW fill:#a855f7,stroke:#9333ea,color:#fff
    style SESSION fill:#a855f7,stroke:#9333ea,color:#fff
    style FB_AUTH fill:#f97316,stroke:#ea580c,color:#fff
    style FIRESTORE fill:#f97316,stroke:#ea580c,color:#fff
    style DOPPLER fill:#f97316,stroke:#ea580c,color:#fff
    style NETLIFY fill:#22c55e,stroke:#16a34a,color:#fff
```

## Tech Stack

### Core Framework

| Package | Purpose |
|---------|---------|
| TanStack Start | Full-stack React framework with SSR |
| React 19 | UI library with concurrent features |
| TypeScript | Type-safe JavaScript |
| Vite | Build tool and dev server |

### TanStack Ecosystem

| Package | Purpose |
|---------|---------|
| TanStack Router | File-based routing with type safety |
| TanStack Query | Server state management and caching |
| TanStack Form | Form state with validation |
| TanStack Table | Data tables with virtualization |

### Backend

| Service | Purpose |
|---------|---------|
| Firebase Auth | User authentication |
| Firestore | NoSQL database |
| Doppler | Secrets management |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Netlify | Hosting and edge functions |
| GitHub Actions | CI/CD pipeline |

## Request Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Netlify Edge
    participant S as Server Function
    participant M as Middleware
    participant F as Firestore

    B->>N: HTTP Request
    N->>S: Route to handler
    S->>M: requireAuth()
    M->>M: Validate session
    M-->>S: User context
    S->>F: Database query
    F-->>S: Data
    S-->>N: Response
    N-->>B: HTML/JSON
```

## Project Structure

```text
src/
├── routes/                 # File-based routing
│   ├── __root.tsx         # Root layout, providers
│   ├── _authed.tsx        # Protected route layout
│   ├── _authed/_admin/    # Admin routes
│   ├── index.tsx          # Home page
│   └── authentication.tsx # Login page
│
├── components/
│   ├── ui/                # Primitives (Button, Card, etc.)
│   ├── forms/             # Form components
│   ├── auth/              # Auth UI (PasskeySignIn, etc.)
│   ├── admin/             # Admin components
│   ├── session/           # Session UI
│   └── Layout.tsx         # Main layout
│
├── server/
│   ├── functions/         # Server functions (RPC)
│   │   ├── auth.ts       # Session management
│   │   ├── passkeys.ts   # WebAuthn
│   │   ├── profile.ts    # User profiles
│   │   └── utils/        # Error classes
│   ├── middleware/        # Auth guards
│   └── schemas/           # Zod validation
│
├── lib/
│   ├── firebase/          # Firebase clients
│   │   ├── firebase.ts   # Client SDK
│   │   └── firebase.admin.ts # Admin SDK
│   ├── session.ts         # Session helpers
│   ├── auth/              # Auth utilities
│   └── queries/           # Query options
│
├── context/
│   └── AuthContext.tsx    # Client auth state
│
└── types/                 # TypeScript types
```

## Key Patterns

### Server Functions

All backend logic runs in server functions - never in components.

```typescript
// src/server/functions/example.ts
export const getData = createServerFn({method: 'GET'})
  .handler(async () => {
    const user = await requireAuth()
    return db.collection('data').get()
  })
```

Components call server functions like regular async functions:

```typescript
// src/routes/page.tsx
const data = await getData()
```

### State Ownership

| State Type | Owner | Access |
|------------|-------|--------|
| Server data | TanStack Query | `useQuery()` |
| Form state | TanStack Form | `useForm()` |
| Auth state | AuthContext | `useAuth()` |
| UI state | React useState | Local only |

### Route Guards

Protected routes use `beforeLoad` to check authentication:

```typescript
// src/routes/_authed.tsx
export const Route = createFileRoute('/_authed')({
  beforeLoad: ({context}) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({to: '/authentication'})
    }
  }
})
```

## Environment Architecture

```mermaid
flowchart LR
    subgraph DEV["Development"]
        D_APP[localhost:3000]
        D_EMU[Firebase Emulators]
        D_DOP[Doppler Dev Config]
    end

    subgraph STG["Staging"]
        S_APP[staging.netlify.app]
        S_FB[Firebase Staging]
        S_DOP[Doppler Stg Config]
    end

    subgraph PRD["Production"]
        P_APP[naturalhighs.app]
        P_FB[Firebase Production]
        P_DOP[Doppler Prd Config]
    end

    D_DOP --> D_APP
    D_APP --> D_EMU

    S_DOP --> S_APP
    S_APP --> S_FB

    P_DOP --> P_APP
    P_APP --> P_FB

    style D_APP fill:#3b82f6,stroke:#2563eb,color:#fff
    style D_EMU fill:#a855f7,stroke:#9333ea,color:#fff
    style D_DOP fill:#a855f7,stroke:#9333ea,color:#fff
    style S_APP fill:#3b82f6,stroke:#2563eb,color:#fff
    style S_FB fill:#f97316,stroke:#ea580c,color:#fff
    style S_DOP fill:#a855f7,stroke:#9333ea,color:#fff
    style P_APP fill:#22c55e,stroke:#16a34a,color:#fff
    style P_FB fill:#f97316,stroke:#ea580c,color:#fff
    style P_DOP fill:#a855f7,stroke:#9333ea,color:#fff
```

## Data Flow Layers

```text
┌─────────────────────────────────────────────────────────┐
│                    UI Layer                             │
│  Components → TanStack Form → TanStack Query            │
├─────────────────────────────────────────────────────────┤
│                  Transport Layer                        │
│  Server Functions (RPC) → HTTP                          │
├─────────────────────────────────────────────────────────┤
│                 Validation Layer                        │
│  Zod Schemas → Type Guards                              │
├─────────────────────────────────────────────────────────┤
│                   Auth Layer                            │
│  Middleware → Session → Firebase Auth                   │
├─────────────────────────────────────────────────────────┤
│                   Data Layer                            │
│  Firestore → Firebase Admin SDK                         │
└─────────────────────────────────────────────────────────┘
```

## Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Build configuration |
| `tsconfig.json` | TypeScript settings |
| `biome.json` | Linting and formatting |
| `playwright.config.ts` | E2E test configuration |
| `vitest.config.ts` | Unit test configuration |
| `firebase.json` | Emulator configuration |
| `netlify.toml` | Deployment settings |

---

_Previous: [Getting Started](01-initialize) | Next: [Authentication](03-authentication)_

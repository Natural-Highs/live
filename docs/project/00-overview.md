# System Visual Overview

## System Architecture

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

Client layer (React/TanStack), Server layer (SSR/Functions), External services (Firebase), Infrastructure (Netlify)

## Layer Dependencies

```mermaid
flowchart BT
    TYPES["src/types/"] --> LIB["src/lib/, hooks/, queries/"]
    LIB --> SERVER["src/server/, context/"]
    SERVER --> COMP["src/components/"]
    COMP --> ROUTES["src/routes/"]

    style TYPES fill:#22c55e,stroke:#16a34a,color:#fff
    style LIB fill:#3b82f6,stroke:#2563eb,color:#fff
    style SERVER fill:#a855f7,stroke:#9333ea,color:#fff
    style COMP fill:#3b82f6,stroke:#2563eb,color:#fff
    style ROUTES fill:#f97316,stroke:#ea580c,color:#fff
```

Import direction: types → lib/hooks → server/context → components → routes

## Authentication Flows

```mermaid
flowchart TD
    START["User visits authentication"] --> CHOICE{Auth Method}

    CHOICE -->|Magic Link| ML[Enter email]
    CHOICE -->|Passkey| PK[Select credential]
    CHOICE -->|Password| PW[Enter credentials]

    ML --> ML_SEND[Send link via email]
    ML_SEND --> ML_CLICK[User clicks link]
    ML_CLICK --> ML_VERIFY[Verify token]

    PK --> PK_CHALLENGE[Generate challenge]
    PK_CHALLENGE --> PK_SIGN[Sign with authenticator]
    PK_SIGN --> PK_VERIFY[Verify signature]

    PW --> PW_FB[Firebase Auth]
    PW_FB --> PW_TOKEN[Get ID token]

    ML_VERIFY --> SESSION[Create session]
    PK_VERIFY --> SESSION
    PW_TOKEN --> SESSION

    SESSION --> REDIRECT{Has profile?}
    REDIRECT -->|No| PROFILE["profile-setup"]
    REDIRECT -->|Yes| DASHBOARD["dashboard"]

    style START fill:#22c55e,stroke:#16a34a,color:#fff
    style ML fill:#3b82f6,stroke:#2563eb,color:#fff
    style PK fill:#3b82f6,stroke:#2563eb,color:#fff
    style PW fill:#3b82f6,stroke:#2563eb,color:#fff
    style ML_SEND fill:#3b82f6,stroke:#2563eb,color:#fff
    style ML_CLICK fill:#3b82f6,stroke:#2563eb,color:#fff
    style ML_VERIFY fill:#a855f7,stroke:#9333ea,color:#fff
    style PK_CHALLENGE fill:#3b82f6,stroke:#2563eb,color:#fff
    style PK_SIGN fill:#3b82f6,stroke:#2563eb,color:#fff
    style PK_VERIFY fill:#a855f7,stroke:#9333ea,color:#fff
    style PW_FB fill:#3b82f6,stroke:#2563eb,color:#fff
    style PW_TOKEN fill:#a855f7,stroke:#9333ea,color:#fff
    style SESSION fill:#a855f7,stroke:#9333ea,color:#fff
    style PROFILE fill:#f97316,stroke:#ea580c,color:#fff
    style DASHBOARD fill:#f97316,stroke:#ea580c,color:#fff
```

Magic link and passkey authentication sequences with session lifecycle

## Data Model

```mermaid
erDiagram
    USERS ||--o{ PASSKEYS : has
    USERS ||--o{ PRIVATE : has
    USERS ||--o{ USER_EVENTS : registers
    EVENTS ||--o{ USER_EVENTS : contains
    SURVEYS ||--o{ SURVEY_RESPONSES : has

    USERS {
        string displayName
        string email
        date dateOfBirth
        boolean isAdmin
        timestamp createdAt
    }

    PASSKEYS {
        string credentialId
        bytes publicKeyBytes
        number signCount
    }

    PRIVATE {
        string age
        string gender
        string location
    }

    EVENTS {
        string title
        string description
        date date
        boolean isActive
    }

    SURVEYS {
        string title
        array questions
    }

    SURVEY_RESPONSES {
        string surveyId
        string userId
        object responses
    }
```

Firestore collections and relationships: users, events, surveys, and responses

## Request Lifecycle

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

HTTP request through Netlify Edge to server function to Firestore

## CI/CD Pipeline

```mermaid
flowchart LR
    subgraph CI["GitHub Actions"]
        LINT[Trunk Check] --> UNIT[Vitest]
        UNIT --> E2E[Playwright]
        E2E --> BUILD[Build]
        BUILD --> COV[Codecov]
    end

    subgraph DEPLOY["Deployment"]
        BUILD --> NETLIFY[Netlify]
        DOPPLER[Doppler] -.-> NETLIFY
    end

    subgraph ENVS["Environments"]
        NETLIFY --> DEV[Preview]
        NETLIFY --> STG[Staging]
        NETLIFY --> PRD[Production]
    end

    style LINT fill:#3b82f6,stroke:#2563eb,color:#fff
    style UNIT fill:#3b82f6,stroke:#2563eb,color:#fff
    style E2E fill:#3b82f6,stroke:#2563eb,color:#fff
    style BUILD fill:#a855f7,stroke:#9333ea,color:#fff
    style COV fill:#a855f7,stroke:#9333ea,color:#fff
    style NETLIFY fill:#f97316,stroke:#ea580c,color:#fff
    style DOPPLER fill:#a855f7,stroke:#9333ea,color:#fff
    style DEV fill:#22c55e,stroke:#16a34a,color:#fff
    style STG fill:#22c55e,stroke:#16a34a,color:#fff
    style PRD fill:#22c55e,stroke:#16a34a,color:#fff
```

GitHub Actions workflow: Trunk Check → Tests → Build → Deploy

---

_For detailed documentation, see [Dev Notes](01-initialize)_

_For project overview and reading paths, see [Home](Home)_

# Authentication

Natural-Highs supports three authentication methods: Magic Link, Passkey (WebAuthn), and Email/Password.

## Authentication Flow Overview

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
```

## Session Management

Sessions use HTTP-only cookies managed by TanStack Start's `useSession()`.

### Session Data Structure

```typescript
type SessionData = {
  userId?: string
  email?: string
  displayName?: string
  claims?: {
    admin?: boolean
    signedConsentForm?: boolean
    passkeyEnabled?: boolean
    profileComplete?: boolean
    isMinor?: boolean
  }
  env?: 'development' | 'staging' | 'production'
  sessionCreatedAt?: string
}
```

### Session Functions

Located in `src/lib/session.ts`:

| Function | Purpose |
|----------|---------|
| `useAppSession()` | Get current session (server-only) |
| `getSessionData()` | Read session without encryption overhead |
| `updateSession(data)` | Partial session update |
| `clearSession()` | Logout - remove session |
| `createPasskeySession(data)` | Extended 180-day session |

### Session Security

| Feature | Purpose |
|---------|---------|
| HTTP-only | Prevents JavaScript access (XSS protection) |
| Secure flag | HTTPS-only in production |
| SameSite=lax | CSRF protection |
| Environment binding | Prevents cross-env replay |
| Creation timestamp | Enables revocation checks |

## Magic Link Authentication

Passwordless authentication via email.

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Server
    participant FB as Firebase

    U->>C: Enter email
    C->>S: requestMagicLink(email)
    S->>FB: sendSignInLinkToEmail()
    FB-->>U: Email with link
    U->>C: Click link
    C->>FB: signInWithEmailLink()
    FB-->>C: User credential
    C->>S: createSession(idToken)
    S-->>C: Set session cookie
    C->>U: Redirect to app
```

### Implementation

```typescript
// Client: Request link
import {sendSignInLinkToEmail} from 'firebase/auth'

await sendSignInLinkToEmail(auth, email, {
  url: `${window.location.origin}/magic-link`,
  handleCodeInApp: true
})

// Client: Complete sign-in (on /magic-link page)
import {signInWithEmailLink} from 'firebase/auth'

const result = await signInWithEmailLink(auth, email, window.location.href)
const idToken = await result.user.getIdToken()
await createSessionFn({data: {idToken}})
```

## Passkey (WebAuthn) Authentication

Phishing-resistant authentication using device authenticators.

### Registration Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Server
    participant DB as Firestore
    participant A as Authenticator

    U->>C: Click "Add Passkey"
    C->>S: generateRegistrationOptions()
    S->>DB: Store challenge
    S-->>C: Registration options
    C->>A: navigator.credentials.create()
    A->>U: Biometric/PIN prompt
    U->>A: Confirm
    A-->>C: Credential response
    C->>S: verifyPasskeyRegistration()
    S->>DB: Verify challenge
    S->>DB: Store credential
    S-->>C: Success
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Server
    participant DB as Firestore
    participant A as Authenticator

    U->>C: Click "Sign in with Passkey"
    C->>S: generateAuthenticationOptions()
    S->>DB: Store challenge
    S-->>C: Auth options
    C->>A: navigator.credentials.get()
    A->>U: Biometric/PIN prompt
    U->>A: Confirm
    A-->>C: Assertion response
    C->>S: verifyPasskeyAuthentication()
    S->>DB: Lookup credential
    S->>DB: Verify signature
    S->>S: Create 180-day session
    S-->>C: Success + session cookie
```

### Passkey Storage

```text
Firestore Collections:

users/{uid}/passkeys/{credentialId}
  - credentialId: string
  - publicKeyBytes: Uint8Array
  - signCount: number
  - transports: string[]
  - createdAt: Timestamp

passkeyCredentials/{credentialId}
  - userId: string
  (Index for O(1) lookup during auth)

passkeyChallenges/{challengeId}
  - challenge: string
  - type: 'registration' | 'authentication'
  - createdAt: Timestamp
  (TTL: 5 minutes)
```

## Auth Guards (Middleware)

Server functions use guard functions to validate authentication.

### Available Guards

```typescript
// Basic auth - validates session
const user = await requireAuth()

// Full validation - all security checks
const user = await requireAuthFull()

// Admin only - validates admin claim
const user = await requireAdmin()

// Consent required
const user = await requireConsent()
```

### Guard Validation Chain

```mermaid
flowchart TD
    REQ[Request] --> CHECK_SESSION{Session exists?}
    CHECK_SESSION -->|No| REJECT[401 Unauthorized]
    CHECK_SESSION -->|Yes| CHECK_ENV{Env matches?}
    CHECK_ENV -->|No| REJECT
    CHECK_ENV -->|Yes| CHECK_REVOKE{Session revoked?}
    CHECK_REVOKE -->|Yes| REJECT
    CHECK_REVOKE -->|No| CHECK_REFRESH{Needs refresh?}
    CHECK_REFRESH -->|Yes| REFRESH[Refresh session]
    CHECK_REFRESH -->|No| CONTINUE
    REFRESH --> CONTINUE[Return user context]
```

### Using Guards in Server Functions

```typescript
// src/server/functions/example.ts
import {requireAuth, requireAdmin} from '../middleware/auth'

// Any authenticated user
export const getUserData = createServerFn({method: 'GET'})
  .handler(async () => {
    const user = await requireAuth()
    return db.collection('users').doc(user.uid).get()
  })

// Admin only
export const getAllUsers = createServerFn({method: 'GET'})
  .handler(async () => {
    await requireAdmin()
    return db.collection('users').get()
  })
```

## Client-Side Auth Context

The `AuthContext` provides client-side auth state.

### Usage

```typescript
import {useAuth} from '@/context/AuthContext'

function MyComponent() {
  const {user, loading, admin, consentForm} = useAuth()

  if (loading) return <Spinner />
  if (!user) return <Redirect to="/authentication" />

  return <div>Welcome, {user.displayName}</div>
}
```

### Available Properties

| Property | Type | Description |
|----------|------|-------------|
| `user` | User \| null | Firebase user object |
| `loading` | boolean | Auth state loading |
| `admin` | boolean | Has admin claim |
| `consentForm` | boolean | Has signed consent |

## Session Revocation

Sessions can be invalidated server-side.

### Revocation Events

```typescript
// Store revocation event
await db.collection('sessionRevocations').add({
  userId: uid,
  revokedAt: FieldValue.serverTimestamp(),
  reason: 'passkey_removed' | 'credential_change' | 'admin_action'
})
```

### Automatic Revocation

Sessions are automatically invalidated when:
- User removes a passkey
- Admin force-logouts user
- Firebase `tokensValidAfterTime` changes
- Environment mismatch detected

## Custom Claims

Firebase custom claims control authorization.

### Available Claims

| Claim | Purpose |
|-------|---------|
| `admin` | Admin access |
| `signedConsentForm` | Completed consent |
| `passkeyEnabled` | Has registered passkey |
| `profileComplete` | Completed profile setup |
| `isMinor` | User is under 18 |

### Setting Claims (Server-only)

```typescript
import {adminAuth} from '$lib/firebase/firebase.admin'

await adminAuth.setCustomUserClaims(uid, {
  admin: true,
  profileComplete: true
})
```

---

_Previous: [Architecture](02-architecture) | Next: [Data Layer](04-data-layer)_

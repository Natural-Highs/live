# Runbook

Natural Highs dev notes.

## Prerequisites

- Bun: https://bun.sh
  - Install:
    - Linux/WSL/MacOS: `curl -fsSL https://bun.sh/install | bash`
    - Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`
- Doppler CLI:
  - Install: https://docs.doppler.com/docs/install-cli
  - Setup: Get shared service token, then run `bun run setup`

## Start Project

Three terminals:

```bash
# Terminal 1: Database (secrets from Doppler)
doppler run -- bun run emulators

# Terminal 2: Backend (secrets from Doppler)
doppler run -- bun run server

# Terminal 3: Frontend (secrets from Doppler)
doppler run -- bun run dev
```

or use `bun run dev:full` to start all services (database, backend, frontend).

**Note**: Scripts like `bun run dev` will inject secrets from Doppler. You can view secrets with `doppler secrets` or `doppler tui`.

Open: http://localhost:5174

## Project Structure

```
src/
├── components/    # Reusable UI pieces
│   ├── ui/        # DaisyUI wrapper components
│   ├── ProtectedRoute.tsx  # Route protection
│   └── AdminRoute.tsx      # Admin route protection
├── pages/         # URL routes (React pages)
├── server/        # Backend
│   ├── routes/    # API endpoints by feature
│   └── types/     # Type definitions
├── context/       # React contexts (AuthContext)
└── lib/           # Shared utilities
```

## Common Tasks

### Add Page

1. Create `src/pages/AboutPage.tsx`:

```tsx
import type React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div>
      <h1>About</h1>
    </div>
  );
};

export default AboutPage;
```

2. Add route in `src/App.tsx`:

```tsx
<Route path="/about" element={<AboutPage />} />
```

### Add Protected Route

```tsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

### Add Admin Route

```tsx
<Route
  path="/admin"
  element={
    <AdminRoute>
      <AdminPage />
    </AdminRoute>
  }
/>
```

### Add Form

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
});

const MyForm: React.FC = () => {
  const form = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form
      onSubmit={form.handleSubmit((data) => console.log(data))}
      className="bg-base-200 rounded-lg p-6 space-y-4"
    >
      <div className="form-control">
        <label htmlFor="email" className="label">
          <span className="label-text">Email</span>
        </label>
        <input
          id="email"
          type="email"
          className="input input-bordered"
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <div className="label">
            <span className="label-text-alt text-error">
              {form.formState.errors.email.message}
            </span>
          </div>
        )}
      </div>
      <button type="submit" className="btn btn-primary">
        Submit
      </button>
    </form>
  );
};
```

### Add API Route

1. Create `src/server/routes/myRoute.ts`:

```tsx
import { Hono } from 'hono';

const myRoute = new Hono();

myRoute.get('/hello', async (c) => {
  return c.json({ message: 'Hello' });
});

export default myRoute;
```

2. Register in `src/server/index.ts`:

```tsx
app.route('/api/my', myRoute);
```

### Add Component

```tsx
import type React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default Card;
```

## Validation

```bash
bun run check          # Type check
bun run check:biome    # Lint & format check
bun run format         # Auto-fix formatting
bun run test           # All tests (integration + unit)
bun run test:unit      # Unit tests (Vitest)
bun run test:integration  # Integration tests (Playwright)
```

## Secrets Management

Secrets are managed via Doppler and already configured in the project.

### One-Time Setup

Link your local Doppler CLI to the shared service token:

1. Get shared service token from team
2. Set it (choose one method):

```bash
# Option 1: Environment variable
export DOPPLER_TOKEN='dp.st.dev.xxxx'
bun run setup

# Option 2: Token file (recommended)
echo 'dp.st.dev.xxxx' > .doppler.token
bun run setup
```

The setup script will:

- Install Doppler CLI if needed
- Link your CLI to the project using the shared service token
- Project and config are already set in `.doppler.yaml`

### View Secrets

```bash
doppler secrets                    # List all (masked)
doppler secrets get KEY --plain    # Get specific secret
```

### Pre-Configured Secrets

All required secrets are already configured in the Doppler project:

- Firebase client configuration (VITE\_\*)
- Firebase service account
- Server configuration (PORT, etc.)

View with: `doppler secrets` or `doppler tui`

## Testing

### Unit Tests (Vitest)

```bash
bun run test:unit
```

Tests located in:

- `src/**/*.test.ts`
- `src/**/*.spec.ts`

### Integration/E2E Tests (Playwright)

```bash
bun run test:integration
```

Tests located in:

- `tests/integration/` - API tests
- `tests/ui/` - UI/E2E tests

### Run All Tests

```bash
bun run test
```

## Troubleshooting

### Doppler not configured

```bash
doppler setup
```

### Port in use

```bash
lsof -ti:3000 | xargs kill -9  # Backend
lsof -ti:5174 | xargs kill -9  # Frontend
lsof -ti:9099 | xargs kill -9  # Auth emulator
lsof -ti:8080 | xargs kill -9  # Firestore emulator
```

### Module not found

```bash
bun add package-name
```

### TypeScript errors

Include type assertions:

```tsx
// Bad
const data = await response.json();

// Good
interface ResponseData {
  message: string;
}
const data = (await response.json()) as ResponseData;
```

## Git Workflow

```bash
git status          # Check changes
git diff            # See what changed
git add .
bun commit          # Interactive commit
bun test            # Test before push
bun run check       # Type check
```

## Typical workflow

**Start:**

1. `git pull`
2. Start emulators (`doppler run -- bun run emulators`)
3. Start backend (`doppler run -- bun run server`)
4. Start frontend (`doppler run -- bun run dev`)

**While coding:**

1. Make changes
2. `bun run check`
3. `bun run format`
4. Test in browser

**End:**

1. `bun test`
2. `bun commit` (interactive conventional commit)
3. `git push` (if on branch)

## Tech Stack

- Bun: Runtime and package manager
- Vite: Frontend dev server and build tool
- Hono: Backend framework
- React: Frontend framework with React Router
- DaisyUI 5: UI component library (Tailwind CSS 4)
- Vitest: Unit testing framework
- Playwright: End-to-end testing
- TypeScript: Strict types, no `any`
- Biome: Linting and formatting
- Firebase: Authentication and database
- Doppler: Secrets management

## Reference Existing Code

- Components: `src/components/ui/` - see DaisyUI wrapper components
- Routes: `src/server/routes/` - see API patterns
- Types: `src/server/types/` - see data structures
- Pages: `src/pages/` - see page structure (AuthenticationPage, SignUpPage1, ConsentFormPage)
- Route Protection: `src/components/ProtectedRoute.tsx`, `src/components/AdminRoute.tsx`
- Tests: `src/*.test.ts`, `src/**/*.spec.ts` - see unit test patterns
- Integration Tests: `tests/integration/`, `tests/ui/` - see test patterns

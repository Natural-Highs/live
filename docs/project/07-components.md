# Components

> **TL;DR**: shadcn/ui primitives in `ui/`, feature components in domain folders. Use TanStack Query for server data, TanStack Form for forms.

## Directory Structure

```text
src/components/
├── ui/              # Primitives (shadcn/ui)
├── forms/           # Form components
├── auth/            # Authentication UI
├── admin/           # Admin components
├── session/         # Session management
├── features/        # Feature-specific
├── Layout.tsx       # Main layout
└── Navbar.tsx       # Navigation
```

## Component Pattern

```typescript
import {useAuth} from '@/context/AuthContext'
import {useQuery} from '@tanstack/react-query'

interface Props {
  title: string
  onSubmit: (data: FormData) => void
}

export function MyComponent({title, onSubmit}: Props) {
  // 1. Hooks first
  const {user} = useAuth()
  const query = useQuery(queryOptions())

  // 2. Early returns for loading/error
  if (query.isPending) return <Skeleton />
  if (query.isError) return <ErrorState error={query.error} />

  // 3. Main render
  return <div><h1>{title}</h1></div>
}
```

## UI Primitives

From [shadcn/ui](https://ui.shadcn.com) in `src/components/ui/`.

<details>
<summary>Button variants</summary>

```typescript
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

</details>

<details>
<summary>Card layout</summary>

```typescript
<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

</details>

<details>
<summary>Dialog</summary>

```typescript
<Dialog>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader><DialogTitle>Title</DialogTitle></DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

</details>

## Forms

Use TanStack Form with Zod validation:

```typescript
import {useForm} from '@tanstack/react-form'
import {zodValidator} from '@tanstack/zod-form-adapter'

const form = useForm({
  defaultValues: {name: '', email: ''},
  validatorAdapter: zodValidator(),
  onSubmit: async ({value}) => await saveProfile(value)
})
```

<details>
<summary>Full form example</summary>

```typescript
<form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
  <form.Field
    name="name"
    validators={{onChange: z.string().min(2)}}
    children={(field) => (
      <div>
        <Input
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
        />
        {field.state.meta.errors && (
          <span className="text-red-500">{field.state.meta.errors}</span>
        )}
      </div>
    )}
  />
  <Button type="submit" disabled={form.state.isSubmitting}>Submit</Button>
</form>
```

</details>

| Component | Purpose |
|-----------|---------|
| `ProfileForm` | Name + DOB setup |
| `ConsentForm` | Consent agreement |
| `SurveyRenderer` | Dynamic surveys |

## Auth Components

```typescript
<PasskeySignIn onSuccess={() => router.navigate({to: '/dashboard'})} />
<MagicLinkRequest onSent={(email) => setStep('sent')} />
```

## State Management

| State Type | Tool |
|------------|------|
| Server data | TanStack Query (`useQuery`) |
| Form state | TanStack Form (`useForm`) |
| Auth state | AuthContext (`useAuth`) |
| UI state | `useState` (local only) |

**Anti-pattern**: Don't use `useState` + `useEffect` for server data. Use `useQuery`.

## Styling

Tailwind CSS with `cn()` utility for conditional classes:

```typescript
import {cn} from '@/lib/utils'

<div className={cn('base-class', isActive && 'active-class')} />
```

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserCard.tsx` |
| Tests | `.test.tsx` | `UserCard.test.tsx` |
| Utilities | kebab-case | `format-date.ts` |

---

_Previous: [Server Functions](06-server-functions) | Next: [Testing](08-testing)_

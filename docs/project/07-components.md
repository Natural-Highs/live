# Components

React component organization and patterns.

## Directory Structure

```text
src/components/
├── ui/              # Primitives (shadcn/ui)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── ...
├── forms/           # Form components
│   ├── ProfileForm.tsx
│   ├── ConsentForm.tsx
│   └── SurveyRenderer.tsx
├── auth/            # Authentication UI
│   ├── MagicLinkRequest.tsx
│   ├── PasskeySignIn.tsx
│   └── PasskeySetup.tsx
├── admin/           # Admin components
│   ├── DataTable.tsx
│   └── VirtualDataTable.tsx
├── session/         # Session management
│   ├── GracePeriodBanner.tsx
│   └── SessionExpirationWarning.tsx
├── features/        # Feature-specific
│   ├── QRScanner.tsx
│   └── SuccessConfirmation.tsx
├── Layout.tsx       # Main layout
└── Navbar.tsx       # Navigation
```

## Component Pattern

```typescript
// Standard component structure
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
  return (
    <div>
      <h1>{title}</h1>
      {/* Content */}
    </div>
  )
}
```

## UI Primitives (shadcn/ui)

Base components from shadcn/ui. Located in `src/components/ui/`.

### Button

```typescript
import {Button} from '@/components/ui/button'

<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

### Card

```typescript
import {Card, CardHeader, CardTitle, CardContent} from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Form Inputs

```typescript
import {Input} from '@/components/ui/input'
import {Checkbox} from '@/components/ui/checkbox'

<Input type="email" placeholder="Email" />
<Checkbox checked={value} onCheckedChange={setValue} />
```

### Dialog

```typescript
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

## Form Components

### TanStack Form Pattern

```typescript
import {useForm} from '@tanstack/react-form'
import {zodValidator} from '@tanstack/zod-form-adapter'
import {z} from 'zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email()
})

export function ProfileForm({onSubmit}: Props) {
  const form = useForm({
    defaultValues: {name: '', email: ''},
    validatorAdapter: zodValidator(),
    onSubmit: async ({value}) => {
      await onSubmit(value)
    }
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field
        name="name"
        validators={{onChange: schema.shape.name}}
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
      <Button type="submit" disabled={form.state.isSubmitting}>
        Submit
      </Button>
    </form>
  )
}
```

### Form Component Examples

| Component | Purpose | Location |
|-----------|---------|----------|
| `ProfileForm` | Name + DOB setup | `forms/ProfileForm.tsx` |
| `ConsentForm` | Consent agreement | `forms/ConsentForm.tsx` |
| `ProfileSettingsForm` | Profile updates | `forms/ProfileSettingsForm.tsx` |
| `SurveyRenderer` | Dynamic surveys | `forms/SurveyRenderer.tsx` |

## Auth Components

### PasskeySignIn

```typescript
import {PasskeySignIn} from '@/components/auth'

<PasskeySignIn
  onSuccess={() => router.navigate({to: '/dashboard'})}
  onError={(err) => toast.error(err.message)}
/>
```

### MagicLinkRequest

```typescript
import {MagicLinkRequest} from '@/components/auth'

<MagicLinkRequest
  onSent={(email) => setStep('sent')}
/>
```

## Admin Components

### DataTable

Virtualized table for large datasets.

```typescript
import {DataTable} from '@/components/admin'
import {ColumnDef} from '@tanstack/react-table'

const columns: ColumnDef<User>[] = [
  {accessorKey: 'email', header: 'Email'},
  {accessorKey: 'displayName', header: 'Name'},
  {accessorKey: 'createdAt', header: 'Created'}
]

<DataTable
  columns={columns}
  data={users}
  onRowClick={(row) => navigate({to: '/users/$id', params: {id: row.id}})}
/>
```

### SmartDataTable

Auto-switches between regular and virtualized based on row count.

```typescript
import {SmartDataTable} from '@/components/admin'

<SmartDataTable
  columns={columns}
  data={data}  // Virtualizes if > 100 rows
/>
```

## Layout Components

### Layout

Main app layout with navbar and content area.

```typescript
// src/components/Layout.tsx
export function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
```

### Navbar

```typescript
// src/components/Navbar.tsx
export function Navbar() {
  const {user, admin} = useAuth()

  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      {admin && <Link to="/admin-dashboard">Admin</Link>}
      <SessionExpirationWarning />
    </nav>
  )
}
```

## State Management

| State Type | Tool | Example |
|------------|------|---------|
| Server data | TanStack Query | `useQuery()` |
| Form state | TanStack Form | `useForm()` |
| Auth state | AuthContext | `useAuth()` |
| UI state | useState | Local only |

### Anti-patterns

```typescript
// WRONG: useState for server data
const [users, setUsers] = useState([])
useEffect(() => {
  fetchUsers().then(setUsers)
}, [])

// CORRECT: TanStack Query
const {data: users} = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers
})
```

## Styling

Tailwind CSS with shadcn/ui conventions.

### Class Patterns

```typescript
// Conditional classes
<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' ? 'primary-class' : 'secondary-class'
)} />

// Using cn utility
import {cn} from '@/lib/utils'
```

### Common Patterns

```typescript
// Container
<div className="container mx-auto px-4" />

// Card layout
<div className="rounded-lg border bg-card p-6 shadow-sm" />

// Form spacing
<div className="space-y-4" />

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 gap-4" />
```

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserCard.tsx` |
| Tests | `.test.tsx` | `UserCard.test.tsx` |
| Utilities | kebab-case | `format-date.ts` |
| Hooks | camelCase | `useAuth.ts` |

---

_Previous: [Server Functions](06-server-functions) | Next: [Testing](08-testing)_

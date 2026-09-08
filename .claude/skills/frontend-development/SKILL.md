---
name: frontend-development
description: Component architecture, state management, hooks, and modern frontend patterns
---
# Frontend Development

Comprehensive patterns and best practices for building modern frontend applications.

## Component Architecture

### Component Types

| Type | Purpose | Examples |
|------|---------|----------|
| **Presentational** | UI only, no logic | Button, Card, Modal |
| **Container** | Logic & state | UserList, ProductGrid |
| **Higher-Order** | Wrap & enhance | withAuth, withLoading |
| **Layout** | Page structure | Header, Sidebar, Footer |

### Component Structure

```
components/
├── ui/                    # Base UI components
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.styles.ts
│   │   ├── Button.types.ts
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   ├── Input/
│   └── Modal/
├── layout/                # Layout components
│   ├── Header/
│   ├── Sidebar/
│   └── Footer/
├── features/              # Feature-specific
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── AuthProvider.tsx
│   └── products/
└── shared/                # Shared utilities
    ├── ErrorBoundary.tsx
    └── Loading.tsx
```

### Component Template (React)

```tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
}

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
}
```

### Component Template (Vue)

```vue
<template>
  <button
    :class="[baseClasses, variantClasses, sizeClasses, $attrs.class]"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <Spinner v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
})

const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

const variantClasses = computed(() => ({
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
}[props.variant]))

const sizeClasses = computed(() => ({
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
}[props.size]))
</script>
```

## State Management

### State Categories

| Type | Scope | Tools |
|------|-------|-------|
| **Local** | Component | useState, ref |
| **Server** | API data | React Query, SWR, TanStack Query |
| **Global** | App-wide | Zustand, Redux, Pinia |
| **URL** | Routing | URL params, query strings |

### Zustand Store Template

```typescript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
}

interface UserState {
  user: User | null
  isLoading: boolean
  error: string | null
  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isLoading: false,
        error: null,

        setUser: (user) => set({ user, error: null }),

        login: async (email, password) => {
          set({ isLoading: true, error: null })
          try {
            const response = await authApi.login(email, password)
            set({ user: response.user, isLoading: false })
          } catch (error) {
            set({ error: error.message, isLoading: false })
          }
        },

        logout: () => {
          authApi.logout()
          set({ user: null })
        },
      }),
      { name: 'user-store' }
    )
  )
)
```

### Redux Toolkit Slice Template

```typescript
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'

interface UserState {
  user: User | null
  isLoading: boolean
  error: string | null
}

const initialState: UserState = {
  user: null,
  isLoading: false,
  error: null,
}

export const login = createAsyncThunk(
  'user/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await authApi.login(email, password)
    return response.user
  }
)

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
      state.error = null
    },
    logout: (state) => {
      state.user = null
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Login failed'
      })
  },
})

export const { setUser, logout, clearError } = userSlice.actions
export default userSlice.reducer
```

### Pinia Store Template

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const userName = computed(() => user.value?.name ?? 'Guest')

  async function login(email: string, password: string) {
    isLoading.value = true
    error.value = null
    try {
      const response = await authApi.login(email, password)
      user.value = response.user
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  function logout() {
    authApi.logout()
    user.value = null
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    userName,
    login,
    logout,
  }
}, {
  persist: true,
})
```

## Custom Hooks

### Data Fetching Hook

```typescript
import { useState, useEffect, useCallback } from 'react'

interface UseFetchResult<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useFetch<T>(url: string, options?: RequestInit): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(url, options)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const json = await response.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [url, options])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
```

### Form Hook

```typescript
import { useState, useCallback } from 'react'

interface UseFormOptions<T> {
  initialValues: T
  validate?: (values: T) => Partial<Record<keyof T, string>>
  onSubmit: (values: T) => Promise<void> | void
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})

  const handleChange = useCallback((name: keyof T, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleBlur = useCallback((name: keyof T) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
  }, [])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    const validationErrors = validate?.(values) ?? {}
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true)
      try {
        await onSubmit(values)
      } finally {
        setIsSubmitting(false)
      }
    }
  }, [values, validate, onSubmit])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValues,
  }
}
```

### Debounce Hook

```typescript
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
```

### Local Storage Hook

```typescript
import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue] as const
}
```

## Props Patterns

### Compound Components

```tsx
const TabsContext = createContext<{ activeTab: string; setActiveTab: (id: string) => void } | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) throw new Error('Tabs components must be used within Tabs')
  return context
}

export function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  )
}

Tabs.List = function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="flex border-b">{children}</div>
}

Tabs.Tab = function TabsTab({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useTabsContext()
  return (
    <button
      className={cn('px-4 py-2', activeTab === id && 'border-b-2 border-blue-500')}
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  )
}

Tabs.Panel = function TabsPanel({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeTab } = useTabsContext()
  if (activeTab !== id) return null
  return <div className="p-4">{children}</div>
}

// Usage
<Tabs defaultTab="overview">
  <Tabs.List>
    <Tabs.Tab id="overview">Overview</Tabs.Tab>
    <Tabs.Tab id="settings">Settings</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel id="overview">Overview content</Tabs.Panel>
  <Tabs.Panel id="settings">Settings content</Tabs.Panel>
</Tabs>
```

### Render Props

```tsx
interface MousePosition {
  x: number
  y: number
}

export function MouseTracker({ children }: { children: (position: MousePosition) => React.ReactNode }) {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return <>{children(position)}</>
}

// Usage
<MouseTracker>
  {({ x, y }) => <div>Mouse at: {x}, {y}</div>}
</MouseTracker>
```

## Performance Patterns

### Code Splitting

```tsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  )
}
```

### Memoization

```tsx
import { memo, useMemo, useCallback } from 'react'

interface UserListProps {
  users: User[]
  onSelect: (user: User) => void
}

export const UserList = memo(function UserList({ users, onSelect }: UserListProps) {
  const sortedUsers = useMemo(() => 
    [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  )

  const handleSelect = useCallback((user: User) => {
    onSelect(user)
  }, [onSelect])

  return (
    <ul>
      {sortedUsers.map(user => (
        <UserItem key={user.id} user={user} onSelect={handleSelect} />
      ))}
    </ul>
  )
})
```

### Virtualization

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  })

  return (
    <div ref={parentRef} className="h-[500px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index].content}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Error Handling

### Error Boundary

```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo)
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 text-center">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

## Testing Patterns

### Component Test Template

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('renders email and password inputs', () => {
    render(<LoginForm onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={vi.fn()} />)
    
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })

  it('calls onSubmit with form data', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })
})
```

### Hook Test Template

```tsx
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useCounter } from './useCounter'

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })

  it('increments count', () => {
    const { result } = renderHook(() => useCounter())
    
    act(() => {
      result.current.increment()
    })
    
    expect(result.current.count).toBe(1)
  })

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5))
    
    act(() => {
      result.current.decrement()
    })
    
    expect(result.current.count).toBe(4)
  })
})
```

## Best Practices

### Do's
- Keep components small and focused
- Use TypeScript for type safety
- Memoize expensive computations
- Use code splitting for large bundles
- Handle loading and error states
- Write tests for critical paths
- Use semantic HTML
- Ensure accessibility (a11y)

### Don'ts
- Don't mutate state directly
- Don't over-optimize prematurely
- Don't ignore warnings
- Don't use index as key in lists
- Don't put everything in global state
- Don't skip error boundaries
- Don't ignore accessibility

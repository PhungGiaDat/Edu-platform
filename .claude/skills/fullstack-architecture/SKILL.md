---
name: fullstack-architecture
description: Monorepo setup, frontend-backend integration, system design patterns
---
# Fullstack Architecture

Comprehensive patterns for building cohesive fullstack applications.

## Architecture Patterns

### Application Types

| Pattern | Description | Best For |
|---------|-------------|----------|
| **Monolith** | Single deployable unit | Small teams, MVP |
| **Modular Monolith** | Organized modules in monolith | Medium teams |
| **Microservices** | Independent services | Large teams, scale |
| **Serverless** | Function-based | Variable traffic |

### Project Structure

#### Monorepo (Recommended)

```
project/
├── apps/
│   ├── web/                    # Next.js app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── styles/
│   │   ├── public/
│   │   ├── next.config.js
│   │   └── package.json
│   │
│   ├── api/                    # Express/Fastify API
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── mobile/                 # React Native
│       ├── src/
│       └── package.json
│
├── packages/
│   ├── ui/                     # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── database/               # Prisma/Drizzle schema
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   │
│   ├── types/                  # Shared TypeScript types
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── utils/                  # Shared utilities
│   │   ├── src/
│   │   │   ├── format.ts
│   │   │   ├── validate.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── config/                 # Shared configuration
│       ├── src/
│       │   ├── eslint.js
│       │   └── typescript.json
│       └── package.json
│
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

### Turborepo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// Root package.json
{
  "name": "my-app",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

## Shared Packages

### UI Package

```typescript
// packages/ui/src/index.ts
export * from './components/button'
export * from './components/input'
export * from './components/card'
export * from './components/dialog'
export * from './lib/utils'

// packages/ui/package.json
{
  "name": "@my-app/ui",
  "version": "0.0.1",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles.css": "./dist/styles.css"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts --external react",
    "dev": "tsup src/index.ts --format esm,cjs --watch --dts --external react"
  }
}
```

### Types Package

```typescript
// packages/types/src/index.ts
export interface User {
  id: string
  email: string
  name: string | null
  role: 'user' | 'admin'
  createdAt: Date
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  quantity: number
  categoryId: string
}

export interface Order {
  id: string
  userId: string
  status: OrderStatus
  items: OrderItem[]
  total: number
  createdAt: Date
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

// API types
export interface ApiResponse<T> {
  data: T
  meta?: {
    page: number
    limit: number
    total: number
  }
}

export interface ApiError {
  error: string
  code?: string
  details?: Record<string, string[]>
}

// packages/types/package.json
{
  "name": "@my-app/types",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

### Database Package

```prisma
// packages/database/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ... models
```

```typescript
// packages/database/src/index.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export * from '@prisma/client'
```

## Frontend-Backend Integration

### API Client

```typescript
// packages/api-client/src/index.ts
import type { ApiResponse, ApiError } from '@my-app/types'

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { body, headers, ...rest } = options

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(this.getAuthHeader() || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new ApiClientError(error.error, response.status, error)
    }

    return response.json()
  }

  private getAuthHeader(): Record<string, string> | null {
    const token = this.getToken()
    return token ? { Authorization: `Bearer ${token}` } : null
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('accessToken')
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body })
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body })
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: ApiError
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export const api = new ApiClient(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
```

### React Query Integration

```typescript
// apps/web/src/lib/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@my-app/api-client'

// Keys
export const queryKeys = {
  users: {
    all: ['users'] as const,
    list: (params: PaginationParams) => [...queryKeys.users.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
  },
  products: {
    all: ['products'] as const,
    list: (params: PaginationParams) => [...queryKeys.products.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
  },
}

// Queries
export function useUsers(params: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => api.get<ApiResponse<User[]>>('/users', { body: params }),
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => api.get<User>(`/users/${id}`),
    enabled: !!id,
  })
}

// Mutations
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserInput) => api.post<User>('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      api.patch<User>(`/users/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}
```

### Server Actions (Next.js)

```typescript
// apps/web/src/actions/user.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@my-app/database'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
})

export async function createUser(formData: FormData) {
  const validated = createUserSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
  })

  if (!validated.success) {
    return { error: 'Invalid input', errors: validated.error.flatten() }
  }

  try {
    const user = await prisma.user.create({
      data: validated.data,
    })

    revalidatePath('/users')
    return { success: true, user }
  } catch (error) {
    return { error: 'Failed to create user' }
  }
}

export async function updateUser(id: string, formData: FormData) {
  const validated = createUserSchema.partial().safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
  })

  if (!validated.success) {
    return { error: 'Invalid input' }
  }

  try {
    await prisma.user.update({
      where: { id },
      data: validated.data,
    })

    revalidatePath('/users')
    revalidatePath(`/users/${id}`)
  } catch (error) {
    return { error: 'Failed to update user' }
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } })
    revalidatePath('/users')
    redirect('/users')
  } catch (error) {
    return { error: 'Failed to delete user' }
  }
}
```

## Environment Configuration

### Environment Files

```bash
# .env.example
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/myapp"

# Auth
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
SESSION_SECRET="your-session-secret"

# OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# API
API_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"

# External Services
REDIS_URL="redis://localhost:6379"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# Email
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
```

### Configuration Package

```typescript
// packages/config/src/index.ts
import { z } from 'zod'

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(3000),
  database: z.object({
    url: z.string().url(),
  }),
  auth: z.object({
    jwtSecret: z.string().min(32),
    jwtRefreshSecret: z.string().min(32),
    sessionSecret: z.string().min(32),
  }),
  urls: z.object({
    api: z.string().url(),
    frontend: z.string().url(),
  }),
  redis: z.object({
    url: z.string(),
  }),
})

export type Config = z.infer<typeof configSchema>

export function loadConfig(): Config {
  return configSchema.parse({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    database: {
      url: process.env.DATABASE_URL,
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
      sessionSecret: process.env.SESSION_SECRET,
    },
    urls: {
      api: process.env.API_URL,
      frontend: process.env.FRONTEND_URL,
    },
    redis: {
      url: process.env.REDIS_URL,
    },
  })
}

export const config = loadConfig()
```

## System Design Patterns

### Backend-for-Frontend (BFF)

```
┌─────────────────────────────────────────────────────┐
│                    Mobile App                        │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                 Mobile BFF                           │
│  - Aggregates data for mobile                       │
│  - Optimizes responses for mobile                   │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                                                      │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│    │ User Svc │  │Order Svc │  │ProductSvc│        │
│    └──────────┘  └──────────┘  └──────────┘        │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    Web App                           │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                  Web BFF                             │
│  - Full data for web                                │
│  - SSR support                                      │
└────────────────────┬────────────────────────────────┘
                     │
                     │ (Same microservices)
```

### CQRS Pattern

```typescript
// Commands - Write operations
interface CreateUserCommand {
  type: 'CREATE_USER'
  payload: {
    email: string
    name: string
    password: string
  }
}

interface UpdateUserCommand {
  type: 'UPDATE_USER'
  payload: {
    id: string
    data: Partial<User>
  }
}

// Command Handler
async function handleCommand(command: Command) {
  switch (command.type) {
    case 'CREATE_USER':
      return userService.create(command.payload)
    case 'UPDATE_USER':
      return userService.update(command.payload.id, command.payload.data)
  }
}

// Queries - Read operations
interface GetUserQuery {
  type: 'GET_USER'
  payload: { id: string }
}

interface ListUsersQuery {
  type: 'LIST_USERS'
  payload: { page: number; limit: number }
}

// Query Handler (can read from read replica or cache)
async function handleQuery(query: Query) {
  switch (query.type) {
    case 'GET_USER':
      return userReadModel.findById(query.payload.id)
    case 'LIST_USERS':
      return userReadModel.findAll(query.payload)
  }
}
```

### Event Sourcing

```typescript
// Event types
interface UserCreatedEvent {
  type: 'USER_CREATED'
  aggregateId: string
  timestamp: Date
  payload: { email: string; name: string }
}

interface UserUpdatedEvent {
  type: 'USER_UPDATED'
  aggregateId: string
  timestamp: Date
  payload: Partial<User>
}

// Event store
async function appendEvent(event: Event) {
  await prisma.eventStore.create({
    data: {
      aggregateType: 'User',
      aggregateId: event.aggregateId,
      eventType: event.type,
      payload: event.payload,
      timestamp: event.timestamp,
    },
  })
  
  // Publish to message broker
  await messageBroker.publish('user-events', event)
}

// Rebuild state from events
async function rebuildUserState(userId: string): Promise<User> {
  const events = await prisma.eventStore.findMany({
    where: { aggregateId: userId },
    orderBy: { timestamp: 'asc' },
  })

  return events.reduce((state, event) => {
    switch (event.eventType) {
      case 'USER_CREATED':
        return { ...state, ...event.payload, id: userId }
      case 'USER_UPDATED':
        return { ...state, ...event.payload }
      default:
        return state
    }
  }, {} as User)
}
```

## Deployment Architecture

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Production Checklist

- [ ] Environment variables secured
- [ ] Database backups configured
- [ ] SSL/TLS certificates
- [ ] Rate limiting enabled
- [ ] Logging and monitoring
- [ ] Error tracking (Sentry)
- [ ] CDN for static assets
- [ ] Database connection pooling
- [ ] Redis for caching/sessions
- [ ] Health check endpoints
- [ ] Graceful shutdown
- [ ] Horizontal scaling ready

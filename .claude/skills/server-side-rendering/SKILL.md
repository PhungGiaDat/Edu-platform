---
name: server-side-rendering
description: Next.js/Nuxt.js/Remix, SSR/SSG/ISR patterns, hydration, streaming
---
# Server-Side Rendering

Comprehensive patterns for SSR, SSG, and hybrid rendering strategies.

## Rendering Strategies

| Strategy | When to Use | Pros | Cons |
|----------|-------------|------|------|
| **SSR** | Dynamic content, SEO needed | Fresh data, SEO-friendly | Server load, slower TTFB |
| **SSG** | Static content, blogs | Fast, CDN cacheable | Build time, stale data |
| **ISR** | Semi-dynamic content | Best of both | Complexity |
| **CSR** | Authenticated apps | Low server load | Poor SEO, slow initial |

## Next.js Patterns

### App Router Structure

```
app/
├── layout.tsx              # Root layout
├── page.tsx                # Home page
├── loading.tsx             # Loading UI
├── error.tsx               # Error boundary
├── not-found.tsx           # 404 page
├── globals.css
│
├── (auth)/                 # Route group
│   ├── layout.tsx
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
│
├── dashboard/              # Protected routes
│   ├── layout.tsx
│   ├── page.tsx
│   └── settings/
│       └── page.tsx
│
├── products/
│   ├── page.tsx            # /products
│   ├── [id]/
│   │   ├── page.tsx        # /products/123
│   │   └── edit/
│   │       └── page.tsx    # /products/123/edit
│   └── new/
│       └── page.tsx        # /products/new
│
└── api/
    ├── users/
    │   └── route.ts
    └── webhooks/
        └── stripe/
            └── route.ts
```

### Server Components

```tsx
// app/products/page.tsx
import { Suspense } from 'react'
import { ProductList } from './ProductList'
import { ProductListSkeleton } from './ProductListSkeleton'

// Server Component - runs on server only
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string }
}) {
  const page = Number(searchParams.page) || 1

  return (
    <main className="container py-8">
      <h1>Products</h1>
      
      {/* Streaming with Suspense */}
      <Suspense fallback={<ProductListSkeleton />}>
        <ProductList page={page} category={searchParams.category} />
      </Suspense>
    </main>
  )
}

// app/products/ProductList.tsx
async function ProductList({ page, category }: { page: number; category?: string }) {
  // Direct database access in Server Component
  const products = await db.product.findMany({
    where: category ? { category } : undefined,
    skip: (page - 1) * 20,
    take: 20,
  })

  return (
    <div className="grid grid-cols-4 gap-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Client Components

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ProductCard({ product }: { product: Product }) {
  const [isAdding, setIsAdding] = useState(false)
  const router = useRouter()

  async function addToCart() {
    setIsAdding(true)
    try {
      await addToCartAction(product.id)
      router.refresh() // Re-fetch server data
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={addToCart} disabled={isAdding}>
        {isAdding ? 'Adding...' : 'Add to Cart'}
      </button>
    </div>
  )
}
```

### Data Fetching Patterns

```tsx
// Parallel data fetching
async function DashboardPage() {
  // Fetch in parallel
  const [user, orders, stats] = await Promise.all([
    getUser(),
    getOrders(),
    getStats(),
  ])

  return (
    <div>
      <UserProfile user={user} />
      <OrderList orders={orders} />
      <StatsWidget stats={stats} />
    </div>
  )
}

// Sequential with Suspense boundaries
async function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile />
      </Suspense>
      
      <Suspense fallback={<OrdersSkeleton />}>
        <OrderList />
      </Suspense>
      
      <Suspense fallback={<StatsSkeleton />}>
        <StatsWidget />
      </Suspense>
    </div>
  )
}

// Streaming with async components
async function UserProfile() {
  const user = await getUser() // Streams when ready
  return <div>{user.name}</div>
}
```

### Static Generation (SSG)

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await db.post.findMany({ select: { slug: true } })
  
  return posts.map(post => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await db.post.findUnique({
    where: { slug: params.slug },
  })

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  }
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await db.post.findUnique({
    where: { slug: params.slug },
    include: { author: true },
  })

  if (!post) notFound()

  return (
    <article>
      <h1>{post.title}</h1>
      <MDXContent source={post.content} />
    </article>
  )
}
```

### Incremental Static Regeneration (ISR)

```tsx
// app/products/[id]/page.tsx
export const revalidate = 3600 // Revalidate every hour

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({
    where: { id: params.id },
  })

  return <ProductDetails product={product} />
}

// On-demand revalidation (API route)
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(request: Request) {
  const { path, tag, secret } = await request.json()

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 })
  }

  if (tag) {
    revalidateTag(tag)
  } else if (path) {
    revalidatePath(path)
  }

  return Response.json({ revalidated: true, now: Date.now() })
}
```

### Server Actions

```tsx
// actions/cart.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const addToCartSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1).max(10),
})

export async function addToCart(formData: FormData) {
  const validated = addToCartSchema.parse({
    productId: formData.get('productId'),
    quantity: Number(formData.get('quantity')),
  })

  const cart = await getOrCreateCart()
  
  await db.cartItem.create({
    data: {
      cartId: cart.id,
      productId: validated.productId,
      quantity: validated.quantity,
    },
  })

  revalidateTag('cart')
}

export async function checkout() {
  const cart = await getCart()
  
  if (!cart || cart.items.length === 0) {
    return { error: 'Cart is empty' }
  }

  const order = await db.order.create({
    data: {
      userId: cart.userId,
      items: { create: cart.items },
      total: calculateTotal(cart.items),
    },
  })

  await db.cartItem.deleteMany({ where: { cartId: cart.id } })

  revalidateTag('cart')
  revalidatePath('/orders')
  redirect(`/orders/${order.id}/thank-you`)
}

// Usage in component
function AddToCartButton({ productId }: { productId: string }) {
  return (
    <form action={addToCart}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value="1" />
      <button type="submit">Add to Cart</button>
    </form>
  )
}

// With useActionState for pending state
function AddToCartForm({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState(addToCart, null)

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Adding...' : 'Add to Cart'}
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  )
}
```

### Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')
  const isAuthenticated = !!token

  // Protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (request.nextUrl.pathname.startsWith('/login')) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Add custom headers
  const response = NextResponse.next()
  response.headers.set('x-pathname', request.nextUrl.pathname)

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
  ],
}
```

## Nuxt.js Patterns

### Directory Structure

```
app/
├── pages/
│   ├── index.vue
│   ├── products/
│   │   ├── index.vue
│   │   └── [id].vue
│   └── dashboard/
│       └── index.vue
├── layouts/
│   ├── default.vue
│   └── admin.vue
├── components/
├── composables/
├── server/
│   ├── api/
│   │   └── users.ts
│   ├── middleware/
│   └── routes/
└── nuxt.config.ts
```

### Server Routes & Data Fetching

```vue
<!-- pages/products/[id].vue -->
<script setup lang="ts">
const route = useRoute()
const { data: product } = await useFetch(`/api/products/${route.params.id}`)

// SSR-friendly data fetching
const { data: relatedProducts } = await useFetch('/api/products', {
  query: { category: product.value?.category },
  watch: [() => product.value?.category],
})

// SEO
useSeoMeta({
  title: () => product.value?.name,
  description: () => product.value?.description,
})
</script>

<template>
  <div v-if="product">
    <h1>{{ product.name }}</h1>
    <p>{{ product.description }}</p>
    
    <h2>Related Products</h2>
    <ProductGrid :products="relatedProducts" />
  </div>
</template>
```

### Server API

```typescript
// server/api/products/[id].ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  
  const product = await db.product.findUnique({
    where: { id },
    include: { category: true },
  })
  
  if (!product) {
    throw createError({
      statusCode: 404,
      message: 'Product not found',
    })
  }
  
  return product
})

// server/api/products/index.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  
  const [products, total] = await Promise.all([
    db.product.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: query.category ? { category: query.category } : undefined,
    }),
    db.product.count(),
  ])
  
  return {
    data: products,
    meta: { page, limit, total },
  }
})
```

## Remix Patterns

### Route Structure

```
app/
├── routes/
│   ├── _index.tsx
│   ├── products._index.tsx
│   ├── products.$id.tsx
│   ├── products.$id.edit.tsx
│   ├── dashboard._index.tsx
│   └── dashboard.settings.tsx
├── components/
├── services/
└── root.tsx
```

### Loaders & Actions

```tsx
// routes/products.$id.tsx
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form } from '@remix-run/react'

export async function loader({ params }: LoaderFunctionArgs) {
  const product = await db.product.findUnique({
    where: { id: params.id },
  })

  if (!product) {
    throw json({ message: 'Product not found' }, { status: 404 })
  }

  return json({ product })
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'delete') {
    await db.product.delete({ where: { id: params.id } })
    return redirect('/products')
  }

  if (intent === 'update') {
    const name = formData.get('name')
    const price = Number(formData.get('price'))

    const product = await db.product.update({
      where: { id: params.id },
      data: { name, price },
    })

    return json({ product })
  }
}

export default function ProductPage() {
  const { product } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isDeleting = navigation.formData?.get('intent') === 'delete'

  return (
    <div>
      <h1>{product.name}</h1>
      <p>${product.price}</p>

      <Form method="post">
        <button
          type="submit"
          name="intent"
          value="delete"
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </Form>
    </div>
  )
}
```

### Nested Routes with Outlet

```tsx
// routes/dashboard.tsx
export default function DashboardLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

// routes/dashboard._index.tsx
export async function loader() {
  return json({ stats: await getDashboardStats() })
}

export default function DashboardIndex() {
  const { stats } = useLoaderData<typeof loader>()
  return <DashboardStats stats={stats} />
}
```

## Hydration Optimization

### Selective Hydration

```tsx
// Defer non-critical component hydration
import dynamic from 'next/dynamic'

const Comments = dynamic(() => import('./Comments'), {
  loading: () => <CommentsSkeleton />,
  ssr: false, // Skip SSR entirely
})

// Hydrate on interaction
function ExpandableSection({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  return (
    <div>
      <button onClick={() => setIsExpanded(true)}>
        Show more
      </button>
      {isExpanded && (
        isHydrated ? children : <Skeleton />
      )}
    </div>
  )
}
```

### Hydration Mismatch Prevention

```tsx
// Use client-only rendering for browser-specific content
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) return null
  return <>{children}</>
}

// Usage
<ClientOnly>
  <BrowserSpecificComponent />
</ClientOnly>

// Suppress hydration warnings for dynamic content
<span suppressHydrationWarning>
  {new Date().toLocaleDateString()}
</span>
```

## Caching Strategies

### HTTP Caching Headers

```typescript
// Next.js route handler
export async function GET() {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}

// Next.js page
export const headers = {
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
}
```

### Data Caching

```typescript
// Fetch with cache
async function getProducts() {
  const res = await fetch('/api/products', {
    next: {
      revalidate: 3600, // Revalidate every hour
      tags: ['products'], // Tag for on-demand revalidation
    },
  })
  return res.json()
}

// Cache per-request
async function getProduct(id: string) {
  const res = await fetch(`/api/products/${id}`, {
    cache: 'no-store', // Always fresh
  })
  return res.json()
}

// Force cache
async function getStaticData() {
  const res = await fetch('/api/static-data', {
    cache: 'force-cache', // Cache indefinitely
  })
  return res.json()
}
```

## Performance Checklist

### SSR Optimization
- [ ] Use streaming with Suspense
- [ ] Parallelize data fetching
- [ ] Cache expensive computations
- [ ] Implement proper error boundaries
- [ ] Use partial prerendering
- [ ] Minimize client-side JavaScript
- [ ] Optimize critical rendering path

### SEO
- [ ] Implement proper metadata
- [ ] Use semantic HTML
- [ ] Add structured data (JSON-LD)
- [ ] Generate sitemaps
- [ ] Handle canonical URLs
- [ ] Implement Open Graph tags
- [ ] Add Twitter cards

### Caching
- [ ] Set appropriate cache headers
- [ ] Use ISR for semi-dynamic content
- [ ] Implement cache invalidation
- [ ] Use CDN for static assets
- [ ] Cache API responses

---
name: performance-optimizer
description: Web performance patterns, lazy loading, caching, and optimization
---
# Performance Optimizer

Optimize web application performance with lazy loading, caching, code splitting, and best practices.

## Core Web Vitals

| Metric | Description | Good | Needs Work | Poor |
|--------|-------------|------|------------|------|
| **LCP** | Largest Contentful Paint | ≤2.5s | 2.5-4s | >4s |
| **FID** | First Input Delay | ≤100ms | 100-300ms | >300ms |
| **CLS** | Cumulative Layout Shift | ≤0.1 | 0.1-0.25 | >0.25 |
| **INP** | Interaction to Next Paint | ≤200ms | 200-500ms | >500ms |
| **TTFB** | Time to First Byte | ≤800ms | 800-1800ms | >1800ms |

## Performance Budget

### Resource Budget Example
| Resource | Budget | Warning |
|----------|--------|---------|
| Total page weight | 1MB | 800KB |
| JavaScript | 200KB | 150KB |
| CSS | 100KB | 80KB |
| Images | 500KB | 400KB |
| Fonts | 100KB | 80KB |
| HTTP requests | 50 | 40 |

### Webpack Bundle Analyzer
```javascript
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
    }),
  ],
  performance: {
    maxEntrypointSize: 250000,
    maxAssetSize: 250000,
    hints: 'warning',
  },
}
```

## Code Splitting

### Dynamic Imports
```tsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const Analytics = lazy(() => import('./pages/Analytics'))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  )
}
```

### Named Exports
```tsx
const ChartComponent = lazy(() =>
  import('./Chart').then((module) => ({ default: module.ChartComponent }))
)
```

### Preload on Hover
```tsx
const handleMouseEnter = () => {
  import('./HeavyComponent')
}

<button onMouseEnter={handleMouseEnter}>Load Heavy Component</button>
```

## Lazy Loading

### Images
```tsx
interface ImageProps {
  src: string
  alt: string
  width: number
  height: number
}

export function LazyImage({ src, alt, width, height }: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      style={{ aspectRatio: `${width}/${height}` }}
    />
  )
}
```

### Intersection Observer
```tsx
import { useEffect, useRef, useState } from 'react'

export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)

    observer.observe(element)

    return () => observer.disconnect()
  }, [options])

  return { ref, isIntersecting }
}

export function LazySection({ children }: { children: React.ReactNode }) {
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin: '200px',
  })

  return (
    <div ref={ref}>
      {isIntersecting ? children : <div style={{ minHeight: 200 }} />}
    </div>
  )
}
```

### Virtual List
```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

interface VirtualListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  estimateSize?: number
}

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 50,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  })

  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
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
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Caching Strategies

### Browser Caching Headers
```
Cache-Control: max-age=31536000, immutable  # Static assets with hash
Cache-Control: max-age=3600, stale-while-revalidate=86400  # API responses
Cache-Control: no-cache  # HTML (always revalidate)
```

### Service Worker Cache
```javascript
const CACHE_NAME = 'v1'
const STATIC_ASSETS = [
  '/',
  '/styles.css',
  '/app.js',
  '/offline.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) {
          return response
        }

        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
    })
  )
})
```

### React Query Caching
```tsx
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000,
  })
}
```

### SWR Configuration
```tsx
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function useUser(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/users/${id}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  )

  return { user: data, error, isLoading, mutate }
}
```

## Bundle Optimization

### Tree Shaking
```javascript
import { debounce, throttle } from 'lodash-es'

const _ = {
  debounce,
  throttle,
}

export default _
```

### Remove Unused CSS
```javascript
const PurgeCSS = require('@fullhuman/postcss-purgecss')

module.exports = {
  plugins: [
    PurgeCSS({
      content: ['./src/**/*.tsx', './src/**/*.html'],
      defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
    }),
  ],
}
```

### Minification
```javascript
const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          },
        },
      }),
    ],
  },
}
```

## Image Optimization

### Next.js Image
```tsx
import Image from 'next/image'

export function OptimizedImage() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  )
}

export function ResponsiveImage() {
  return (
    <Image
      src="/product.jpg"
      alt="Product"
      width={800}
      height={600}
      sizes="(max-width: 768px) 100vw, 50vw"
      loading="lazy"
    />
  )
}
```

### Responsive Images
```html
<picture>
  <source
    media="(min-width: 1024px)"
    srcset="large.webp 1x, large@2x.webp 2x"
    type="image/webp"
  >
  <source
    media="(min-width: 768px)"
    srcset="medium.webp 1x, medium@2x.webp 2x"
    type="image/webp"
  >
  <source srcset="small.webp 1x, small@2x.webp 2x" type="image/webp">
  <img
    src="small.jpg"
    srcset="small.jpg 1x, small@2x.jpg 2x"
    alt="Responsive image"
    loading="lazy"
    decoding="async"
  >
</picture>
```

### Image Format Selection
```
Priority:
1. AVIF (best compression, limited support)
2. WebP (good compression, wide support)
3. JPEG/PNG (fallback)

Tools:
- squoosh.app
- imagemin
- sharp
```

## Font Optimization

### Font Loading
```html
<!-- Preload critical fonts -->
<link
  rel="preload"
  href="/fonts/inter-var.woff2"
  as="font"
  type="font/woff2"
  crossorigin
>

<!-- Font-display -->
<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-var.woff2') format('woff2');
    font-display: swap;
    font-weight: 100 900;
  }
</style>
```

### Variable Fonts
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
}

body {
  font-family: 'Inter', sans-serif;
  font-variation-settings: 'wght' 400;
}

h1 {
  font-variation-settings: 'wght' 700;
}
```

### Subset Fonts
```javascript
module.exports = {
  experimental: {
    optimizeFonts: true,
  },
}
```

## API Performance

### Debounce
```tsx
import { useCallback, useRef } from 'react'

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay]
  )
}

function SearchInput() {
  const debouncedSearch = useDebounce((query: string) => {
    fetch(`/api/search?q=${query}`)
  }, 300)

  return <input onChange={(e) => debouncedSearch(e.target.value)} />
}
```

### Throttle
```tsx
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRunRef = useRef(0)

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastRunRef.current >= delay) {
        lastRunRef.current = now
        callback(...args)
      }
    }) as T,
    [callback, delay]
  )
}
```

### Request Cancellation
```tsx
import { useEffect, useRef } from 'react'

function useFetch(url: string) {
  const abortControllerRef = useRef<AbortController>()

  useEffect(() => {
    abortControllerRef.current = new AbortController()

    fetch(url, { signal: abortControllerRef.current.signal })
      .then((res) => res.json())
      .then((data) => setData(data))

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [url])
}
```

## React Performance

### Memoization
```tsx
import { memo, useMemo, useCallback } from 'react'

interface ItemProps {
  id: string
  name: string
  onSelect: (id: string) => void
}

const Item = memo(function Item({ id, name, onSelect }: ItemProps) {
  return (
    <li>
      <button onClick={() => onSelect(id)}>{name}</button>
    </li>
  )
})

function List({ items }: { items: ItemProps[] }) {
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  )

  const handleSelect = useCallback((id: string) => {
    console.log('Selected:', id)
  }, [])

  return (
    <ul>
      {sortedItems.map((item) => (
        <Item key={item.id} {...item} onSelect={handleSelect} />
      ))}
    </ul>
  )
}
```

### State Updates
```tsx
function Component() {
  const [items, setItems] = useState<string[]>([])

  const addItem = useCallback((item: string) => {
    setItems((prev) => [...prev, item])
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  return { items, addItem, removeItem }
}
```

## Performance Checklist

```
□ LCP < 2.5s
□ FID < 100ms
□ CLS < 0.1
□ Images optimized (WebP, lazy load)
□ Code splitting implemented
□ Tree shaking enabled
□ Gzip/Brotli compression
□ Browser caching configured
□ Fonts optimized (preload, swap)
□ Critical CSS inlined
□ Unused CSS removed
□ JavaScript minified
□ Third-party scripts deferred
□ API responses cached
□ Virtual scrolling for long lists
□ Debounce/throttle handlers
□ Memory leaks fixed
□ Bundle size monitored
```

## Best Practices

### Do's
- Measure before optimizing
- Set performance budgets
- Use lazy loading
- Implement caching
- Monitor Core Web Vitals
- Test on slow connections
- Profile with DevTools

### Don'ts
- Premature optimization
- Ignore mobile performance
- Load hidden content
- Skip image optimization
- Use large libraries
- Block main thread
- Forget to measure results

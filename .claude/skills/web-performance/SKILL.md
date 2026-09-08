---
name: web-performance
description: Core Web Vitals, lazy loading, bundle optimization, and caching strategies
---
# Web Performance

Comprehensive guide to optimizing web application performance.

## Core Web Vitals

### Metrics Overview

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 2.5s - 4s | > 4s |
| **FID** (First Input Delay) | ≤ 100ms | 100ms - 300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |
| **INP** (Interaction to Next Paint) | ≤ 200ms | 200ms - 500ms | > 500ms |
| **TTFB** (Time to First Byte) | ≤ 800ms | 800ms - 1800ms | > 1800ms |
| **FCP** (First Contentful Paint) | ≤ 1.8s | 1.8s - 3s | > 3s |

### Measuring Performance

```typescript
// Web Vitals measurement
import { onCLS, onFID, onLCP, onINP, onFCP, onTTFB } from 'web-vitals'

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    id: metric.id,
    page: window.location.pathname,
  })
  
  // Use navigator.sendBeacon if available
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body)
  } else {
    fetch('/analytics', { body, method: 'POST', keepalive: true })
  }
}

onCLS(sendToAnalytics)
onFID(sendToAnalytics)
onLCP(sendToAnalytics)
onINP(sendToAnalytics)
onFCP(sendToAnalytics)
onTTFB(sendToAnalytics)
```

### Performance Observer

```typescript
// Observe long tasks
const longTaskObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Long task:', entry.duration, 'ms')
    // Report to analytics
  }
})
longTaskObserver.observe({ entryTypes: ['longtask'] })

// Observe layout shifts
const layoutShiftObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!(entry as any).hadRecentInput) {
      console.log('Layout shift:', (entry as any).value)
    }
  }
})
layoutShiftObserver.observe({ entryTypes: ['layout-shift'] })

// Observe element timing
const elementObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Element rendered:', entry.identifier, entry.startTime)
  }
})
elementObserver.observe({ entryTypes: ['element'] })
```

## Bundle Optimization

### Code Splitting

```tsx
// Dynamic imports
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))

// With loading state
function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  )
}

// Named exports
const Avatar = lazy(() => 
  import('./components/Avatar').then((mod) => ({ default: mod.Avatar }))
)

// Preload on hover
function Link({ to, children }: { to: string; children: React.ReactNode }) {
  const preload = () => {
    import(`./pages/${to}`)
  }
  
  return (
    <a href={to} onMouseEnter={preload} onFocus={preload}>
      {children}
    </a>
  )
}
```

### Tree Shaking

```typescript
// Bad - imports entire library
import _ from 'lodash'
_.debounce(fn, 300)

// Good - imports only what's needed
import debounce from 'lodash/debounce'
debounce(fn, 300)

// Or use lodash-es for better tree shaking
import { debounce } from 'lodash-es'
```

### Bundle Analysis

```bash
# Analyze bundle size
npx bundle-analyzer build/static/js/*.js

# Next.js bundle analyzer
ANALYZE=true npm run build

# Vite bundle analyzer
vite-bundle-visualizer
```

### Webpack/Vite Configuration

```typescript
// vite.config.ts - optimization
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          utils: ['date-fns', 'zod'],
        },
      },
    },
    target: 'esnext',
    minify: 'esbuild',
  },
})

// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@heroicons/react'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test(module) {
              return module.size() > 160000 && /node_modules/.test(module.identifier())
            },
            name(module) {
              return module.identifier().split('node_modules/')[1].split('/')[0]
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
        },
      }
    }
    return config
  },
}
```

## Lazy Loading

### Images

```tsx
// Native lazy loading
<img src="image.jpg" alt="Description" loading="lazy" />

// With blur placeholder
function ImageWithBlur({ src, alt }: { src: string; alt: string }) {
  const [isLoaded, setIsLoaded] = useState(false)
  
  return (
    <div className="relative">
      <img
        src={placeholderBlur}
        alt=""
        className={cn('absolute inset-0', isLoaded && 'opacity-0')}
      />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={cn('transition-opacity', !isLoaded && 'opacity-0')}
      />
    </div>
  )
}

// Next.js Image component
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // For above-fold images
  placeholder="blur"
  blurDataURL={blurDataURL}
/>
```

### Components

```tsx
// Intersection Observer lazy loading
function LazyLoad({ children, threshold = 0.1 }: {
  children: React.ReactNode
  threshold?: number
}) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return <div ref={ref}>{isVisible ? children : null}</div>
}
```

### Data

```tsx
// Infinite scroll
function useInfiniteScroll<T>(
  fetchFn: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
  threshold = 100
) {
  const [data, setData] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    
    setIsLoading(true)
    try {
      const result = await fetchFn(page)
      setData((prev) => [...prev, ...result.data])
      setHasMore(result.hasMore)
      setPage((p) => p + 1)
    } finally {
      setIsLoading(false)
    }
  }, [fetchFn, page, isLoading, hasMore])

  useEffect(() => {
    const handleScroll = () => {
      const scrollBottom = document.documentElement.scrollHeight - window.innerHeight - window.scrollY
      if (scrollBottom < threshold) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore, threshold])

  return { data, isLoading, hasMore, loadMore }
}
```

## Caching Strategies

### Browser Caching Headers

```nginx
# nginx configuration
location /static/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

location /assets/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

location /api/ {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### Service Worker Caching

```typescript
// service-worker.ts
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
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
    }).catch(() => caches.match('/offline.html'))
  )
})
```

### React Query Caching

```tsx
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Prefetching
function usePrefetchUser(id: string) {
  const queryClient = useQueryClient()
  
  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ['user', id],
      queryFn: () => fetchUser(id),
    })
  }
  
  return prefetch
}

// Usage with hover
<Link onMouseEnter={prefetchUser(id)}>View User</Link>
```

### API Response Caching

```typescript
// Express caching middleware
import { Request, Response, NextFunction } from 'express'

export function cacheControl(maxAge: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `public, max-age=${maxAge}`)
    next()
  }
}

// Usage
app.get('/api/products', cacheControl(3600), getProducts)
app.get('/api/users/:id', cacheControl(60), getUser)

// ETag support
app.get('/api/data', (req, res) => {
  const data = getData()
  const etag = generateETag(data)
  
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end()
  }
  
  res.set('ETag', etag)
  res.json(data)
})
```

## Image Optimization

### Formats & Sizing

```tsx
// Responsive images
<picture>
  <source srcSet="/image.avif" type="image/avif" />
  <source srcSet="/image.webp" type="image/webp" />
  <img src="/image.jpg" alt="Description" loading="lazy" />
</picture>

// Responsive srcset
<img
  src="/image-400.jpg"
  srcSet="
    /image-400.jpg 400w,
    /image-800.jpg 800w,
    /image-1200.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
  alt="Description"
/>
```

### CDN Integration

```typescript
// Image URL transformation
function getImageUrl(
  src: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'auto'
  } = {}
) {
  const params = new URLSearchParams()
  
  if (options.width) params.set('w', options.width.toString())
  if (options.height) params.set('h', options.height.toString())
  if (options.quality) params.set('q', options.quality.toString())
  if (options.format) params.set('f', options.format)
  
  return `https://cdn.example.com/${src}?${params.toString()}`
}

// Usage
getImageUrl('/photos/sunset.jpg', { width: 800, quality: 80, format: 'webp' })
// https://cdn.example.com/photos/sunset.jpg?w=800&q=80&f=webp
```

## JavaScript Optimization

### Debouncing & Throttling

```typescript
// Debounce
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Throttle
function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Usage
const debouncedSearch = debounce((query) => {
  fetchResults(query)
}, 300)

const throttledScroll = throttle(() => {
  updateScrollPosition()
}, 100)
```

### Web Workers

```typescript
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const { data } = e
  
  // Heavy computation
  const result = heavyComputation(data)
  
  self.postMessage(result)
}

// main thread
const worker = new Worker(new URL('./worker.ts', import.meta.url))

function runHeavyTask(data: any): Promise<any> {
  return new Promise((resolve) => {
    worker.onmessage = (e) => resolve(e.data)
    worker.postMessage(data)
  })
}

// React hook
function useWorker<T, R>(workerFn: (data: T) => R) {
  const [result, setResult] = useState<R | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const blob = new Blob([`onmessage = (e) => postMessage((${workerFn.toString()})(e.data))`])
    workerRef.current = new Worker(URL.createObjectURL(blob))
    
    workerRef.current.onmessage = (e) => {
      setResult(e.data)
      setIsLoading(false)
    }
    
    return () => workerRef.current?.terminate()
  }, [workerFn])

  const execute = useCallback((data: T) => {
    setIsLoading(true)
    workerRef.current?.postMessage(data)
  }, [])

  return { result, isLoading, execute }
}
```

### Request Idle Callback

```typescript
// Schedule non-critical work
function scheduleIdleWork(callback: () => void) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback)
  } else {
    setTimeout(callback, 1)
  }
}

// Usage - analytics
scheduleIdleWork(() => {
  sendAnalytics()
})

// React hook
function useIdleCallback(callback: () => void, deps: any[] = []) {
  useEffect(() => {
    const id = requestIdleCallback(callback)
    return () => cancelIdleCallback(id)
  }, deps)
}
```

## Rendering Optimization

### Virtual Lists

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList({ items }: { items: Array<{ id: string; text: string }> }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  })

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {items[virtualRow.index].text}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Memoization Patterns

```tsx
// Memo expensive components
const ExpensiveComponent = memo(function ExpensiveComponent({ data }: { data: ComplexData }) {
  return <div>{/* complex rendering */}</div>
})

// useMemo for expensive calculations
function Dashboard({ orders }: { orders: Order[] }) {
  const stats = useMemo(() => {
    return {
      total: orders.reduce((sum, o) => sum + o.amount, 0),
      average: orders.reduce((sum, o) => sum + o.amount, 0) / orders.length,
      max: Math.max(...orders.map(o => o.amount)),
    }
  }, [orders])
  
  return <StatsDisplay {...stats} />
}

// useCallback for callbacks passed to children
function Parent() {
  const [count, setCount] = useState(0)
  
  const handleClick = useCallback(() => {
    setCount(c => c + 1)
  }, [])
  
  return <Child onClick={handleClick} />
}
```

## Performance Checklist

### Critical Path
- [ ] Inline critical CSS
- [ ] Defer non-critical JavaScript
- [ ] Use async for independent scripts
- [ ] Minimize render-blocking resources
- [ ] Preconnect to required origins
- [ ] Use resource hints (preload, prefetch)

### Images
- [ ] Use modern formats (WebP, AVIF)
- [ ] Lazy load below-fold images
- [ ] Use responsive images (srcset)
- [ ] Optimize image compression
- [ ] Use CDN for image delivery
- [ ] Specify image dimensions

### JavaScript
- [ ] Code split by route
- [ ] Tree shake unused code
- [ ] Minify and compress
- [ ] Use dynamic imports
- [ ] Remove unused dependencies
- [ ] Optimize bundle size

### Caching
- [ ] Set appropriate cache headers
- [ ] Use service worker for offline
- [ ] Implement cache busting
- [ ] Cache API responses
- [ ] Use CDN for static assets

### Rendering
- [ ] Avoid layout thrashing
- [ ] Use CSS transforms for animations
- [ ] Implement virtual scrolling
- [ ] Debounce/throttle handlers
- [ ] Use Web Workers for heavy computation

---
name: seo-optimizer
description: SEO best practices, meta tags, structured data, and optimization
---
# SEO Optimizer

Optimize web applications for search engines with meta tags, structured data, and best practices.

## SEO Checklist

| Category | Items |
|----------|-------|
| **Technical** | Sitemap, robots.txt, HTTPS, speed, mobile-friendly |
| **On-Page** | Title, meta description, headings, images, URLs |
| **Content** | Keywords, quality, freshness, readability |
| **Structured Data** | Schema.org, JSON-LD, rich snippets |

## Meta Tags

### Essential Meta Tags
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Basic -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title | Brand Name (50-60 chars)</title>
  <meta name="description" content="Compelling description of the page content. Keep it between 150-160 characters to avoid truncation in search results.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://example.com/page">
  
  <!-- Language -->
  <link rel="alternate" hreflang="en" href="https://example.com/en/page">
  <link rel="alternate" hreflang="es" href="https://example.com/es/page">
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  
  <!-- Theme -->
  <meta name="theme-color" content="#2563EB">
</head>
</html>
```

### Open Graph (Social Sharing)
```html
<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://example.com/page">
<meta property="og:title" content="Page Title | Brand">
<meta property="og:description" content="Description for social sharing">
<meta property="og:image" content="https://example.com/images/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="Brand Name">
<meta property="og:locale" content="en_US">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@brandname">
<meta name="twitter:creator" content="@author">
<meta name="twitter:title" content="Page Title">
<meta name="twitter:description" content="Description for Twitter">
<meta name="twitter:image" content="https://example.com/images/twitter-card.jpg">
```

### Next.js SEO Component
```tsx
import Head from 'next/head'

interface SEOProps {
  title: string
  description: string
  canonical?: string
  image?: string
  article?: {
    publishedTime?: string
    modifiedTime?: string
    authors?: string[]
    tags?: string[]
  }
}

export function SEO({
  title,
  description,
  canonical,
  image = '/images/og-default.jpg',
  article,
}: SEOProps) {
  const siteName = 'Your Brand'
  const twitterHandle = '@yourbrand'
  const fullTitle = `${title} | ${siteName}`
  const url = canonical || `https://example.com${typeof window !== 'undefined' ? window.location.pathname : ''}`
  const imageUrl = image.startsWith('http') ? image : `https://example.com${image}`

  return (
    <Head>
      {/* Basic */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content={article ? 'article' : 'website'} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Article specific */}
      {article?.publishedTime && (
        <meta property="article:published_time" content={article.publishedTime} />
      )}
      {article?.modifiedTime && (
        <meta property="article:modified_time" content={article.modifiedTime} />
      )}
      {article?.authors?.map((author) => (
        <meta key={author} property="article:author" content={author} />
      ))}
      {article?.tags?.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}
    </Head>
  )
}
```

## Structured Data (JSON-LD)

### Organization Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Company Name",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "description": "Company description",
  "sameAs": [
    "https://twitter.com/company",
    "https://www.linkedin.com/company/company",
    "https://github.com/company"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-555-555-5555",
    "contactType": "customer service",
    "availableLanguage": ["English"]
  }
}
</script>
```

### WebSite Schema (with SearchAction)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Site Name",
  "url": "https://example.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://example.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
</script>
```

### Article Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title",
  "description": "Article description",
  "image": [
    "https://example.com/images/article-16x9.jpg",
    "https://example.com/images/article-4x3.jpg",
    "https://example.com/images/article-1x1.jpg"
  ],
  "datePublished": "2025-01-15T08:00:00+00:00",
  "dateModified": "2025-01-16T09:20:00+00:00",
  "author": [{
    "@type": "Person",
    "name": "Author Name",
    "url": "https://example.com/authors/author-name"
  }],
  "publisher": {
    "@type": "Organization",
    "name": "Publisher Name",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/articles/article-slug"
  }
}
</script>
```

### Product Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": "https://example.com/product.jpg",
  "sku": "SKU-12345",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/product",
    "priceCurrency": "USD",
    "price": "99.99",
    "priceValidUntil": "2025-12-31",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "Store Name"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "128"
  },
  "review": [
    {
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5"
      },
      "author": {
        "@type": "Person",
        "name": "Reviewer Name"
      }
    }
  ]
}
</script>
```

### BreadcrumbList Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Category",
      "item": "https://example.com/category"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Product",
      "item": "https://example.com/category/product"
    }
  ]
}
</script>
```

### FAQ Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is your return policy?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We offer a 30-day return policy for all unused items."
      }
    },
    {
      "@type": "Question",
      "name": "How long does shipping take?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Standard shipping takes 5-7 business days."
      }
    }
  ]
}
</script>
```

### HowTo Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Build a Website",
  "description": "Step-by-step guide to building a website",
  "totalTime": "PT2H",
  "estimatedCost": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": "50"
  },
  "step": [
    {
      "@type": "HowToStep",
      "name": "Choose a domain",
      "text": "Select and register a domain name for your website",
      "position": 1
    },
    {
      "@type": "HowToStep",
      "name": "Choose hosting",
      "text": "Select a web hosting provider",
      "position": 2
    }
  ]
}
</script>
```

## Technical SEO

### Sitemap.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2025-01-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.com/blog</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
```

### Robots.txt
```
# robots.txt
User-agent: *
Allow: /

# Disallow admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /private/

# Sitemap
Sitemap: https://example.com/sitemap.xml

# Crawl-delay (optional)
Crawl-delay: 1
```

### Next.js Sitemap Generation
```typescript
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://example.com'
  
  const posts = await fetch('https://api.example.com/posts').then((res) => res.json())

  const staticPages = [
    '',
    '/about',
    '/blog',
    '/contact',
    '/pricing',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.8,
  }))

  const blogPages = posts.map((post: { slug: string; updatedAt: string }) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...blogPages]
}
```

## On-Page SEO

### Heading Structure
```html
<!-- Good heading hierarchy -->
<h1>Main Page Title (only one per page)</h1>

  <h2>Section Title</h2>
    <h3>Subsection</h3>
    <h3>Subsection</h3>
  
  <h2>Another Section</h2>
    <h3>Subsection</h3>
      <h4>Detail</h4>
    <h3>Subsection</h3>
```

### Image Optimization
```html
<img
  src="/images/product.jpg"
  alt="Descriptive text about the image content"
  width="800"
  height="600"
  loading="lazy"
  decoding="async"
>

<picture>
  <source srcset="/images/hero.webp" type="image/webp">
  <source srcset="/images/hero.jpg" type="image/jpeg">
  <img src="/images/hero.jpg" alt="Hero image" width="1200" height="600">
</picture>
```

### URL Structure
```
✅ Good URLs:
/blog/how-to-build-website
/products/wireless-headphones
/category/electronics/laptops

❌ Bad URLs:
/blog.php?id=123
/p/abc123
/category?cat=5&sub=12
```

### Internal Linking
```html
<!-- Descriptive anchor text -->
<a href="/blog/seo-guide">Complete SEO Guide for Beginners</a>

<!-- Avoid -->
<a href="/blog/seo-guide">click here</a>
<a href="/blog/seo-guide">read more</a>
```

## Performance SEO

### Core Web Vitals Targets
| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | ≤2.5s | 2.5s-4.0s | >4.0s |
| FID (First Input Delay) | ≤100ms | 100-300ms | >300ms |
| CLS (Cumulative Layout Shift) | ≤0.1 | 0.1-0.25 | >0.25 |
| INP (Interaction to Next Paint) | ≤200ms | 200-500ms | >500ms |

### Performance Optimizations
```html
<!-- Preload critical resources -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>

<!-- Preconnect to external domains -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://analytics.google.com">

<!-- Defer non-critical JS -->
<script src="/analytics.js" defer></script>

<!-- Async non-essential scripts -->
<script src="/chat-widget.js" async></script>
```

## React/Next.js SEO Patterns

### Dynamic Meta Tags
```tsx
import { generateMetadata } from 'next'

export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id)
  
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  }
}
```

## SEO Audit Checklist

```
□ Title tag (50-60 chars, unique per page)
□ Meta description (150-160 chars, compelling)
□ Single H1 tag per page
□ Proper heading hierarchy (H1 → H2 → H3)
□ Alt text for all images
□ Canonical URLs
□ Mobile-friendly / responsive
□ HTTPS enabled
□ Fast page load (<3s)
□ No broken links
□ XML sitemap submitted
□ robots.txt configured
□ Structured data (JSON-LD)
□ Open Graph tags
□ Twitter Card tags
□ Internal linking
□ External links (nofollow where appropriate)
□ URL structure (clean, descriptive)
□ No duplicate content
□ 404 page with navigation
```

## Best Practices

### Do's
- Create unique titles/descriptions
- Use semantic HTML
- Optimize images
- Build quality backlinks
- Create valuable content
- Use internal links
- Monitor Core Web Vitals

### Don'ts
- Keyword stuff
- Use duplicate content
- Hide text/links
- Buy backlinks
- Ignore mobile users
- Block CSS/JS in robots.txt
- Use slow hosting

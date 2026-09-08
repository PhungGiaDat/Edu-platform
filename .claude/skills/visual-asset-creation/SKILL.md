---
name: visual-asset-creation
description: Generate favicons, logos, and visual assets with SVG/implementation code
---
# Visual Asset Creation

Generate favicons, logos, icons, and visual assets with SVG code and implementation guides.

## Asset Types

| Type | Sizes | Formats | Use Case |
|------|-------|---------|----------|
| **Favicon** | 16x16 to 512x512 | ICO, PNG, SVG | Browser tabs, bookmarks |
| **Logo** | Vector + raster | SVG, PNG | Branding, headers |
| **App Icon** | Various | PNG, SVG | Mobile, PWA |
| **Social** | Platform-specific | PNG | OG images, sharing |
| **Icons** | 16-64px | SVG, PNG | UI elements |

## Favicon Generation

### SVG Favicon (Recommended)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#2563EB"/>
  <text x="16" y="22" font-family="Arial, sans-serif" font-size="18" 
        font-weight="bold" fill="white" text-anchor="middle">A</text>
</svg>
```

### Multi-size Favicon Set
```svg
<!-- favicon-16x16.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <rect width="16" height="16" rx="3" fill="#2563EB"/>
  <text x="8" y="12" font-family="Arial" font-size="10" 
        font-weight="bold" fill="white" text-anchor="middle">A</text>
</svg>

<!-- favicon-32x32.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#2563EB"/>
  <text x="16" y="23" font-family="Arial" font-size="20" 
        font-weight="bold" fill="white" text-anchor="middle">A</text>
</svg>

<!-- favicon.svg (scalable) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2563EB"/>
  <text x="256" y="360" font-family="Arial" font-size="320" 
        font-weight="bold" fill="white" text-anchor="middle">A</text>
</svg>
```

### HTML Implementation
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
```

### Web Manifest
```json
{
  "name": "App Name",
  "short_name": "App",
  "icons": [
    {
      "src": "/favicon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/favicon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#2563EB",
  "background_color": "#FFFFFF"
}
```

## Logo Templates

### Wordmark Logo
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2563EB"/>
      <stop offset="100%" style="stop-color:#7C3AED"/>
    </linearGradient>
  </defs>
  <text x="0" y="30" font-family="'Inter', Arial, sans-serif" 
        font-size="32" font-weight="700" fill="url(#gradient)">AppName</text>
</svg>
```

### Icon + Text Logo
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 48">
  <!-- Icon -->
  <rect x="4" y="4" width="40" height="40" rx="8" fill="#2563EB"/>
  <path d="M14 24 L22 32 L34 16" stroke="white" stroke-width="4" 
        fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  
  <!-- Text -->
  <text x="56" y="32" font-family="'Inter', Arial, sans-serif" 
        font-size="28" font-weight="600" fill="#1E293B">AppName</text>
</svg>
```

### Abstract Logo
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563EB"/>
      <stop offset="100%" style="stop-color:#7C3AED"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="20" fill="url(#grad1)"/>
  <path d="M16 24 L24 16 L32 24 L24 32 Z" fill="white"/>
</svg>
```

### Lettermark Logo
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7C3AED"/>
      <stop offset="100%" style="stop-color:#2563EB"/>
    </linearGradient>
  </defs>
  <rect width="48" height="48" rx="12" fill="url(#logoGrad)"/>
  <text x="24" y="34" font-family="'Inter', Arial, sans-serif" 
        font-size="28" font-weight="700" fill="white" text-anchor="middle">AB</text>
</svg>
```

## Logo Variants

### Dark Mode Version
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40">
  <style>
    @media (prefers-color-scheme: dark) {
      .logo-text { fill: #FFFFFF; }
    }
  </style>
  <text class="logo-text" x="0" y="30" font-family="Arial" 
        font-size="32" font-weight="700" fill="#1E293B">AppName</text>
</svg>
```

### Monochrome Version
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="12" fill="#000000"/>
  <text x="24" y="34" font-family="Arial" font-size="28" 
        font-weight="700" fill="white" text-anchor="middle">AB</text>
</svg>
```

## Icon Generation

### UI Icon Template
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" 
     width="24" height="24" stroke="currentColor" 
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
     fill="none">
  <!-- Icon path here -->
</svg>
```

### Common Icons

#### Home
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" 
     width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <polyline points="9 22 9 12 15 12 15 22"/>
</svg>
```

#### User
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" 
     width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
</svg>
```

#### Settings
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" 
     width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</svg>
```

#### Search
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" 
     width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="11" cy="11" r="8"/>
  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
</svg>
```

## Color Palettes

### Tech Blue
```
Primary:    #2563EB
Secondary:  #1E40AF
Accent:     #60A5FA
Light:      #DBEAFE
Dark:       #1E3A8A
```

### Modern Purple
```
Primary:    #7C3AED
Secondary:  #5B21B6
Accent:     #A78BFA
Light:      #EDE9FE
Dark:       #3B0764
```

### Fresh Green
```
Primary:    #059669
Secondary:  #047857
Accent:     #34D399
Light:      #D1FAE5
Dark:       #064E3B
```

### Warm Orange
```
Primary:    #EA580C
Secondary:  #C2410C
Accent:     #FB923C
Light:      #FFEDD5
Dark:       #7C2D12
```

### Professional Gray
```
Primary:    #475569
Secondary:  #334155
Accent:     #94A3B8
Light:      #F1F5F9
Dark:       #1E293B
```

## React Component Integration

### Logo Component
```tsx
interface LogoProps {
  variant?: 'full' | 'icon' | 'text'
  size?: 'sm' | 'md' | 'lg'
  theme?: 'light' | 'dark'
}

export function Logo({ variant = 'full', size = 'md', theme = 'light' }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 16 },
    md: { icon: 32, text: 24 },
    lg: { icon: 48, text: 32 },
  }

  const colors = {
    light: { primary: '#2563EB', text: '#1E293B' },
    dark: { primary: '#60A5FA', text: '#FFFFFF' },
  }

  return (
    <svg
      width={variant === 'text' ? 120 : sizes[size].icon}
      height={sizes[size].icon}
      viewBox="0 0 48 48"
    >
      <rect width="48" height="48" rx="12" fill={colors[theme].primary} />
      <text
        x="24"
        y="34"
        fontFamily="Inter, Arial"
        fontSize="28"
        fontWeight="700"
        fill="white"
        textAnchor="middle"
      >
        AB
      </text>
    </svg>
  )
}
```

### Icon Component
```tsx
interface IconProps {
  name: 'home' | 'user' | 'settings' | 'search'
  size?: number
  color?: string
  className?: string
}

const icons = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
}

export function Icon({ name, size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  )
}
```

## Social Media Assets

### Open Graph Image (1200x630)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#2563EB"/>
  
  <!-- Logo -->
  <rect x="80" y="200" width="80" height="80" rx="16" fill="white"/>
  <text x="120" y="260" font-family="Arial" font-size="48" 
        font-weight="bold" fill="#2563EB" text-anchor="middle">AB</text>
  
  <!-- Title -->
  <text x="180" y="260" font-family="Arial" font-size="48" 
        font-weight="bold" fill="white">AppName</text>
  
  <!-- Tagline -->
  <text x="80" y="340" font-family="Arial" font-size="32" fill="#DBEAFE">
    Your tagline goes here
  </text>
  
  <!-- URL -->
  <text x="80" y="550" font-family="Arial" font-size="24" fill="#60A5FA">
    appname.com
  </text>
</svg>
```

### Twitter Card (1200x600)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600">
  <rect width="1200" height="600" fill="#1E293B"/>
  
  <rect x="80" y="180" width="100" height="100" rx="20" fill="#2563EB"/>
  <text x="130" y="250" font-family="Arial" font-size="56" 
        font-weight="bold" fill="white" text-anchor="middle">AB</text>
  
  <text x="200" y="245" font-family="Arial" font-size="56" 
        font-weight="bold" fill="white">AppName</text>
  
  <text x="80" y="340" font-family="Arial" font-size="28" fill="#94A3B8">
    Build something amazing
  </text>
</svg>
```

## Best Practices

### Do's
- Use SVG for scalability
- Provide multiple sizes
- Include dark mode variants
- Optimize SVG paths
- Use consistent styling

### Don'ts
- Use raster for logos
- Ignore dark mode
- Skip accessibility (alt text)
- Overcomplicate designs
- Forget mobile sizes

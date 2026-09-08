---
name: css-styling
description: Tailwind CSS, CSS-in-JS, responsive design, and design system integration
---
# CSS & Styling

Comprehensive patterns for styling modern web applications with Tailwind CSS, CSS-in-JS, and design systems.

## Tailwind CSS

### Configuration Template

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}

export default config
```

### Utility Patterns

```tsx
// cn utility for conditional classes
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  size === 'lg' && 'large-classes'
)} />
```

### Common Component Patterns

```tsx
// Button variants
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-gray-900 text-white hover:bg-gray-800',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        ghost: 'hover:bg-gray-100 hover:text-gray-900',
        link: 'text-blue-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

// Card component
function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
}
```

## Responsive Design

### Breakpoints

```css
/* Tailwind default breakpoints */
sm: 640px   /* @media (min-width: 640px) */
md: 768px   /* @media (min-width: 768px) */
lg: 1024px  /* @media (min-width: 1024px) */
xl: 1280px  /* @media (min-width: 1280px) */
2xl: 1536px /* @media (min-width: 1536px) */
```

### Responsive Patterns

```tsx
// Mobile-first responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

// Responsive typography
<h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold">
  Welcome
</h1>

// Responsive spacing
<section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
  Content
</section>

// Hide/show at breakpoints
<div className="hidden sm:block">Desktop only</div>
<div className="sm:hidden">Mobile only</div>
<div className="hidden md:block lg:hidden">Tablet only</div>

// Responsive flex direction
<div className="flex flex-col lg:flex-row gap-4">
  <aside className="lg:w-64">Sidebar</aside>
  <main className="flex-1">Content</main>
</div>
```

### Container Pattern

```tsx
// Container component
function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
        className
      )}
      {...props}
    />
  )
}

// Container sizes
const containers = {
  sm: 'max-w-screen-sm',    // 640px
  md: 'max-w-screen-md',    // 768px
  lg: 'max-w-screen-lg',    // 1024px
  xl: 'max-w-screen-xl',    // 1280px
  '2xl': 'max-w-screen-2xl', // 1536px
  prose: 'max-w-prose',      // 65ch
}
```

## CSS-in-JS

### Styled Components

```tsx
import styled, { css } from 'styled-components'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  $fullWidth?: boolean
}

const variantStyles = {
  primary: css`
    background: ${({ theme }) => theme.colors.primary};
    color: white;
    &:hover {
      background: ${({ theme }) => theme.colors.primaryHover};
    }
  `,
  secondary: css`
    background: transparent;
    border: 1px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
    &:hover {
      background: ${({ theme }) => theme.colors.backgroundHover};
    }
  `,
  danger: css`
    background: ${({ theme }) => theme.colors.danger};
    color: white;
    &:hover {
      background: ${({ theme }) => theme.colors.dangerHover};
    }
  `,
}

const sizeStyles = {
  sm: css`
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  `,
  md: css`
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  `,
  lg: css`
    padding: 1rem 2rem;
    font-size: 1.125rem;
  `,
}

export const Button = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  width: ${({ $fullWidth }) => $fullWidth ? '100%' : 'auto'};
  
  ${({ variant = 'primary' }) => variantStyles[variant]}
  ${({ size = 'md' }) => sizeStyles[size]}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
```

### Emotion

```tsx
/** @jsxImportSource @emotion/react */
import { css, type Theme } from '@emotion/react'

const buttonStyles = (theme: Theme) => css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  background: ${theme.colors.primary};
  color: white;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: background 0.2s;

  &:hover {
    background: ${theme.colors.primaryHover};
  }
`

function Button({ children }: { children: React.ReactNode }) {
  return <button css={buttonStyles}>{children}</button>
}
```

## Design System Integration

### CSS Variables

```css
/* styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### Theme Configuration

```typescript
// lib/theme.ts
export const theme = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    },
  },
  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },
} as const
```

## Layout Patterns

### Flexbox Utilities

```tsx
// Common flex patterns
<div className="flex items-center gap-4">Horizontal center</div>
<div className="flex items-center justify-between">Space between</div>
<div className="flex flex-col items-center">Vertical center</div>
<div className="flex flex-wrap gap-4">Wrap items</div>
<div className="flex items-stretch">Stretch children</div>

// Flex grow/shrink
<div className="flex">
  <div className="flex-none">Fixed width</div>
  <div className="flex-1">Grow to fill</div>
  <div className="flex-initial">Auto size</div>
</div>
```

### Grid Utilities

```tsx
// Basic grid
<div className="grid grid-cols-3 gap-4">3 columns</div>

// Auto-fit grid
<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
  Responsive grid
</div>

// Grid spans
<div className="grid grid-cols-12 gap-4">
  <div className="col-span-8">Main content</div>
  <div className="col-span-4">Sidebar</div>
</div>

// Grid areas
<div className="grid grid-rows-3 grid-cols-2 gap-4">
  <div className="row-span-2">Spans 2 rows</div>
  <div>Regular</div>
  <div>Regular</div>
</div>
```

### Positioning

```tsx
// Absolute positioning
<div className="relative">
  <div className="absolute inset-0">Cover parent</div>
  <div className="absolute top-0 right-0">Top right</div>
  <div className="absolute bottom-4 left-4">Bottom left</div>
</div>

// Sticky positioning
<div className="sticky top-0">Sticky header</div>

// Fixed positioning
<div className="fixed bottom-4 right-4">Fixed button</div>

// Z-index layers
const layers = {
  'z-0': 0,      // Base
  'z-10': 10,    // Dropdown
  'z-20': 20,    // Sticky
  'z-30': 30,    // Modal backdrop
  'z-40': 40,    // Modal
  'z-50': 50,    // Tooltip
}
```

## Typography

### Font Loading

```tsx
// Next.js font optimization
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

// In layout
<html className={`${inter.variable} ${jetbrainsMono.variable}`}>
```

### Typography Scale

```tsx
// Headings
<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
  Heading 1
</h1>
<h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
  Heading 2
</h2>
<h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
  Heading 3
</h3>
<h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
  Heading 4
</h4>

// Body text
<p className="leading-7 [&:not(:first-child)]:mt-6">
  Body text with proper line height
</p>

// Small text
<p className="text-sm text-muted-foreground">Small muted text</p>

// Lead paragraph
<p className="text-xl text-muted-foreground">
  Lead paragraph for introductions
</p>

// Inline code
<code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
  inline code
</code>
```

## Animations

### Transition Utilities

```tsx
// Basic transitions
<div className="transition">All properties</div>
<div className="transition-colors">Colors only</div>
<div className="transition-opacity">Opacity only</div>
<div className="transition-transform">Transform only</div>

// Duration
<div className="transition duration-150">150ms</div>
<div className="transition duration-300">300ms</div>
<div className="transition duration-500">500ms</div>

// Timing functions
<div className="transition ease-in">Ease in</div>
<div className="transition ease-out">Ease out</div>
<div className="transition ease-in-out">Ease in out</div>
```

### Hover & Focus States

```tsx
// Hover
<button className="bg-blue-500 hover:bg-blue-600 text-white">
  Hover me
</button>

// Focus
<input className="focus:ring-2 focus:ring-blue-500 focus:outline-none" />

// Active
<button className="active:scale-95 transition-transform">
  Click me
</button>

// Group hover
<div className="group">
  <img className="group-hover:scale-110 transition-transform" />
  <p className="group-hover:text-blue-500">Text</p>
</div>

// Peer states
<input className="peer" />
<label className="peer-focus:text-blue-500">Label</label>
```

### Custom Animations

```tsx
// Fade in
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5 }}
/>

// Slide in
<motion.div
  initial={{ x: -100, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 100 }}
/>

// Scale on hover
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
/>

// Stagger children
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }}
>
  {items.map((item) => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
      }}
    />
  ))}
</motion.div>
```

## Dark Mode

### Implementation

```tsx
// Toggle component
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage('theme', 'system')
  
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

// Usage in components
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-white">
    Text adapts to theme
  </p>
</div>
```

## Best Practices

### Do's
- Use design tokens for consistency
- Follow mobile-first approach
- Use semantic HTML
- Ensure color contrast ratios
- Test responsive breakpoints
- Use CSS variables for theming
- Minimize CSS specificity
- Use utility classes for rapid development

### Don'ts
- Don't use inline styles for complex styling
- Don't hardcode colors or spacing
- Don't ignore accessibility
- Don't over-nest selectors
- Don't use !important
- Don't forget print styles
- Don't skip dark mode support

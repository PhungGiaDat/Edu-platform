---
name: a11y-compliance
description: Accessibility patterns, WCAG compliance, and inclusive design
---
# Accessibility Compliance (A11y)

Implement accessible web applications following WCAG guidelines and inclusive design principles.

## WCAG Principles (POUR)

| Principle | Description | Examples |
|-----------|-------------|----------|
| **Perceivable** | Users must perceive content | Alt text, captions, contrast |
| **Operable** | Users must operate interface | Keyboard nav, focus, timing |
| **Understandable** | Users must understand content | Clear language, consistent |
| **Robust** | Content works across technologies | Valid HTML, ARIA |

## WCAG Levels

| Level | Compliance | Requirement |
|-------|------------|-------------|
| **A** | Minimum | Must support |
| **AA** | Standard | Should support (legal requirement in many regions) |
| **AAA** | Enhanced | Nice to have |

## Semantic HTML

### Landmarks
```html
<body>
  <header role="banner">
    <nav role="navigation" aria-label="Main navigation">
      <!-- Navigation links -->
    </nav>
  </header>

  <main role="main">
    <article>
      <h1>Article Title</h1>
      <!-- Content -->
    </article>
    
    <aside role="complementary">
      <!-- Sidebar content -->
    </aside>
  </main>

  <footer role="contentinfo">
    <!-- Footer content -->
  </footer>
</body>
```

### Headings
```html
<h1>Page Title (only one per page)</h1>
  <h2>Major Section</h2>
    <h3>Subsection</h3>
    <h3>Subsection</h3>
  <h2>Another Major Section</h2>
    <h3>Subsection</h3>
      <h4>Detail Level</h4>
```

### Lists
```html
<!-- Unordered -->
<ul>
  <li>Item one</li>
  <li>Item two</li>
</ul>

<!-- Ordered -->
<ol>
  <li>First step</li>
  <li>Second step</li>
</ol>

<!-- Definition -->
<dl>
  <dt>Term</dt>
  <dd>Definition</dd>
</dl>
```

## Keyboard Navigation

### Focus Management
```css
/* Visible focus indicator */
:focus {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}

/* Remove outline only if :focus-visible is supported */
:focus:not(:focus-visible) {
  outline: none;
}

/* Focus visible for keyboard users */
:focus-visible {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}

/* Skip to content link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #2563EB;
  color: white;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### Skip Links
```html
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  
  <header>
    <nav><!-- Navigation --></nav>
  </header>
  
  <main id="main-content">
    <!-- Main content -->
  </main>
</body>
```

### Focus Trap (Modal)
```tsx
import { useEffect, useRef } from 'react'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    previousFocusRef.current = document.activeElement as HTMLElement

    const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(focusableSelector)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    firstElement?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [isActive])

  return containerRef
}
```

## ARIA Patterns

### When to Use ARIA
```
✅ Use ARIA when:
- HTML semantics are insufficient
- Building custom interactive components
- Describing dynamic content updates

❌ Don't use ARIA when:
- Native HTML element works
- ARIA duplicates native semantics
- Adding unnecessary complexity

Rule: No ARIA is better than bad ARIA
```

### Common ARIA Attributes
```html
<!-- Labels -->
<button aria-label="Close menu">×</button>
<nav aria-label="Main navigation"></nav>

<!-- Descriptions -->
<input aria-describedby="password-hint">
<span id="password-hint">Must be 8+ characters</span>

<!-- States -->
<button aria-pressed="true">Toggle</button>
<input aria-invalid="true" aria-errormessage="error">

<!-- Properties -->
<div aria-haspopup="menu">Menu trigger</div>
<div aria-expanded="false">Collapsed content</div>

<!-- Live Regions -->
<div aria-live="polite">Status message</div>
<div aria-live="assertive">Error message</div>
<div aria-live="polite" aria-atomic="true">Counter: 5</div>
```

### Button vs Link
```html
<!-- Button: Action (no URL change) -->
<button onclick="openModal()">Open Modal</button>

<!-- Link: Navigation (URL change) -->
<a href="/about">About Us</a>

<!-- Icon button -->
<button aria-label="Search">
  <svg aria-hidden="true"><!-- icon --></svg>
</button>
```

### Custom Checkbox
```html
<div
  role="checkbox"
  aria-checked="false"
  tabindex="0"
  onclick="toggleCheckbox()"
  onkeydown="handleCheckboxKeydown(event)"
>
  Custom Checkbox
</div>
```

### Disclosure (Show/Hide)
```html
<button
  aria-expanded="false"
  aria-controls="content"
  onclick="toggle()"
>
  Show Details
</button>

<div id="content" hidden>
  Hidden content revealed
</div>
```

### Tabs
```html
<div role="tablist" aria-label="Settings">
  <button
    role="tab"
    aria-selected="true"
    aria-controls="panel-1"
    id="tab-1"
  >
    General
  </button>
  <button
    role="tab"
    aria-selected="false"
    aria-controls="panel-2"
    id="tab-2"
    tabindex="-1"
  >
    Privacy
  </button>
</div>

<div
  role="tabpanel"
  id="panel-1"
  aria-labelledby="tab-1"
>
  General settings content
</div>

<div
  role="tabpanel"
  id="panel-2"
  aria-labelledby="tab-2"
  hidden
>
  Privacy settings content
</div>
```

### Menu
```html
<button
  aria-haspopup="menu"
  aria-expanded="false"
  aria-controls="menu-1"
>
  Options
</button>

<div role="menu" id="menu-1" hidden>
  <button role="menuitem">Edit</button>
  <button role="menuitem">Duplicate</button>
  <div role="separator"></div>
  <button role="menuitem">Delete</button>
</div>
```

### Dialog/Modal
```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
>
  <h2 id="dialog-title">Confirm Action</h2>
  <p id="dialog-desc">Are you sure you want to delete this item?</p>
  <button>Cancel</button>
  <button>Delete</button>
</div>
```

## Forms

### Labels and Inputs
```html
<!-- Explicit label -->
<label for="email">Email Address</label>
<input type="email" id="email" name="email" autocomplete="email">

<!-- Implicit label -->
<label>
  Email Address
  <input type="email" name="email">
</label>

<!-- Required field -->
<label for="name">
  Name
  <span aria-hidden="true">*</span>
</label>
<input 
  type="text" 
  id="name" 
  name="name" 
  required
  aria-required="true"
>
```

### Error Messages
```html
<label for="password">Password</label>
<input
  type="password"
  id="password"
  name="password"
  aria-invalid="true"
  aria-describedby="password-error"
>
<p id="password-error" role="alert">
  Password must be at least 8 characters
</p>
```

### Fieldsets
```html
<fieldset>
  <legend>Shipping Address</legend>
  
  <label for="street">Street</label>
  <input type="text" id="street" name="street">
  
  <label for="city">City</label>
  <input type="text" id="city" name="city">
</fieldset>

<fieldset>
  <legend>Preferred Contact Method</legend>
  
  <input type="radio" id="email-pref" name="contact" value="email">
  <label for="email-pref">Email</label>
  
  <input type="radio" id="phone-pref" name="contact" value="phone">
  <label for="phone-pref">Phone</label>
</fieldset>
```

## Images and Media

### Images
```html
<!-- Informative image -->
<img src="chart.png" alt="Sales increased 25% in Q4 2024">

<!-- Decorative image -->
<img src="decoration.png" alt="" role="presentation">

<!-- Complex image -->
<img src="diagram.png" alt="System architecture diagram" aria-describedby="diagram-desc">
<details id="diagram-desc">
  <summary>Detailed description</summary>
  <!-- Long description -->
</details>

<!-- SVG -->
<svg role="img" aria-label="Company logo">
  <!-- SVG content -->
</svg>
```

### Video
```html
<video controls>
  <source src="video.mp4" type="video/mp4">
  <track kind="captions" src="captions.vtt" srclang="en" label="English" default>
  <track kind="subtitles" src="subtitles.vtt" srclang="es" label="Spanish">
  Your browser does not support video.
</video>
```

### Audio
```html
<audio controls>
  <source src="audio.mp3" type="audio/mpeg">
  <track kind="captions" src="transcript.vtt">
  Your browser does not support audio.
</audio>
```

## Color and Contrast

### Minimum Contrast Ratios
| Text Size | WCAG AA | WCAG AAA |
|-----------|---------|----------|
| Normal text (<18px) | 4.5:1 | 7:1 |
| Large text (≥18px or 14px bold) | 3:1 | 4.5:1 |
| UI components | 3:1 | 3:1 |

### CSS Variables for Contrast
```css
:root {
  --text-primary: #1F2937;
  --text-secondary: #4B5563;
  --text-muted: #6B7280;
  --bg-primary: #FFFFFF;
  --bg-secondary: #F3F4F6;
  --link-color: #2563EB;
  --focus-ring: #2563EB;
  
  --contrast-ratio: 7; /* AAA compliance */
}

@media (prefers-contrast: high) {
  :root {
    --text-primary: #000000;
    --bg-primary: #FFFFFF;
  }
}
```

### Don't Rely on Color Alone
```css
/* Error state with color AND icon */
.input-error {
  border-color: #DC2626;
  background-image: url('error-icon.svg');
  background-repeat: no-repeat;
  background-position: right 8px center;
}

/* Link underline */
a {
  color: #2563EB;
  text-decoration: underline;
}
```

## Motion and Animation

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Or use CSS variables */
:root {
  --transition-duration: 200ms;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --transition-duration: 0ms;
  }
}
```

### No Auto-Play
```html
<!-- Bad: Auto-playing carousel -->
<div class="carousel" data-autoplay>

<!-- Good: User-controlled -->
<div class="carousel">
  <button class="pause-btn">Pause</button>
```

## Screen Reader Testing

### Common Screen Readers
| OS | Screen Reader | Browser |
|----|---------------|---------|
| macOS | VoiceOver | Safari |
| Windows | NVDA | Firefox |
| Windows | JAWS | Chrome |
| iOS | VoiceOver | Safari |
| Android | TalkBack | Chrome |

### Testing Checklist
```
□ All images have appropriate alt text
□ Headings are properly nested
□ Forms have labels and error messages
□ Links have descriptive text
□ Focus is visible
□ Can navigate with keyboard only
□ Screen reader announces page structure
□ Dynamic content is announced
□ No keyboard traps
□ Skip links work
```

## React Accessibility

### Accessible Component Pattern
```tsx
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, loading, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <span className="sr-only" role="status">
            Loading...
          </span>
        )}
        {children}
      </button>
    )
  }
)
```

### Announce Dynamic Content
```tsx
import { useEffect, useState } from 'react'

export function LiveRegion({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="sr-only"
    >
      {message}
    </div>
  )
}

export function useAnnounce() {
  const [announcement, setAnnouncement] = useState('')

  const announce = (message: string) => {
    setAnnouncement('')
    setTimeout(() => setAnnouncement(message), 100)
  }

  return { announcement, announce, LiveRegion }
}
```

## Accessibility Checklist

```
□ Semantic HTML elements used
□ Unique page titles
□ Language attribute on html
□ Proper heading hierarchy
□ Alt text for images
□ Form labels associated
□ Error messages linked to inputs
□ Focus visible on all interactive elements
□ Can tab through all content
□ Skip link provided
□ Color contrast meets WCAG AA
□ Not relying on color alone
□ Links have descriptive text
□ Buttons have accessible names
□ ARIA used appropriately
□ No keyboard traps
□ Reduced motion respected
□ Content readable at 200% zoom
□ Works with screen reader
□ Works without JavaScript (if possible)
```

## Best Practices

### Do's
- Use native HTML elements
- Test with keyboard only
- Test with screen readers
- Write descriptive link text
- Provide error recovery
- Use sufficient contrast
- Support zoom to 200%

### Don'ts
- Remove focus outlines
- Use color alone to convey meaning
- Auto-play media
- Create keyboard traps
- Use placeholder as label
- Hide content with display:none from screen readers
- Rely on JavaScript for core functionality

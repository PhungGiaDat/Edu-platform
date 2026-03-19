# Image Optimization Strategy

## Current State Analysis

### Issues Identified
1. **No lazy loading**: All images load immediately, impacts page speed
2. **No responsive srcset**: Same image size for all devices (wastes bandwidth on mobile)
3. **No format optimization**: No WebP format, no compression
4. **Large bundle**: 810KB Three.js chunk (separate concern, handled later)
5. **No aspect ratio containers**: Causes layout shift (CLS issue)

## Lazy Loading Implementation

### Strategy
Add `loading="lazy"` to all `<img>` tags with offscreen content:
- Hero image: Keep `loading="eager"` (above fold)
- Course cards: Use `loading="lazy"` (below fold)
- Profile images: Use `loading="lazy"`
- Background images: Consider native lazy loading alternatives

### Code Pattern
```html
<!-- Before -->
<img src="image.jpg" alt="description" />

<!-- After -->
<img 
  src="image.jpg" 
  alt="description" 
  loading="lazy"
  decoding="async"
/>
```

## Responsive Srcset Implementation

### Mobile-First Sizes
Define image sizes for each breakpoint:
```html
<img
  srcSet="
    image-320w.jpg 320w,
    image-640w.jpg 640w,
    image-1024w.jpg 1024w,
    image-1280w.jpg 1280w
  "
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 80vw,
    1024px
  "
  src="image-640w.jpg"
  alt="description"
  loading="lazy"
/>
```

### Required Image Sizes
- **320w**: Mobile (375px device - 20px padding)
- **640w**: Large mobile (640px device)
- **1024w**: Tablet
- **1280w**: Desktop
- **1536w**: Ultra-wide (optional)

## WebP Format with Fallback

### Strategy
Use `<picture>` element for modern WebP support:
```html
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <source srcSet="image.jpg" type="image/jpeg" />
  <img src="image.jpg" alt="description" loading="lazy" />
</picture>
```

## Aspect Ratio Containers

### Issue
Images without fixed aspect ratio cause layout shift (CLS metric):
```html
<!-- Bad: Content shifts when image loads -->
<img src="image.jpg" />

<!-- Good: Fixed aspect ratio, no shift -->
<div style="aspectRatio: '16/9'">
  <img src="image.jpg" style="width: 100%; height: 100%; objectFit: cover;" />
</div>
```

## Implementation Priority

### Phase 1: Add Lazy Loading (20 mins)
- Find all `<img>` tags below fold
- Add `loading="lazy"` attribute
- Add `decoding="async"` for performance

### Phase 2: Add Responsive Srcset (1 hour)
- Create image size variants using script
- Update img tags with `srcSet` and `sizes`
- Test across breakpoints

### Phase 3: Add WebP Format (30 mins)
- Convert high-impact images to WebP
- Use `<picture>` element with fallback
- Keep JPEG as fallback for compatibility

### Phase 4: Fix Aspect Ratio Shifts (30 mins)
- Wrap images in aspect ratio containers
- Prevent layout shift (improves CLS)
- Test with DevTools CLS detection

## Performance Impact
- **Lazy loading**: ↓ 20-30% initial page load time
- **Responsive srcset**: ↓ 30-40% mobile bandwidth usage
- **WebP format**: ↓ 25% image file sizes
- **Aspect ratio fix**: ↓ CLS by 0.1-0.2 points

## Next Steps
1. Create responsive image component wrapper
2. Update all `<img>` tags with lazy loading
3. Generate image variants at different sizes
4. Convert high-impact images to WebP
5. Test and measure Core Web Vitals improvements

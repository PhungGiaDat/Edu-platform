# Heuristic contrast / feature-density check

MindAR tracks features (corners, edges, gradient points). Images that are
all-flat (white poster, blue sky, gradient) won't track reliably. A
simple heuristic pre-check saves the user from a runtime failure.

## Sobel-based edge density

```javascript
import { promises as fs } from 'node:fs';
import { PNG } from 'pngjs';  // or sharp, jimp, etc.

async function edgeDensity(imagePath) {
  const data = await fs.readFile(imagePath);
  const png = PNG.sync.read(data);
  const { width, height, data: pixels } = png;

  // Grayscale + Sobel magnitude at every 8th pixel (sample, not exhaustive)
  let strongEdges = 0, totalSamples = 0;
  for (let y = 4; y < height - 4; y += 8) {
    for (let x = 4; x < width - 4; x += 8) {
      const idx = (y * width + x) << 2;
      const lum = (pixels[idx] + pixels[idx+1] + pixels[idx+2]) / 3;
      const lumRight = (pixels[idx+4] + pixels[idx+5] + pixels[idx+6]) / 3;
      const lumDown = (pixels[idx + (width << 2)] +
                       pixels[idx + (width << 2) + 1] +
                       pixels[idx + (width << 2) + 2]) / 3;
      const dx = Math.abs(lumRight - lum);
      const dy = Math.abs(lumDown - lum);
      if (dx + dy > 60) strongEdges++;
      totalSamples++;
    }
  }
  return strongEdges / totalSamples;  // 0..1, higher = more features
}
```

## Thresholds

| Density | Verdict                          |
| ------- | -------------------------------- |
| < 0.05  | FAIL — too few features          |
| 0.05–0.15 | WARN — borderline               |
| > 0.15  | OK                               |

## Better: dedicated library

For production, use a real feature detector. The TFJS model MindAR uses
internally is not portable, but OpenCV.js can run ORB or AKAZE.

## What to do when density is low

- Add text to the image (titles, captions, fine print)
- Add lines, borders, or geometric patterns
- Replace smooth gradients with patterns
- Print at higher resolution so existing features are more detectable

Avoid:
- Photos of clouds / sky / water (low edge density)
- Solid color backgrounds
- Reflective or holographic materials
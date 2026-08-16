# Video codec compatibility

Different browsers and devices support different video codecs. For AR
content, prefer broadly compatible codecs and small file sizes.

## Browser support matrix (2026)

| Codec     | Chrome | Safari | Firefox | Notes                              |
| --------- | ------ | ------ | ------- | ---------------------------------- |
| H.264/AVC | ✅     | ✅     | ✅      | Universal support, larger files    |
| H.265/HEVC| ⚠️     | ✅     | ❌      | Safari + some Android only         |
| VP9       | ✅     | ❌     | ✅      | Open, smaller files, no Safari     |
| AV1       | ✅     | ⚠️     | ✅      | Newest, smallest, growing support  |
| WebM      | ✅     | ❌     | ✅      | Container, often VP9/AV1 inside    |

## Recommended for AR

- **Best compatibility:** H.264 MP4 (`.mp4`) — works everywhere, files
  are slightly larger
- **Best compression (modern browsers):** AV1 MP4 or WebM — ~30% smaller
  at same quality, but check your audience's browsers
- **For Safari iOS:** must use H.264. No AV1/VP9 fallback needed; just H.264
- **Container:** MP4 (`.mp4`) is the safest container; WebM for Firefox

## Encoding recommendations

```
Bitrate:        1-3 Mbps for 720p, 2-5 Mbps for 1080p
Resolution:     720p is sufficient for most AR scenes
Frame rate:     24-30 fps; no benefit to 60fps for AR
Audio codec:    AAC (inside MP4) — universal support
Loop length:    5-15 seconds typical for AR
```

Use `ffmpeg` for encoding:

```bash
ffmpeg -i source.mov -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k \
  -movflags +faststart -vf scale=-2:720 output.mp4
```

The `-movflags +faststart` flag moves metadata to the start of the file,
so the browser can begin playback before the entire file is downloaded.

## Texture vs fullscreen video

- **Video texture on a 3D plane** — the video is part of the 3D scene
  (e.g. cartoon playing on a card). Always use `THREE.VideoTexture`.
- **Fullscreen video behind 3D content** — the video is the background
  and 3D is composited on top. Use `<video>` element with CSS
  `position: absolute`.

For AR use cases, video textures are most common.

## HLS / DASH streaming

For longer videos (>30s), use HLS or DASH with adaptive bitrate:

```javascript
import Hls from 'hls.js';
const video = document.querySelector('#intro-video');
if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource('/stream/intro.m3u8');
  hls.attachMedia(video);
}
```

For AR, HLS usually overkill. Stick to MP4 unless you have a long-form
video use case.

## Preloading

Preload just enough to start playback:

```html
<video preload="auto" ...></video>
```

Or `preload="metadata"` to load only the first frame and duration.
Avoid `preload="none"` — that delays first playback.

## Common mistakes

- **Encoding HEVC for general AR.** iOS Safari handles it, Chrome/Firefox
  won't. Stick with H.264 unless you have iOS-only audience.
- **No `playsinline` attribute.** iOS goes fullscreen by default.
- **No `-movflags +faststart`.** Playback stalls until the file is fully
  downloaded.
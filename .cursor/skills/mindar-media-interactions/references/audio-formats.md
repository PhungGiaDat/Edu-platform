# Audio format compatibility

Browser audio format support in 2026:

| Format | Chrome | Safari | Firefox | Notes                           |
| ------ | ------ | ------ | ------- | ------------------------------- |
| MP3    | ✅     | ✅     | ✅      | Universal; ~128kbps is good     |
| AAC    | ✅     | ✅     | ✅      | Inside MP4; smaller than MP3    |
| OGG    | ✅     | ❌     | ✅      | Open, no Safari                 |
| WAV    | ✅     | ✅     | ✅      | Uncompressed; huge files        |
| FLAC   | ✅     | ✅     | ✅      | Lossless; large                 |

## Recommended

Use **MP3** or **AAC inside MP4** for universal support. AAC at 96-128kbps
is perceptually transparent for voice and SFX.

## Encoding

```bash
# MP3 for universal compatibility
ffmpeg -i source.wav -c:a libmp3lame -b:a 128k output.mp3

# AAC for smaller files (when inside MP4)
ffmpeg -i source.wav -c:a aac -b:a 96k output.m4a
```

## Spatial audio in AR

For 3D positional audio (sound from a tracked object's position):

```javascript
const listener = new THREE.AudioListener();
camera.add(listener);

const sound = new THREE.PositionalAudio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('/assets/sfx.mp3', (buffer) => {
  sound.setBuffer(buffer);
  sound.setRefDistance(0.5);
  sound.setMaxDistance(5);
  anchor.group.add(sound);
});

anchor.onTargetFound = () => {
  if (audioUnlocked) sound.play();
};
```

`setRefDistance` is the distance at which volume = 1.0; `setMaxDistance`
is the distance beyond which volume = 0. Tune both based on your scene.

## User-gesture unlocking

Web browsers (especially iOS Safari) block audio playback without a user
gesture. Unlocking pattern:

```javascript
let audioUnlocked = false;

function unlockAudio() {
  const temp = new Audio('/assets/silent.mp3');
  temp.play().then(() => {
    audioUnlocked = true;
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  }).catch(() => {});
}
document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });
```

The `silent.mp3` should be a real audio file (silent is fine). The
gesture unlocks the AudioContext; subsequent plays work without gesture.

## Common mistakes

- **WAV files in production.** A 30-second WAV is ~5MB; MP3 is ~500KB.
- **No user-gesture unlock.** Audio plays silently on iOS without it.
- **Spatial audio with `THREE.Audio` instead of `THREE.PositionalAudio`.**
  Regular Audio ignores position; PositionalAudio is what you want for AR.
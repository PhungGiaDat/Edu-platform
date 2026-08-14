# MindAR face landmark reference

MindAR exposes individual face landmarks via `mindarFace.addAnchor(landmark)`.
Each anchor has the standard `Object3D` properties and emits the same
`onTargetFound` / `onTargetLost` events as image anchors — useful for
showing/hiding landmark-specific UI.

## Full landmark list

| Landmark       | Position (face units)        | Typical use                          |
| -------------- | ---------------------------- | ------------------------------------ |
| `forehead`     | top center, ~y=0.10          | text labels, headband                |
| `leftEye`      | left eye, ~y=0.04            | eye decoration, eyebrows             |
| `rightEye`     | right eye, ~y=0.04           | eye decoration, eyebrows             |
| `noseBridge`   | top of nose, ~y=0.02         | small decorations, glasses bridge    |
| `noseTip`      | tip of nose, ~y=-0.02        | nose accessory, clown nose           |
| `leftCheek`    | left cheek, ~y=-0.02, x=-0.07 | blush, freckles                      |
| `rightCheek`   | right cheek, ~y=-0.02, x=0.07 | blush, freckles                      |
| `upperLip`     | upper lip, ~y=-0.08          | lip color, mustache                  |
| `lowerLip`     | lower lip, ~y=-0.10          | lip color                            |
| `mouth`        | center mouth, ~y=-0.09       | open-mouth triggers                  |
| `chin`         | bottom of chin, ~y=-0.13     | chin accessory                       |

These are approximations — actual positions depend on the user's face
geometry. Test on multiple faces.

## Coordinate conventions

- **Y axis:** up the face (forehead = +Y, chin = -Y)
- **X axis:** left/right (user's left = -X)
- **Z axis:** forward out of face (toward camera) = +Z
- **Units:** meters, scaled to fit face (~0.18m wide for adult)

A plane at `(0, 0, 0.05)` sits just in front of the nose tip. A plane at
`(0, 0, 0)` sits inside the face plane (use carefully, may clip).

## Detecting open mouth

`anchor.onTargetFound` fires when the mouth is "opened enough" (heuristic
threshold). Use it to trigger speaking animations:

```javascript
const mouth = mindarFace.addAnchor('mouth');
let isOpen = false;
mouth.onTargetFound = () => {
  isOpen = true;
  character.playAnimation('speaking');
};
mouth.onTargetLost = () => {
  isOpen = false;
  character.playAnimation('idle');
};
```

Note: MindAR's mouth detection is approximate. Don't rely on it for
precise speech recognition — only gross animation triggers.

## Updating per frame

For sub-frame precision (e.g. precise eye tracking):

```javascript
const leftEye = mindarFace.addAnchor('leftEye');
mindarFace.onUpdate = () => {
  // leftEye.matrix is current transform
  // leftEye.matrixWorld is in scene-space
};
```

This is more accurate than waiting for edge events.
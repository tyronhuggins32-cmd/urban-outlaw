# Urban Outlaw

A small, playable browser-based 3D game prototype. **Version 0.3** contains a wide, empty grassy field and a custom 3D anime-style ninja character inspired by the supplied reference images. It is a foundation for future game features.

## Play

Open the site when GitHub Pages is enabled, or serve this repository with a small local HTTP server and visit `index.html`.

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Controls

| Device | Move | Look | Jump | Run |
|---|---|---|---|---|
| Keyboard + mouse | WASD / arrows | Drag | Space | Shift |
| Phone or tablet | On-screen joystick | Swipe the world | JUMP | Hold RUN |
| PS5 DualSense (Bluetooth) | Left stick or D-pad | Right stick | Cross (×) | Hold R2, R1, or L3 |

Mouse wheel zooms in and out. Mobile controls are displayed automatically on touchscreen devices. Tap **TOUCH: ON** at the upper right to hide the joystick, jump/run buttons, and touch camera gestures. Tap **TOUCH: OFF** to restore them. The preference is saved for future visits when browser storage is available. When a gamepad is detected, the game displays a controller-connected indicator. On an iPhone, pair the DualSense in iOS Bluetooth settings and press a button once in Safari to let the browser detect it.

## How it works

- One static `index.html` contains the styles, UI, and game code.
- Three.js renders the 3D scene. No 3D models, textures, or game assets need to be downloaded separately.
- The ninja character is modeled procedurally in Three.js with layered spiky hair, a forehead protector, a navy high-collar tunic, fan crest, light shorts, cloth wraps, and sandals. The grass texture is generated in code.
- Movement, sprint, jump animations, mobile controls, and DualSense gamepad support are retained.
- Three.js is loaded from jsDelivr with an unpkg fallback; an internet connection is required for the first load.
- No build step or backend is required.

## GitHub Pages

To make the game playable from a public link: in the repository, open **Settings → Pages**, choose **Deploy from a branch**, then select **main** and **/(root)**, and save. GitHub will provide the playable site URL once deployment succeeds.

This is a starter prototype; additional gameplay and multiplayer are not implemented yet.

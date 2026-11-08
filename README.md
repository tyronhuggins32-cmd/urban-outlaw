# Urban Outlaw

A small, playable browser-based 3D game prototype. **Version 0.1** deliberately contains only a wide, empty grassy field and a classic blocky avatar. It is a foundation for future game features.

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
| Controller (standard gamepad) | Left stick | Right stick | Bottom face button (Cross / A) | Right shoulder trigger |

Mouse wheel zooms in and out. Mobile controls are displayed automatically on touchscreen devices.

## How it works

- One static `index.html` contains the styles, UI, and game code.
- Three.js renders the 3D scene. No 3D models, textures, or game assets need to be downloaded separately.
- The character and grass details are generated in code.
- Three.js is loaded from jsDelivr with an unpkg fallback; an internet connection is required for the first load.
- No build step or backend is required.

## GitHub Pages

To make the game playable from a public link: in the repository, open **Settings → Pages**, choose **Deploy from a branch**, then select **main** and **/(root)**, and save. GitHub will provide the playable site URL once deployment succeeds.

This is a starter prototype; additional gameplay and multiplayer are not implemented yet.

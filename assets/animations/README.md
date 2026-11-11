# Recorded walking motion

Source: PINOC free curated motion library, **Walking**, asset `32d71c7f-e88a-4d1f-9c0c-1fde2da5f060`. This task used the free library clip and charged zero generation credits. The bundled source mannequin is not included here.

`walking-retargeted.json` contains a stable middle stride baked onto the existing Urban Outlaws skeleton. The offline retargeter maps anatomical bone frames to the model's unusual joint axes, preserves neutral sole orientation, fits arm clearance, removes forward root travel and closes the cycle. Runtime movement derives its walking speed from the recorded travel rate and model scale. Sprinting remains 95 world units per second.

To reproduce, obtain the source clip in Mixamo GLB format, install Three.js 0.166.1, and run `node scripts/retarget-walking.cjs SOURCE.glb`. The previous analytical walk is no longer loaded by the game.

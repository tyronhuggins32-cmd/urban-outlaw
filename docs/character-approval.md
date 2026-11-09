# Urban Outlaws character approval gate

**Authoritative design:** the user's supplied "3D Game Character — Model Approval Sheet (Next Stage)" uploaded 2026-11-09. The four independently cropped views are stored at [assets/reference](../assets/reference/). The current procedural model **fails** the intended likeness; it is not an approved final asset.

## Current scope: skin + hair + body, before shirt and shinobi outfit

Reference proportions, front and back views:
- Early-teen (~12–14) male, compact, slim athletic build, head/body ratio approximately 1:6.5, not adult-tall or exaggeratedly bulky.
- Natural shoulders and shoulder blades, continuous upper arms, forearms, hands with recognizable fingers; continuous thighs, knees, calves, ankles, and barefoot toes. **No spheres or hard seams at joints.**
- Soft light skin with warm peach undertones and gentle muscle definition; no grey-olive mannequin shading.
- Mid-thigh neutral gray fitted shorts, waistband and crotch with realistic cloth shape; not a polygonal pelvis guard.
- Face: pointed youthful chin, narrow jaw, straight nose, visible dark eyes and eyebrows, neutral focused expression. Face cannot be a featureless head shell.
- Hair: long sharply layered indigo-black front bangs reaching to the cheek; full swept-back, flattened directional rear spikes; a dark navy hair tie with distinct tails. No short upright spiky crown resembling a hedgehog.
- Dark indigo forehead wrap and silver metal forehead plate with accurate Leaf spiral symbol.
- In neutral stance, hands hang beside upper thighs, legs relaxed with believable ankles/feet.
- Materials should remain readable under game lighting. Need matched front, 3/4, side and back *actual 3D renders*.

## Non-negotiable acceptance tests

1. Real 3D mesh with true depth visible from arbitrary orbit angles, not a photo billboard, silhouette extrusion, or 2.5D multi-image trick.
2. Anatomical surface must not split into mannequin capsules during idle/walk/run/jump. At animation extremes, visually inspect elbows, knees, shoulders and waist.
3. Skin, eyes, hair, headband, shorts should be on geometry, with appropriate material slots and head-mounted hair.
4. Proportions should be checked against **each** of the four reference crops, using a fixed perspective or orthographic matching camera. Compare head height, shoulder width, torso/leg length, hair outline and feet.
5. Quality check includes character at screen-normal game distance and close range, on mobile, plus at least four orthographic character captures. A browser smoke test alone is **not** proof of likeness.
6. Do not call model exact/approved until the user explicitly accepts the actual 3D model in screenshots.

## Image sources

- [hero](../assets/reference/hero.jpg)
- [front](../assets/reference/front.jpg)
- [side](../assets/reference/side.jpg)
- [back](../assets/reference/back.jpg)
- [face](../assets/reference/face.jpg)

## Version tracking

- 1.0 baseline: 80 separate geometric parts; segmented shoulders/knees, simple face, top-spike hair. **Rejected visually** by the user.
- Follow-up: replace geometry with a contiguous sculpt and quality-checked rig, while preserving keyboard, touch and DualSense input; verify visual likeness before promoting as default avatar.

# V5 reference reconstruction: isolated art workspace

**Status: REJECTED / NOT READY FOR GAME.**

The live player on \`main\` is intentionally unchanged by this branch. The previous Build 8.2 outfit fails the supplied model approval sheet. Do not merge, deploy or present a candidate as finished just because the animation rig and geometry tests pass.

## Different modeling route

The earlier attempts created shirts and shorts with concentric procedural cylinder shells and disconnected attachments. That repeatedly produced rigid shoulder contours, puffy/box-shaped legs, inaccurate folds, and clipping. Those components are **not** the basis of this reconstruction.

This branch uses an actual DCC-authored, sculpted garment asset: a high-collar navy shirt with real tailored sleeves and waist drape, and two anatomically separate light-gray shorts legs with proper crotch, side seams, pockets, navy thigh bands and pouch. It must be hand-shaped against the front, side, back and 3/4 images, with fabric normals and a full back fan emblem. Only then is it skin-weighted to the original 44-joint Urban Outlaw body.

The source \`art/v5/source/clothes-sculpt.glb\` must contain seven named garment meshes (see \`tools/blender/rig_v5_garments.py\`). The script transfers interpolated rig weights and renders standard views; it **does not create a finished sculpt from a text description**.

The importer \`scripts/import-sculpted-v5-outfit.js\` validates candidate mesh names, source skeleton bone names, bind poses, UV coordinates and normalized weights before mounting anything. It is review-only and never hides the main outfit or publishes a model.

## Pass/fail standard

A candidate needs orthographic *front, side, back and three-quarter* views matched to the reference at equal character height, along with *guard, jab, kick and ninja-run* deformation checks. The approval contract in \`art/v5/approval-contract.json\` records what each view needs to match. A correct skeleton is necessary but cannot substitute for an accurate shirt/shorts silhouette, details, color, fabric folds or crest.

\`node tests/v5-approval-gate.cjs\` rejects release until source art, rigged GLB, image proofs and signed visual checks all exist and pass. The branch GitHub Actions workflow runs the gate independently of game deployment.

**Do not change \`main\` or ask the player to try this version until this gate has actually passed.**

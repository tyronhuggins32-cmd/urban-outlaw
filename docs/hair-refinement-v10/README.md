# V10 visible hair reshape

These front, hero, side and back images are offline renders of the actual assembled mesh.

V9 was deployed correctly, but its changes were too subtle in gameplay. V10 narrows the upper crown by 21% (vertices above 1.45 m), lowers the rear outline, pulls the bangs inward around the face and tapers the nape. The largest V9-to-V10 source vertex adjustment is 57.2 mm. The source layered topology and the one separate hair surface are retained. The face, plate, emblem and skinned body are unchanged.

A small embedded tangent-space normal texture supplies fine directional strand shading through a separate UV set. The original color atlas UVs remain intact and share the body texture at runtime. The bow and inner cap sample flat normals.

Rebuild: `python3 scripts/extract-reference-hair.py --reference-shape`. Add `--embed-texture --out model.glb` for a standalone textured export. No paid generation was used. Head-fit, visible face preservation, recorded walk grounding/clearance and ninja-run checks pass. Facial likeness and sculpted strand detail still differ from the reference; this is not an exact recreation claim.

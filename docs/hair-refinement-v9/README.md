# V9 reference refinement

Actual assembled mesh renders: [front](front.jpg), [three-quarter](hero.jpg), [side](side.jpg), [back](back.jpg). These are offline Blender renders, not live gameplay captures or generated concept images.

This pass refines the accepted V8 sculpt: a lower, slightly narrower crown swept farther back, limited smoothing of the broad front curtain surfaces, tidier nape ends, more compact blue tie tails, and a subtly cooler hair material. The one separate hair surface, UVs, topology, forehead plate, engraving, original face, and body rig are retained. Maximum source vertex displacement is 18.85 mm. Fine strand detail and facial likeness remain below the reference sheet.

Rebuild: `python3 scripts/extract-reference-hair.py --refine`. For standalone offline viewing, add `--embed-texture --out model.glb`; the runtime accessory shares the avatar atlas through the installer.

Validation: head attachment/visible face preservation, recorded walk data/sprint speed, deformed foot ground contact, hand clearance, and hand/leg mesh separation pass. Offline comparison confirms identical triangle indices, UVs, vertex tints, plate and engraving relative to V8. Browser GPU rendering is unavailable in this environment, so these checks do not establish live iPhone visual quality. Browser CI is configured to load V9.

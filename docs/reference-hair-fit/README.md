# Reference hair fit

These are renders of the actual assembled mesh, not generated design images. The replacement separates the original avatar's layered hair surfaces into one hair mesh, retains their UV detail, lowers and sweeps the crown back, fills rear gaps, and corrects misplaced skin-colored paint through hair-only vertex tinting. The forehead protector has a fitted curved metal surface and dimensional dark emblem. The body face and ears remain the original sculpt.

The accessory uses avatar bind-space coordinates and attaches directly to the head bone. There is no guessed 1.49 m mount offset. Legacy hair is classified offline and removed from the body's index buffer; every retained face/body vertex, normal, UV and skin weight is unchanged. The avatar atlas is shared at runtime to avoid a duplicate GPU texture. The lightweight accessory therefore uses its original UVs with the body atlas supplied by the installer; add `--embed-texture` to the rebuild command when a standalone textured GLB is needed.

`node tests/head-fit.cjs` verifies source compatibility, retained facial triangles and vertices, three accessory draw groups with exactly one hair surface mesh, fitted bounds, and stable attachment during head rotation. The recorded walk, hand-clearance and deformed foot-contact tests also pass. The face sculpt and fine strand detail remain less detailed than the supplied reference; these renders are not a claim of exact likeness.

Rebuild the accessory and cleanup ranges with `python3 scripts/extract-reference-hair.py` (NumPy and Pillow). No paid generation was used.

# Urban Outlaw V5: strict shirt approval checklist

**Status: REJECTED, NOT RELEASED.** Baseline: latest exported full-character candidate from development run 43446454968 using GLB fingerprint `9951174f9cdffd305a3b062279d78497197f0b75f251e0a5fe0ebd061fc0729a`. Evaluated using the two user-supplied *final* shirt close-ups. Both are screenshot references, **not** a license to call this artifact approved simply because it exported.

**Current tally:** 3 pass, 15 fail, 2 without complete visual evidence. Release requires **20/20 PASS** with matched views, independent actual pose renders and signed candidate-specific evidence. No weighted score, average rating, or partial credit.

**Source-of-truth:** Front image `8EB7F32A-3C38-4E2A-83DD-613F58905D5F.jpeg` (SHA-256: `c67b969ccb0ff5fd8f5c0f58d5babaf2ec3863abff3e59049687d1c25b4a0c38`). Back image `BBD3AE08-92F5-42D3-9D0B-E9F497578130.jpeg` (SHA-256: `742ebc9e02210ecc739dfdfad10d6324fd40d0be2424a4a06ea6a8e9cfa20de7`). Full V5 model approval sheet remains the source for the shorts, hair, wraps, proportions and whole character.

**Latest technical run:** [Blender + Three.js full-rig tests passed](https://github.com/tyronhuggins32-cmd/urban-outlaw/actions/runs/43446454968). The five garment meshes share the original 44-bone skeleton, and six action screenshots exist. The character still fails visual fidelity, particularly the collar, shoulder slopes, sleeve fabric and gathered hem. An in-game playable deployment was **not** performed.

## Mandatory acceptance criteria

| ID | Current | What must match | Correction still required |
| --- | --- | --- | --- |
| F01 | **FAIL** | High, soft standing collar, folded at throat, below mouth; clean non-tubular opening. | Resculpt curved folded lip, lower the front and preserve face clearance. |
| F02 | **FAIL** | Rounded natural shoulder slope flows continuously into both short sleeves. | Reshape the garment shoulder silhouette and armhole transition. |
| F03 | **FAIL** | Short relaxed sleeves match reference length and slight flare; hems visible above elbows. | Extend relaxed sleeve fabric to reference length; form gentle continuous opening. |
| F04 | **FAIL** | Relaxed navy cotton torso: gently tapered at waist, not straight barrel or rigid rectangular slab. | Rework torso circumference and fabric drape. |
| F05 | **FAIL** | At least three naturally asymmetric folds above gathered waistband, with plausible shaded depth. | Sculpt loose waist folds with actual geometric depth and soft light response. |
| F06 | **FAIL** | Hem has folded-over edge and softly gathered volume, overlaps gray shorts waistband naturally. | Tailor soft double hem and remove hard sheet edge. |
| F07 | **FAIL** | Fabric is dark muted navy with subtle knit texture, rough cotton finish. | Match material and roughness under consistent lighting. |
| F08 | **PASS** | Unbroken plain navy front; no fan crest, graphic or pink texture bleed. | Keep front unprinted. |
| B01 | **FAIL** | Standing collar curves around the neck at correct width, no overlap with tied hair. | Sculpt tapered layered cloth collar around neck. |
| B02 | **FAIL** | Full Uchiha fan, red rounded upper cap, white shallow lower bowl, straight centered white handle, dark clean divider. | Correct entire fan geometry and white lower fan shape. |
| B03 | **FAIL** | Fan center aligns with spine, sits between shoulder blades and occupies about one-third of shirt width (visual range 0.33–0.42). | Enlarge crest, preserve centered placement. |
| B04 | **FAIL** | Smooth shoulders and relaxed sleeves repeat front proportions; hem and seam flow remain symmetric. | Rework sewn shoulder slope and cuffs from back view. |
| B05 | **FAIL** | Subtle fabric folds gather in lower back and hem; natural cotton shading. | Resculpt soft hanging back fabric and hem. |
| B06 | **UNVERIFIED** | Logo is flush on deforming fabric, not a floating badge; warps naturally with cloth. | Render logo under torso twist and check texture deformation. |
| D01 | **FAIL** | No exposed shoulder skin, disconnected sleeve islands, or armhole spikes in guard and jab. | Inspect whole upper shoulder rather than one small pixel box; repair sleeve silhouette. |
| D02 | **FAIL** | Fabric sleeves follow upper arm without implausible torsion or collapse when attacking. | Inspect shoulder continuity under guard and jab at multiple angles. |
| D03 | **PASS** | All garment vertices properly weighted to original 44-bone skeleton, continuous torso-and-sleeves mesh and valid normals/UVs. | Retest whenever model source changes. |
| D04 | **UNVERIFIED** | New garment still maintains silhouette and no clipping through representative movement frames. | Produce those four pose render sequences and inspect clipping. |
| P01 | **FAIL** | Candidate reviewed in matched front/back/side/3-4 framing and all required animation proofs before any merge. | Generate aligned source/render comparisons and all required combat views. |
| P02 | **PASS** | Main branch is untouched until the actual candidate hash is signed off and every listed blocker passes. | Continue isolating all iterations and block release until accepted. |

## Decision rules

1. **No deployment on technical tests alone.** Skinned mesh counts, vertex continuity and screenshot existence are prerequisites but never prove visual equivalence.
2. Every check must have a direct image or model/proof reference and status `PASS`. `UNVERIFIED` blocks as surely as `FAIL`.
3. Front and back references must be displayed adjacent to the candidate at aligned subject height, scale and pose. Inspect collar, sleeve opening, torso taper, hem, and fan individually.
4. Test non-idle movement: guard, jab, cross, kick, dodge and ninja-run. A collapsed sleeve, exposed skin or waistband breakthrough is an automatic rejection.
5. Bind visual signoff to the *exact* SHA-256 of the GLB and both close-up files. A subsequent model change invalidates earlier approval.
6. Keep `main` and the playable Build 8.2 unchanged until a new candidate meets all requirements and is separately authorized for integration.

To see the current audit without changing release state:
```sh
node tests/v5-shirt-approval-gate.cjs --audit
```
To test whether the release gate is actually open (expected to **fail** on current work):
```sh
node tests/v5-shirt-approval-gate.cjs --require-pass
```

The candidate model is **not yet correct**. This record describes factual observed differences rather than pretending a QA label can repair geometry.

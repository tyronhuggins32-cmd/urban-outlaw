"""Extract the four clean orthographic character references from a user-provided design sheet.
Runs on GitHub Actions. Do not substitute these views for independent 3D validation.
"""
import io, os
from pathlib import Path
from urllib.request import urlopen
from PIL import Image

source = os.environ["NINJA_REFERENCE_SOURCE_URL"]
data = urlopen(source, timeout=40).read()
im = Image.open(io.BytesIO(data)).convert("RGB")
assert im.width == 1448 and im.height == 1086, f"Unexpected reference sheet: {im.size}"
dest=Path("assets/reference");dest.mkdir(parents=True,exist_ok=True)
# Artboard cropping only; the four original views are all from the supplied approval sheet.
for name, box in {
    "hero": (82, 50, 344, 685),
    "front": (422, 82, 601, 662),
    "side": (674, 77, 824, 665),
    "back": (898, 75, 1049, 661),
    "face": (15, 779, 204, 1008),
}.items():
    out=im.crop(box)
    out.save(dest/f"{name}.jpg",quality=94,subsampling=0)
    print(name,box,out.size)

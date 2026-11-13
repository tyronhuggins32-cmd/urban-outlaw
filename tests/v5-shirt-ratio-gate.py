"""V5 visual silhouette gate without uploading user's private source photos.

Target ratios were measured once, locally, from user's exact final shirt
close-ups (SHA-256 values recorded in shirt-approval-criteria.json).
Neither source photo is included in this public repository. All ratios are
measurements of shirt width divided by shirt height in aligned front/back
views, not an assertion that matching a ratio proves visual equivalence.
"""
from pathlib import Path
from PIL import Image
import json,math,sys

TARGET={"front":0.885,"back":0.895}
# Relative 8% difference: still quite tolerant; human art signoff is stricter.
TOLERANCE=.08

def silhouette(path):
    im=Image.open(path).convert("RGB")
    w,h=im.size
    xs=[];ys=[]
    for y in range(round(.32*h),min(h,round(.77*h))):
        for x in range(round(.04*w),round(.96*w)):
            r,g,b=im.getpixel((x,y))
            if b>r*1.22 and b>g*1.08 and r<125 and g<130 and b<175:
                xs.append(x);ys.append(y)
    if not xs or len(xs)<20000:raise RuntimeError("Cannot segment shirt in "+str(path))
    ww=max(xs)-min(xs)+1;hh=max(ys)-min(ys)+1
    return {"width":ww,"height":hh,"ratio":ww/hh,"bbox":[min(xs),min(ys),max(xs),max(ys)]}

def main():
    out=Path("art/v5/generated")
    report={}
    for view in TARGET:
        m=silhouette(out/("shirt_"+view+".png"))
        m["target_ratio"]=TARGET[view]
        m["relative_error"]=abs(m["ratio"]-TARGET[view])/TARGET[view]
        m["pass"]=m["relative_error"]<=TOLERANCE
        report[view]=m
    report["status"]="PASS_SILHOUETTE_ONLY" if all(x["pass"] for x in report.values()) else "FAIL_REFERENCE_SILHOUETTE"
    report["release_permitted"]=False
    dest=out/"shirt-silhouette-qa.json"
    dest.write_text(json.dumps(report,indent=2)+"\n")
    print("V5_SHIRT_SILHOUETTE",json.dumps(report))
    if report["status"]!="PASS_SILHOUETTE_ONLY":
        raise SystemExit("Reference garment width/height ratio does not match final close-ups")

if __name__=="__main__":
    main()

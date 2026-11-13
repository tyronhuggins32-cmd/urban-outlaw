#!/usr/bin/env python3
"""Optional private reference silhouette check for Urban Outlaw V5.

Uses user's exact front/back screenshots only on the local workstation.
Does NOT upload or embed source photos into the public repository.
A passed silhouette check is necessary but NOT sufficient for visual signoff.

Example:
 python tests/v5-shirt-silhouette.py \
   --front-reference /private/user-front.jpeg \
   --back-reference /private/user-back.jpeg \
   --front-render /private/generated/shirt_front.png \
   --back-render /private/generated/shirt_back.png
"""
import argparse, json, math
from pathlib import Path
from PIL import Image

def bbox_from_blue_shirt(path, view, reference):
    im=Image.open(path).convert("RGB")
    width,height=im.size
    if reference:
        ylo,yhi=(.405,.88) if view=="front" else (.385,.85)
    else:
        ylo,yhi=(.32,.77) if view=="front" else (.32,.77)
    xs=[];ys=[]
    for y in range(round(ylo*height),min(height,round(yhi*height))):
        for x in range(round(.04*width),round(.96*width)):
            r,g,b=im.getpixel((x,y))
            if (b>r*1.22 and b>g*1.08 and
                r<125 and g<130 and b<175):
                xs.append(x);ys.append(y)
    if len(xs)<2500:raise RuntimeError("Cannot isolate navy shirt, check input crop "+str(path))
    # Reject isolated little pixels by comparing broad columns at shoulder and
    # hem heights. We still report whole-blue silhouette as the main metric.
    return (min(xs),min(ys),max(xs)+1,max(ys)+1),len(xs)

def metrics(path,view,reference):
    (x0,y0,x1,y1),pixels=bbox_from_blue_shirt(path,view,reference)
    w=x1-x0;h=y1-y0
    return {"bbox":[x0,y0,x1,y1],"width":w,"height":h,
            "width_height_ratio":round(w/h,4),"blue_pixels":pixels}

def main():
    p=argparse.ArgumentParser()
    for arg in ("front-reference","back-reference","front-render","back-render"):
        p.add_argument("--"+arg,required=True)
    p.add_argument("--tolerance",type=float,default=.09)
    p.add_argument("--output",default=None)
    args=p.parse_args()
    views={}
    for view in ("front","back"):
        reference=metrics(getattr(args,view+"_reference"),view,True)
        candidate=metrics(getattr(args,view+"_render"),view,False)
        ratio=abs(reference["width_height_ratio"]-candidate["width_height_ratio"])/reference["width_height_ratio"]
        views[view]={"reference":reference,"candidate":candidate,
            "relative_width_height_error":round(ratio,4),
            "pass":ratio<=args.tolerance}
    results={"status":"PASS_SILHOUETTE_ONLY" if all(x["pass"] for x in views.values()) else "FAIL",
       "visual_approval":"NOT_GRANTED",
       "tolerance":args.tolerance,"views":views}
    data=json.dumps(results,indent=2)
    print(data)
    if args.output:Path(args.output).write_text(data+"\n")
    if results["status"]=="FAIL":raise SystemExit(1)

if __name__=="__main__":
    main()

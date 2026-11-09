#!/usr/bin/env python3
"""Urban Outlaw: free, reproducible blank early-teen body GLB.
Y-up, +Z forward, 1.73m, articulated node hierarchy, 4 baked glTF clips.
No hair, facial features or clothes. Every piece is a separate editable mesh.
Run: python3 scripts/build_blank_body.py [output.glb]
"""
import json
import math
import struct
import sys
from pathlib import Path

output = Path(sys.argv[1] if len(sys.argv) > 1 else "assets/blank-body.glb")
output.parent.mkdir(parents=True, exist_ok=True)
g = {"asset":{"version":"2.0","generator":"Urban Outlaw Body Builder 1"},
     "scene":0,"scenes":[{"name":"Blank Body", "nodes":[0]}],
     "nodes":[],"meshes":[],"materials":[],"accessors":[],"bufferViews":[],
     "buffers":[],"animations":[]}
data = bytearray()

def acc(values, typ="f", width=3, target=None, bounds=False):
    flat = [x for item in values for x in (item if isinstance(item,(tuple,list)) else [item])]
    while len(data)%4: data.append(0)
    start = len(data)
    data.extend(struct.pack("<"+typ*len(flat),*flat))
    view={"buffer":0,"byteOffset":start,"byteLength":len(data)-start}
    if target: view["target"]=target
    idx=len(g["bufferViews"]);g["bufferViews"].append(view)
    a={"bufferView":idx,"componentType":{"f":5126,"I":5125}[typ],
       "count":len(values),"type":{1:"SCALAR",3:"VEC3",4:"VEC4"}[width]}
    if bounds:
        a["min"]=[min((v if width==1 else v[k]) for v in values) for k in range(width)]
        a["max"]=[max((v if width==1 else v[k]) for v in values) for k in range(width)]
    idx=len(g["accessors"]);g["accessors"].append(a);return idx

def mat(name,color):
    i=len(g["materials"])
    g["materials"].append({"name":name,
       "pbrMetallicRoughness":{"baseColorFactor":[*color,1.0],
       "metallicFactor":0,"roughnessFactor":0.83},"doubleSided":True})
    return i
BODY=mat("Neutral gray body",(.705,.727,.767))
JOINT=mat("Soft joint gray",(.695,.712,.742))
FACE=mat("Featureless head gray",(.739,.758,.787))

def node(name,position,parent=None):
    i=len(g["nodes"])
    g["nodes"].append({"name":name,"translation":[round(c,6) for c in position]})
    if parent is not None:g["nodes"][parent].setdefault("children",[]).append(i)
    return i

joints={"BodyRoot":(node("BodyRoot",(0,0,0)),(0,0,0))}
def joint(name,xyz,parent):
    p,prev=joints[parent]
    rel=tuple(xyz[k]-prev[k] for k in range(3))
    joints[name]=(node(name,rel,p),xyz)

joint("Hips",(0,1.0,0),"BodyRoot")
joint("Spine",(0,1.18,0),"Hips")
joint("Neck",(0,1.44,0),"Spine")
joint("Head",(0,1.49,0),"Neck")
for side,s in (("L",-1),("R",1)):
    joint("Shoulder."+side,(s*.185,1.355,0),"Spine")
    joint("UpperArm."+side,(s*.194,1.348,0),"Shoulder."+side)
    joint("Forearm."+side,(s*.246,1.125,0),"UpperArm."+side)
    joint("Hand."+side,(s*.262,.938,.005),"Forearm."+side)
    joint("UpperLeg."+side,(s*.101,.972,0),"Hips")
    joint("LowerLeg."+side,(s*.121,.548,.006),"UpperLeg."+side)
    joint("Foot."+side,(s*.125,.135,.015),"LowerLeg."+side)

def mesh(name,points,faces,bone,material):
    root,origin=joints[bone]
    pts=[(x-origin[0],y-origin[1],z-origin[2]) for x,y,z in points]
    norms=[[0.,0.,0.] for _ in pts]
    for a,b,c in faces:
        u=[pts[b][k]-pts[a][k] for k in range(3)]
        v=[pts[c][k]-pts[a][k] for k in range(3)]
        cross=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
        for i in (a,b,c):
            for k in range(3):norms[i][k]+=cross[k]
    normals=[]
    for n in norms:
        m=math.sqrt(sum(v*v for v in n)) or 1
        normals.append(tuple(v/m for v in n))
    primitive={"attributes":{"POSITION":acc(pts,bounds=True,target=34962),
                             "NORMAL":acc(normals,target=34962)},
               "indices":acc([v for face in faces for v in face],"I",1,target=34963),
               "material":material}
    index=len(g["meshes"])
    g["meshes"].append({"name":name,"primitives":[primitive]})
    ni=node(name+".geometry",(0,0,0),root)
    g["nodes"][ni]["mesh"]=index

def smooth(rows,steps=6):
    # Editable silhouette stations: (height,x,z,width radius,depth radius).
    stations=[]
    for i in range(len(rows)-1):
        for k in range(steps):
            t=k/steps
            r=[]
            for j in range(5):
                a,b=rows[i][j],rows[i+1][j]
                prev=rows[max(0,i-1)][j]; nxt=rows[min(len(rows)-1,i+2)][j]
                v=(2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*(b-prev)/2
                v+=(-2*t**3+3*t*t)*b+(t**3-t*t)*(nxt-a)/2
                r.append(max(.0015,v) if j>=3 else v)
            stations.append(r)
    stations.append(list(rows[-1]));return stations

def loft(name,profile,bone,material=BODY,sides=44,steps=6):
    rings=smooth(profile,steps);points=[]
    for y,x,z,rx,rz in rings:
        for i in range(sides):
            a=math.tau*i/sides
            points.append((x+rx*math.cos(a),y,z+rz*math.sin(a)))
    faces=[]
    for j in range(len(rings)-1):
        for i in range(sides):
            a=j*sides+i;b=j*sides+(i+1)%sides
            c=(j+1)*sides+i;d=(j+1)*sides+(i+1)%sides
            faces.extend([(a,c,b),(c,d,b)])
    mesh(name,points,faces,bone,material)

def oval(name,pos,radii,bone,material=BODY,lats=20,sides=32):
    points=[];faces=[]
    for y in range(lats+1):
        polar=math.pi*y/lats
        for i in range(sides):
            a=math.tau*i/sides
            points.append((pos[0]+radii[0]*math.sin(polar)*math.cos(a),
                           pos[1]+radii[1]*math.cos(polar),
                           pos[2]+radii[2]*math.sin(polar)*math.sin(a)))
    for y in range(lats):
        for i in range(sides):
            a=y*sides+i;b=y*sides+(i+1)%sides
            c=(y+1)*sides+i;d=(y+1)*sides+(i+1)%sides
            faces.extend([(a,b,c),(b,d,c)])
    mesh(name,points,faces,bone,material)

# Blank gray silhouette follows the six-and-a-half-head youthful reference.
loft("Pelvis",[(.925,0,0,.036,.054),(.955,0,0,.092,.077),(1.,0,0,.139,.092),
              (1.055,0,0,.139,.085),(1.12,0,0,.117,.074)],"Hips",steps=7)
loft("Torso",[(1.09,0,0,.096,.062),(1.17,0,0,.110,.069),(1.25,0,0,.135,.076),
              (1.32,0,0,.161,.080),(1.365,0,0,.174,.079),
              (1.40,0,0,.161,.070),(1.43,0,0,.066,.049)],"Spine",steps=8)
oval("Neck volume",(0,1.449,0),(.045,.078,.045),"Neck",JOINT)
loft("Blank face and skull",[(1.486,0,.018,.032,.041),(1.505,0,.013,.056,.056),
      (1.535,0,.006,.074,.069),(1.565,0,0,.091,.084),
      (1.608,0,-.003,.100,.092),(1.654,0,-.008,.093,.083),
      (1.695,0,-.012,.075,.071),(1.723,0,-.012,.045,.045),
      (1.731,0,-.012,.003,.003)],"Head",FACE,sides=52,steps=7)

for side,s in (("L",-1),("R",1)):
    oval("Ear."+side,(s*.097,1.601,0),(.016,.036,.023),"Head",FACE)
    oval("Shoulder."+side,(s*.187,1.349,0),(.061,.056,.069),"Shoulder."+side,JOINT)
    loft("Upper arm."+side,[(1.117,s*.246,-.004,.031,.033),
      (1.157,s*.241,0,.043,.047),(1.213,s*.229,0,.051,.051),
      (1.281,s*.214,0,.058,.059),(1.348,s*.194,0,.058,.061)],
      "UpperArm."+side,steps=7)
    oval("Elbow."+side,(s*.246,1.125,0),(.040,.045,.039),"Forearm."+side,JOINT)
    loft("Forearm."+side,[(.935,s*.263,.006,.029,.030),(.977,s*.261,0,.036,.037),
      (1.042,s*.251,0,.047,.046),(1.095,s*.249,0,.041,.041),
      (1.126,s*.246,0,.038,.039)],"Forearm."+side,steps=8)
    oval("Blank fist."+side,(s*.265,.896,.012),(.033,.051,.026),"Hand."+side,FACE)
    oval("Thumb."+side,(s*.291,.905,.025),(.014,.027,.021),
         "Hand."+side,FACE,lats=14,sides=20)
    loft("Thigh."+side,[(.540,s*.123,.007,.047,.048),(.601,s*.123,.011,.059,.057),
       (.690,s*.112,.011,.074,.070),(.776,s*.107,.009,.083,.079),
       (.871,s*.102,.004,.086,.081),(.967,s*.101,0,.072,.077)],
       "UpperLeg."+side,sides=48,steps=8)
    oval("Knee."+side,(s*.122,.551,.011),(.048,.049,.052),"LowerLeg."+side,JOINT)
    loft("Calf."+side,[(.127,s*.124,.013,.029,.032),(.179,s*.124,.007,.035,.038),
       (.260,s*.122,0,.049,.051),(.346,s*.121,0,.054,.051),
       (.430,s*.121,.003,.046,.045),(.520,s*.121,.007,.045,.047)],
       "LowerLeg."+side,steps=7)
    oval("Heel."+side,(s*.125,.100,0),(.043,.079,.051),"Foot."+side,JOINT)
    oval("Foot."+side,(s*.125,.052,.061),(.056,.044,.105),"Foot."+side)
    oval("Toes."+side,(s*.125,.035,.147),(.055,.027,.040),"Foot."+side,FACE)

def quat(x,y,z):
    a,b=math.sin(x/2),math.cos(x/2)
    c,d=math.sin(y/2),math.cos(y/2)
    e,f=math.sin(z/2),math.cos(z/2)
    return (a*d*f+b*c*e,b*c*f-a*d*e,b*d*e+a*c*f,b*d*f-a*c*e)

def clip(title,duration,pose,frames=25):
    times=[duration*k/(frames-1) for k in range(frames)]
    time_acc=acc(times,"f",1,bounds=True)
    animation={"name":title,"samplers":[],"channels":[]}
    names=["Hips","Spine","Head","UpperArm.L","UpperArm.R",
           "Forearm.L","Forearm.R","UpperLeg.L","UpperLeg.R",
           "LowerLeg.L","LowerLeg.R","Foot.L","Foot.R"]
    for name in names:
        result=[]
        for t in times:
            values=pose(t/duration,name)
            x,y,z=values[:3]
            up=values[3] if len(values)>3 else 0.
            result.append((0.,1.+up,0.) if name=="Hips" else quat(x,y,z))
        target="translation" if name=="Hips" else "rotation"
        out=acc(result,"f",3 if name=="Hips" else 4)
        sampler=len(animation["samplers"])
        animation["samplers"].append({"input":time_acc,"output":out,"interpolation":"LINEAR"})
        animation["channels"].append({"sampler":sampler,
                                      "target":{"node":joints[name][0],"path":target}})
    g["animations"].append(animation)

def idle(t,p):
    w=math.tau*t
    poses={"Hips":(0,0,0,.003*math.cos(w)),
           "Spine":(.01*math.sin(w),.014*math.sin(w*.5),.009*math.sin(w)),
           "Head":(-.014*math.sin(w),.018*math.sin(w*.5),0),
           "UpperArm.L":(-.015*math.sin(w),0,-.025),
           "UpperArm.R":(-.015*math.sin(w),0,.025)}
    return poses.get(p,(0,0,0,0))

def move(t,p,fast):
    phase=math.tau*t;s=math.sin(phase)
    leg=.73 if fast else .43
    arm=.66 if fast else .35
    poses={"Hips":(0,0,0,(.020 if fast else .012)*(.5-.5*math.cos(2*phase))),
      "Spine":(.10 if fast else .027,.034*s,.027*s),
      "Head":(-.04 if fast else -.015,-.017*s,0),
      "UpperLeg.L":(-leg*s,0,.035),"UpperLeg.R":(leg*s,0,-.035),
      "LowerLeg.L":(max(0,-s)*(.8 if fast else .45),0,0),
      "LowerLeg.R":(max(0,s)*(.8 if fast else .45),0,0),
      "UpperArm.L":(arm*s,0,-.035),"UpperArm.R":(-arm*s,0,.035),
      "Forearm.L":(-.14-(.27 if fast else .10)*max(0,s),0,0),
      "Forearm.R":(-.14-(.27 if fast else .10)*max(0,-s),0,0),
      "Foot.L":(-.11*max(0,-s),0,0),"Foot.R":(-.11*max(0,s),0,0)}
    return poses.get(p,(0,0,0,0))

def jumping(t,p):
    air=math.sin(math.pi*t);crouch=math.sin(math.pi*(t if t<.5 else 1-t))
    poses={"Hips":(0,0,0,-.013*crouch),"Spine":(-.13*air,0,0),
      "Head":(.06*air,0,0),"UpperLeg.L":(-.23*air,0,.035),
      "UpperLeg.R":(-.18*air,0,-.035),"LowerLeg.L":(.42*air,0,0),
      "LowerLeg.R":(.50*air,0,0),
      "UpperArm.L":(-.65*air,0,-.18*air),"UpperArm.R":(-.65*air,0,.18*air),
      "Forearm.L":(-.32*air,0,0),"Forearm.R":(-.32*air,0,0)}
    return poses.get(p,(0,0,0,0))

clip("Idle",2.4,idle)
clip("Walk",1.0,lambda t,p:move(t,p,False))
clip("Run",.67,lambda t,p:move(t,p,True))
clip("Jump",.9,jumping)

g["buffers"]=[{"byteLength":len(data)}]
j=json.dumps(g,separators=(",",":")).encode()
j+=b" "*((-len(j))%4)
data+=b"\0"*((-len(data))%4)
size=12+8+len(j)+8+len(data)
with output.open("wb") as f:
    f.write(struct.pack("<4sII",b"glTF",2,size))
    f.write(struct.pack("<I4s",len(j),b"JSON"));f.write(j)
    f.write(struct.pack("<I4s",len(data),b"BIN\0"));f.write(data)
print(f"Built {output}: {len(g['meshes'])} meshes, {len(joints)} joints, "
      f"{[a['name'] for a in g['animations']]}, {output.stat().st_size} bytes")

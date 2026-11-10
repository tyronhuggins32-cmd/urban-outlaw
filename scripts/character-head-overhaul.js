/**
 * Urban Outlaws · reference-guided sculpted hair + forehead geometry
 *
 * Unlike a hair billboard, every lock is an actual elliptical tapered 3D
 * surface with smooth normals and a thin highlight ridge. All meshes are
 * anchored to the existing animated HEAD bone: the 44-bone body remains
 * unchanged. Source sculpt coordinates: Y-up, front +Z, full height 1.62 m.
 *
 * Target: layered heavy black-blue bangs, controlled rearward locks, navy
 * temple/headband, riveted forehead plate and two tied cloth tails.
 */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function polishNinjaHead(THREE, root) {
  root.updateMatrixWorld(true);
  let head=null, body=null;
  root.traverse(o=>{
    if(o.isBone && o.name.toLowerCase().replace(/[^a-z]/g,'').endsWith('head'))head=o;
    if(o.isSkinnedMesh && !body)body=o;
  });
  if(!head || !body) throw new Error('Reference head overhaul requires original skinned head bone');
  const hairDark=new THREE.MeshStandardMaterial({name:'Sculpted deep blue-black hair',color:0x252d46,roughness:.67,metalness:.035});
  const hairMid=new THREE.MeshStandardMaterial({name:'Sculpted indigo strand layers',color:0x303b57,roughness:.64,metalness:.02});
  const hairLight=new THREE.MeshStandardMaterial({name:'Fine hair reflections',color:0x4a5674,roughness:.60,metalness:.02});
  const bandMat=new THREE.MeshStandardMaterial({name:'Indigo fabric forehead wrap',color:0x1b2d66,roughness:.97});
  const steelMat=new THREE.MeshStandardMaterial({name:'Brushed silver headplate',color:0xbac6d2,metalness:.79,roughness:.31});
  const blackMat=new THREE.MeshStandardMaterial({name:'Raised black leaf engraving',color:0x101723,roughness:.80});
  const blackHair=new THREE.MeshStandardMaterial({name:'Inner hair underlayer',color:0x172039,roughness:.84});
  const meshesByMaterial=new Map();
  const sourceGroup=new THREE.Group();
  sourceGroup.name='Ninja Head: reference v3, attached to skull joint';
  root.add(sourceGroup);
  let lockCount=0, strandDetailCount=0;

  function append(geo,material){
    const list=meshesByMaterial.get(material)||[];
    list.push(geo);meshesByMaterial.set(material,list);
  }
  function ellipsoid(name,center,radii,mat,w=28,h=18){
    const geo=new THREE.SphereGeometry(1,w,h);
    geo.scale(...radii);geo.translate(...center);
    append(geo,mat);
  }
  const tangent=(path,i)=>{
    const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)];
    return b.clone().sub(a).normalize();
  };
  /**
   * Swept hair as variable-radius elliptical tubes. Smooth Catmull-Rom guides
   * give broad sculpted planes, not cone-shaped spikes.
   */
  function lock(name,xyz,radius,material=hairDark,steps=17,facets=11,highlight=true){
    const path=xyz.map(p=>new THREE.Vector3(...p));
    const curve=new THREE.CatmullRomCurve3(path,false,'catmullrom',.48);
    const frames=curve.computeFrenetFrames(steps,false);
    const positions=[],normals=[],uv=[],inds=[];
    const taper=t=>{
      const root=.75+.24*Math.min(1,t/.20);
      const tip=Math.max(.016,Math.pow(1-t,.70));
      return root*tip;
    };
    for(let i=0;i<=steps;i++){
      const t=i/steps,pos=curve.getPointAt(t),a=frames.normals[i],b=frames.binormals[i];
      const width=radius*taper(t);
      const side=.56+.19*Math.sin(Math.PI*t);
      for(let j=0;j<facets;j++){
        const theta=Math.PI*2*j/facets;
        const cross=a.clone().multiplyScalar(Math.cos(theta)*width)
          .addScaledVector(b,Math.sin(theta)*width*side);
        positions.push(pos.x+cross.x,pos.y+cross.y,pos.z+cross.z);
        uv.push(t,j/(facets-1));
      }
    }
    for(let i=0;i<steps;i++)for(let j=0;j<facets;j++){
      const a=i*facets+j,b=i*facets+(j+1)%facets,c=(i+1)*facets+j,d=(i+1)*facets+(j+1)%facets;
      inds.push(a,c,b,b,c,d);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geo.setIndex(inds);geo.computeVertexNormals();
    append(geo,material);
    lockCount++;
    if(highlight && radius>.014){
      // One curved, very subtle strand ridge following the contour.
      const ridge=[];
      for(let i=1;i<steps;i++){
        const t=i/steps,pos=curve.getPointAt(t),a=frames.normals[i];
        const w=radius*taper(t);
        ridge.push(pos.addScaledVector(a,.86*w));
      }
      const ridgeCurve=new THREE.CatmullRomCurve3(ridge);
      append(new THREE.TubeGeometry(ridgeCurve,16,.00065,4,false),hairLight);
      strandDetailCount++;
    }
  }

  // Base silhouette smooth and low against the scalp. Layers sit outside it.
  ellipsoid('scalp volume',[0,1.591,-.010],[.096,.082,.093],blackHair);
  ellipsoid('front low underhair',[0,1.568,.030],[.099,.068,.077],hairDark);
  // Crown loops overlap in broad curved fans. Rear = -Z.
  for(let layer=0;layer<2;layer++){
    for(let i=0;i<7;i++){
      const side=(i<3?-1:i>3?1:0);
      const u=i/6, lateral=(u-.5)*2;
      const y=1.668-.026*layer-.005*Math.abs(lateral);
      const z=-.010-.023*layer;
      const len=.159+.026*Math.cos(i*.77)+.010*(layer===0);
      const endX=lateral*(.118+.02*layer)+.012*Math.sin(i*2.4);
      const endY=y+.016+(.017*(1-Math.abs(lateral)))-.026*layer;
      const baseX=lateral*.061;
      lock('long swept hair '+layer+' '+i,
          [[baseX,1.634-.022*layer,z+.032],
           [baseX*1.20,1.666-.024*layer,z-.030],
           [endX*.82,endY+.010,z-.125],
           [endX,endY,z-len]],
          .027-.003*layer+(i%3)*.002,
          (layer+i)%4===0?hairMid:hairDark);
    }
  }
  // Fine lower nape points, back of ears and tied hair.
  for(let side of [-1,1])for(let i=0;i<6;i++){
    const a=i/5;
    lock('nape '+side+' '+i,[
      [side*(.032+.060*a),1.579-.014*a,-.060],
      [side*(.040+.072*a),1.521-.023*a,-.095],
      [side*(.053+.079*a),1.484-.024*a,-.132],
      [side*(.058+.079*a),1.456-.035*a,-.150]],
      .014+.004*a,i%2?hairMid:hairDark,14,9,false);
  }
  // 3D face-framing bangs, thick near the scalp, long flattened ends.
  for(const side of [-1,1]){
    lock('main face framing bang '+side,[
      [side*.032,1.675,.130],
      [side*.072,1.662,.182],
      [side*.093,1.578,.212],
      [side*.099,1.513,.215],
      [side*.105,1.484,.181]],.022,hairDark,24,13);
    lock('outer cheek bang '+side,[
      [side*.081,1.671,.136],
      [side*.105,1.634,.182],
      [side*.121,1.545,.206],
      [side*.126,1.492,.181]],.020,hairMid,22,12);
    lock('temple side lock '+side,[
      [side*.094,1.647,.088],
      [side*.119,1.607,.128],
      [side*.134,1.531,.135],
      [side*.116,1.469,-.012]],.022,hairDark,18,10);
  }
  // Overlapping center bangs split above the forehead plate.
  for(let k=0;k<2;k++){
    const x=(-.5+k)*.042;
    lock('eyebrow fringe '+k,[
      [x,1.677,.121],
      [x*1.65,1.632,.173],
      [x*2.70,1.559,.179],
      [x*3.00,1.526,.167]],.016,k%2?hairMid:hairDark,16,10);
  }

  // Deep-indigo cloth strip around brow; silver metal leaf plate is in front.
  const band=new THREE.TorusGeometry(.102,.011,9,54);
  band.rotateX(Math.PI/2);
  band.translate(0,1.529,.091);
  append(band,bandMat);
  // Slightly curved, bevelled metal with raised border.
  const plateShape=new THREE.Shape();
  const w=.073,h=.029,r=.009;
  plateShape.moveTo(-w+r,-h);
  plateShape.lineTo(w-r,-h);plateShape.quadraticCurveTo(w,-h,w,-h+r);
  plateShape.lineTo(w,h-r);plateShape.quadraticCurveTo(w,h,w-r,h);
  plateShape.lineTo(-w+r,h);plateShape.quadraticCurveTo(-w,h,-w,h-r);
  plateShape.lineTo(-w,-h+r);plateShape.quadraticCurveTo(-w,-h,-w+r,-h);
  const extrude=new THREE.ExtrudeGeometry(plateShape,{depth:.006,bevelEnabled:true,bevelSize:.003,bevelThickness:.002,bevelSegments:3,curveSegments:6});
  extrude.translate(0,1.541,.205);
  append(extrude,steelMat);
  // Small edge rivets.
  for(const x of [-.063,.063])for(const y of [1.520,1.563]){
    ellipsoid('metal rivet',[x,y,.219],[.003,.003,.0027],blackMat,9,8);
  }
  // Engraved spiral insignia approximating the reference leaf-symbol.
  const segments=[];
  for(let i=0;i<=45;i++){
    const t=i/45,theta=2.6*Math.PI*t+Math.PI*.18,rad=.003+.019*t;
    segments.push(new THREE.Vector3(rad*Math.cos(theta),1.540+rad*Math.sin(theta),.221));
  }
  const swirl=new THREE.CatmullRomCurve3(segments);
  append(new THREE.TubeGeometry(swirl,46,.00225,6,false),blackMat);
  const tail=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.020,1.540,.220),
    new THREE.Vector3(-.035,1.527,.220),
    new THREE.Vector3(-.021,1.516,.220),
  ]);
  append(new THREE.TubeGeometry(tail,12,.0024,6,false),blackMat);

  // Sculpted eyes and brow ridges. The original texture supplied an extremely
  // indistinct painted face, so these dimensional details restore the close-up
  // expression without affecting the character skeleton or skin weights.
  const sclera=new THREE.MeshStandardMaterial({name:'Natural ivory sclera',color:0x9b8476,roughness:.72});
  const iris=new THREE.MeshStandardMaterial({name:'Deep brown iris',color:0x292521,roughness:.40,metalness:.06});
  const pupil=new THREE.MeshStandardMaterial({name:'Dark pupils and eyeliner',color:0x0e0f14,roughness:.49});
  const skinLid=new THREE.MeshStandardMaterial({name:'Shadowed upper eyelids',color:0x76574c,roughness:.82});
  const glint=new THREE.MeshStandardMaterial({name:'Eye reflections',color:0xcdd7da,roughness:.18});
  for(const side of [-1,1]){
    const x=side*.038;
    ellipsoid('almond sclera '+side,[x,1.477,.202],[.0170,.0059,.0028],sclera,24,12);
    ellipsoid('iris '+side,[x+side*.002,1.477,.208],[.0067,.0058,.0019],iris,20,12);
    ellipsoid('pupil '+side,[x+side*.002,1.477,.211],[.0035,.0044,.0011],pupil,16,10);
    ellipsoid('eye glint '+side,[x-side*.002,1.479,.213],[.0015,.0015,.0006],glint,10,8);
    const upper=new THREE.CatmullRomCurve3([
      new THREE.Vector3(x-side*.020,1.478,.211),
      new THREE.Vector3(x-side*.010,1.484,.213),
      new THREE.Vector3(x+side*.010,1.484,.213),
      new THREE.Vector3(x+side*.020,1.479,.209)
    ]);
    append(new THREE.TubeGeometry(upper,16,.0020,6,false),pupil);
    const lower=new THREE.CatmullRomCurve3([
      new THREE.Vector3(x-side*.019,1.472,.207),
      new THREE.Vector3(x,1.472,.213),
      new THREE.Vector3(x+side*.018,1.471,.209)
    ]);
    append(new THREE.TubeGeometry(lower,14,.0012,5,false),skinLid);
    // Stern, slightly inward-tilted dark eyebrow.
    const brow=new THREE.CatmullRomCurve3([
      new THREE.Vector3(x-side*.022,1.507,.205),
      new THREE.Vector3(x,1.510,.211),
      new THREE.Vector3(x+side*.022,1.503,.205)
    ]);
    append(new THREE.TubeGeometry(brow,14,.0023,6,false),hairDark);
  }

  // Rear tied indigo knot and two tapered cloth bands.
  ellipsoid('headband rear knot',[0,1.551,-.119],[.032,.021,.018],bandMat);
  for(const side of [-1,1]){
    const clothPts=[
      [side*.010,1.553,-.127],
      [side*.041,1.540,-.156],
      [side*.079,1.492,-.184],
      [side*.089,1.453,-.202],
    ];
    lock('rear headband tail '+side,clothPts,.024,bandMat,18,9,false);
    const folded=[
      [side*.007,1.547,-.121],
      [side*.021,1.525,-.159],
      [side*.048,1.487,-.201],
    ];
    lock('knot short folded cloth '+side,folded,.018,bandMat,14,9,false);
  }
  const stats={locks:lockCount,ridges:strandDetailCount,drawMeshes:0,maskedHairTriangles:0};

  // Group repeated locks sharing a shader into few GPU draw calls.
  for(const [material,geometries] of meshesByMaterial){
    const joined=geometries.length>1?mergeGeometries(geometries,false):geometries[0];
    if(!joined)throw new Error('Ninja hair mesh construction failed');
    const mesh=new THREE.Mesh(joined,material);
    mesh.castShadow=true;mesh.receiveShadow=false;
    mesh.frustumCulled=false;mesh.name=material.name;
    sourceGroup.add(mesh);stats.drawMeshes++;
    for(const g of geometries)if(g!==joined)g.dispose();
  }
  // Attach the entire sculpt to the existing animated skull joint.
  // Match the existing skinned face: forehead plate and bangs were 15 cm too high
  // in source sculpt coordinates. Align the overlay before bone attachment.
  sourceGroup.position.y-=.150;
  root.updateMatrixWorld(true);
  head.attach(sourceGroup);
  sourceGroup.updateMatrixWorld(true);

  // Remove only the original upper crown. The previous texture-based
  // deletion also cut dark eye polygons and left isolated triangles hanging
  // above the hairstyle. A geometric crown trim is deterministic and keeps
  // every original eyebrow, eyelid and cheek below the upper hairline.
  const geo=body.geometry;
  const position=geo.getAttribute('position');
  const input=geo.index.array;
  const remain=[];
  for(let i=0;i<input.length;i+=3){
    const a=input[i],b=input[i+1],c=input[i+2];
    const y=(position.getY(a)+position.getY(b)+position.getY(c))/3;
    // Source head crown is above 1.515 metres; the new locks cover this rim.
    if(y>1.515)stats.maskedHairTriangles++;
    else remain.push(a,b,c);
  }
  if(stats.maskedHairTriangles>100 && stats.maskedHairTriangles<9000){
    geo.setIndex(remain);
    geo.computeBoundingSphere();
  }else{
    stats.maskedHairTriangles=0;
  }
  return stats;
}

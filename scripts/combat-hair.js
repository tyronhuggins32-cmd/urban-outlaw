/**
 * Combat hairstyle adjustment for the existing detachable, textured 3D hair.
 * No floating spikes, tubes, duplicated hair or new approval sheet.
 * The single continuous sculpt is swept and tapered slightly backward at the
 * crown using its original vertices, preserving natural layer flow and fit.
 */
export function refineCombatHair(THREE,root,hairScene) {
  const head=[];
  root.traverse(o=>{if(o.isBone&&o.name.toLowerCase().replace(/[^a-z]/g,'').endsWith('head'))head.push(o)});
  if(head.length!==1)throw Error('Head bone required for styled hair');
  let surface=null;
  hairScene.traverse(o=>{
    if(o.isMesh&&o.material?.name==='REFERENCE SCULPT HAIR'){
      if(surface)throw Error('Hairstyle has duplicate surfaces');
      surface=o;
    }
  });
  if(!surface)throw Error('Missing original continuous hair mesh');
  const geo=surface.geometry,verts=geo.getAttribute('position');
  let moved=0,maxSweep=0;
  function smooth(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}
  for(let i=0;i<verts.count;i++){
    const x=verts.getX(i),y=verts.getY(i),z=verts.getZ(i);
    // Only backward-facing upper crown vertices. Protect fringe, plate,
    // bangs and lower tied sections of the original sculpt.
    const crown=smooth((y-1.435)/.105);
    const back=smooth((-.024-z)/.15);
    const influence=crown*back;
    if(influence<=.005)continue;
    const sweep=.061*influence;
    verts.setXYZ(i,
      x*(1+.035*influence),
      y+.009*influence,
      z-sweep);
    moved++;
    maxSweep=Math.max(maxSweep,sweep);
  }
  if(moved<70)throw Error('Could not find continuous back-of-crown geometry');
  verts.needsUpdate=true;
  geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();
  // The original atlas is retained: only gently lift the dark-blue highlights.
  surface.material.color.setRGB(.90,.94,1.0);
  surface.material.roughness=.82;
  surface.material.needsUpdate=true;
  root.updateMatrixWorld(true);
  return {
    style:'source-sculpt-swept-v2',
    locks:1,
    verticesAdjusted:moved,
    triangles:(geo.index?geo.index.count:verts.count)/3,
    maxSweep:Number(maxSweep.toFixed(4)),
    attachment:head[0].name
  };
}

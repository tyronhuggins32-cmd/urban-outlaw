/**
 * Hide the original textured hair without deleting skinned geometry.
 * Character face, ears, metal protector, UVs and skin weights remain intact.
 * The replacement standalone GLB supplies all visible hairstyle geometry.
 */
export function hideOldHairWithoutCuttingHead(THREE,root){
  let skinned;
  root.traverse(o=>{if(o.isSkinnedMesh && !skinned)skinned=o});
  if(!skinned)throw new Error('Skinned head mesh not found');
  const materials=Array.isArray(skinned.material)?skinned.material:[skinned.material];
  let patched=0;
  for(const mat of materials){
    if(!mat?.isMeshStandardMaterial)continue;
    if(mat.userData.uoHairMask)continue;
    const old=mat.onBeforeCompile;
    mat.onBeforeCompile=(shader,renderer)=>{
      if(old)old(shader,renderer);
      const start='#include <begin_vertex>';
      const map='#include <map_fragment>';
      if(!shader.vertexShader.includes(start)||!shader.fragmentShader.includes(map)){
        throw new Error('Three.js hair masking shader incompatible');
      }
      shader.vertexShader=shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vUrbanRestPosition;'
      ).replace(start,start+'\nvUrbanRestPosition=position;');
      const mask=[
        'bool onHead=vUrbanRestPosition.y>1.29;',
        'bool protectedFace=vUrbanRestPosition.z>0.080 &&',
        ' abs(vUrbanRestPosition.x)<0.103 &&',
        ' vUrbanRestPosition.y<1.535;',
        'float bright=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));',
        'if(onHead && !protectedFace && bright<0.24) discard;'
      ].join('\n');
      shader.fragmentShader=shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vUrbanRestPosition;'
      ).replace(map,map+'\n'+mask);
    };
    mat.customProgramCacheKey=()=> 'urban-no-legacy-hair-v1';
    mat.userData.uoHairMask=true;
    mat.needsUpdate=true;
    patched++;
  }
  if(!patched)throw new Error('No skinned material could mask old hair');
  return patched;
}

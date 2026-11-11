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
        // Do not mask the sides, ears or nape: those contain genuine skin.
        'bool highRear=vUrbanRestPosition.y>1.505 &&',
        ' vUrbanRestPosition.z< -0.052;',
        'bool upperBack=vUrbanRestPosition.y>1.445 &&',
        ' vUrbanRestPosition.z< -0.137;',
        'float bright=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));',
        'if((highRear || upperBack) && bright<0.18) discard;'
      ].join('\n');
      shader.fragmentShader=shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vUrbanRestPosition;'
      ).replace(map,map+'\n'+mask);
    };
    mat.customProgramCacheKey=()=> 'urban-no-legacy-hair-v2';
    mat.userData.uoHairMask=true;
    mat.needsUpdate=true;
    patched++;
  }
  if(!patched)throw new Error('No skinned material could mask old hair');
  return patched;
}

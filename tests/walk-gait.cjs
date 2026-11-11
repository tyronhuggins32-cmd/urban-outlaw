const assert=require('node:assert/strict'),fs=require('node:fs');
const d=JSON.parse(fs.readFileSync('assets/animations/walking-retargeted.json','utf8'));
assert.equal(d.source.name,'Walking');assert.equal(Object.keys(d.bones).length,22);
assert(d.duration>.9&&d.duration<1.2);assert(d.groundSpeed>1&&d.groundSpeed<2);
assert.equal(d.times[0],0);assert(Math.abs(d.times.at(-1)-d.duration)<1e-6);
for(const [name,values]of Object.entries(d.bones)){
 assert.equal(values.length,d.times.length*4,name+' missing frames');
 for(let i=0;i<values.length;i+=4){
  const q=values.slice(i,i+4);assert(q.every(Number.isFinite));assert(Math.abs(Math.hypot(...q)-1)<1e-5,name+' invalid rotation');
  if(i){const previous=values.slice(i-4,i);const dot=q.reduce((a,v,j)=>a+v*previous[j],0);assert(dot>.97,name+' rotation jumps');}
 }
 assert(Math.abs(values.slice(0,4).reduce((a,v,j)=>a+v*values[values.length-4+j],0))>.99999,name+' loop seam');
}
for(let c=0;c<3;c++)assert(Math.abs(d.hips[c]-d.hips[d.hips.length-3+c])<1e-6,'Root loop seam');
const html=fs.readFileSync('index.html','utf8');assert(html.includes('const speed = sprinting ? 95 : walkSpeed'));assert(html.includes('walkSpeed=walkData.groundSpeed*imported.scale.z'));
assert(!fs.readFileSync('scripts/reference-character-animations-v2.js','utf8').includes('walk-cycle-v4'),'Old analytical gait still active');
console.log('RECORDED WALK DATA VERIFIED: 22 mapped bones, continuous loop, stride-derived travel and sprint 95');

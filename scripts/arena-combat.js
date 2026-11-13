/**
 * Urban Outlaw Arena Combat v1. Real-time 3D sparring, bone-driven combat
 * clips, enemy AI, directional attack checks, guard/stamina and score.
 * Runs entirely in-browser; no external service or generated text responses.
 */
export function createCombatClips(THREE,root) {
  root.updateMatrixWorld(true);
  const bones=new Map();
  root.traverse(o=>{
    if(!o.isBone)return;
    const key=o.name.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^mixamorig/,'');
    bones.set(key,o);
  });
  const map={
    hips:'hips',spine:'spine',spine1:'spine1',spine2:'spine2',head:'head',neck:'neck',
    leftArm:'leftarm',rightArm:'rightarm',leftShoulder:'leftshoulder',rightShoulder:'rightshoulder',
    leftForeArm:'leftforearm',rightForeArm:'rightforearm',
    leftHand:'lefthand',rightHand:'righthand',
    leftLeg:'leftupleg',rightLeg:'rightupleg',leftKnee:'leftleg',rightKnee:'rightleg'
  };
  const rest={};const parents={};
  for(const [name,key] of Object.entries(map)){
    const b=bones.get(key);if(!b)throw Error('Combat clip bone missing: '+key);
    rest[name]=b.quaternion.clone();
    parents[name]=b.parent.getWorldQuaternion(new THREE.Quaternion());
  }
  const P=(x=0,y=0,z=0)=>[x,y,z];
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  const strikeWave=t=>Math.sin(Math.PI*smooth(t));
  function pose(which,t,k) {
    const swing=strikeWave(t),recoil=Math.sin(Math.PI*t);
    if(which==='Ready'){
      const breath=Math.sin(t*Math.PI*2);
      if(k==='hips')return P(.035,.009*breath);
      if(k==='spine')return P(.07);
      if(k==='spine1')return P(.09,.01*breath);
      if(k==='spine2')return P(.04);
      if(k==='leftArm')return P(-.62,0,.12);
      if(k==='rightArm')return P(-.67,0,-.12);
      if(k==='leftForeArm'||k==='rightForeArm')return P(-.40);
      if(k==='leftKnee'||k==='rightKnee')return P(.12);
      if(k==='head')return P(-.025,.008*breath);
    }
    if(which==='Light'){
      if(k==='spine1')return P(-.16*swing,.10*swing,0);
      if(k==='spine2')return P(-.07*swing,.10*swing);
      if(k==='rightShoulder')return P(-.12*swing,0,-.05);
      if(k==='rightArm')return P(-1.37*swing,0,-.12);
      if(k==='rightForeArm')return P(-.25*swing);
      if(k==='leftArm')return P(-.22*swing,0,.19);
      if(k==='leftForeArm')return P(-.22*swing);
      if(k==='head')return P(.05*swing);
    }
    if(which==='Heavy'){
      if(k==='hips')return P(.10*swing,-.16*swing);
      if(k==='spine')return P(-.20*swing,-.18*swing);
      if(k==='spine1')return P(-.29*swing,-.30*swing);
      if(k==='spine2')return P(-.12*swing,-.16*swing);
      if(k==='leftArm')return P(-1.5*swing,0,.14);
      if(k==='rightArm')return P(-.7*swing,0,-.13);
      if(k==='leftForeArm')return P(-.18*swing);
      if(k==='head')return P(.07*swing);
    }
    if(which==='Kick'){
      if(k==='hips')return P(-.08*swing);
      if(k==='spine1')return P(-.26*swing);
      if(k==='rightLeg')return P(-1.45*swing);
      if(k==='rightKnee')return P(.84*swing);
      if(k==='leftKnee')return P(.17*swing);
      if(k==='leftArm')return P(-.34*swing,0,.14);
      if(k==='rightArm')return P(-.48*swing,0,-.14);
      if(k==='head')return P(.08*swing);
    }
    if(which==='Guard'){
      const breath=Math.sin(t*Math.PI*2);
      if(k==='spine')return P(.07);
      if(k==='spine1')return P(.14);
      if(k==='leftArm')return P(-.95,0,.13);
      if(k==='rightArm')return P(-.95,0,-.13);
      if(k==='leftForeArm')return P(-.57);
      if(k==='rightForeArm')return P(-.57);
      if(k==='leftHand')return P(.03*breath);
      if(k==='rightHand')return P(-.03*breath);
      if(k==='head')return P(-.035);
    }
    if(which==='Dodge'){
      if(k==='hips')return P(.28*swing,0,.19*swing);
      if(k==='spine')return P(-.2*swing,0,-.20*swing);
      if(k==='spine1')return P(.20*swing,0,.12*swing);
      if(k==='leftLeg')return P(.30*swing);
      if(k==='rightLeg')return P(-.45*swing);
      if(k==='leftKnee')return P(.44*swing);
      if(k==='rightKnee')return P(.55*swing);
      if(k==='leftArm')return P(-.42*swing);
      if(k==='rightArm')return P(-.42*swing);
    }
    if(which==='Hit'){
      if(k==='spine')return P(-.22*recoil);
      if(k==='spine1')return P(-.33*recoil);
      if(k==='head')return P(.13*recoil);
      if(k==='leftArm')return P(.25*recoil);
      if(k==='rightArm')return P(.25*recoil);
    }
    return P();
  }
  function make(name,duration){
    const frames=32,times=Array.from({length:frames+1},(_,i)=>i/frames*duration);
    const tracks=[];
    for(const [k,key] of Object.entries(map)){
      const bone=bones.get(key),quats=[];
      for(let i=0;i<=frames;i++){
        const world=new THREE.Quaternion().setFromEuler(new THREE.Euler(...pose(name,i/frames,k),'XYZ'));
        const p=parents[k];
        const q=p.clone().invert().multiply(world).multiply(p).multiply(rest[k]).normalize();
        quats.push(q.x,q.y,q.z,q.w);
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(bone.uuid+'.quaternion',times,quats));
    }
    return new THREE.AnimationClip(name,duration,tracks);
  }
  return [
    make('Ready',1.1),make('Light',.35),make('Heavy',.58),make('Kick',.64),
    make('Guard',.7),make('Dodge',.42),make('Hit',.34)
  ];
}

export function createCombatArena(THREE,scene) {
  const placed=new THREE.Group();placed.name='Urban Outlaw combat courtyard';scene.add(placed);
  const mat=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});
  const stone=mat(0x67768a),dark=mat(0x293445),gold=mat(0xe8b873),ink=mat(0x151d30),red=mat(0xa04748),pale=mat(0xc3c8d0);
  const add=(geometry,material,x,y,z,name)=>{const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;placed.add(m);return m;};
  const platform=add(new THREE.CylinderGeometry(27,27.8,.45,72,1),stone,0,-.20,0,'CourtyardStoneRing');
  platform.receiveShadow=true;
  const inner=add(new THREE.CylinderGeometry(22.4,22.4,.028,64,1),dark,0,.032,0,'CombatFloorInset');
  inner.receiveShadow=true;
  for(const radius of [11,20,23.7]) {
    const ring=add(new THREE.TorusGeometry(radius,.067,6,80),gold,0,.064,0,'ArenaCircleInlay');
    ring.rotation.x=Math.PI/2;ring.castShadow=false;
  }
  for(const sign of [-1,1]){
    for(let i=0;i<4;i++){
      const z=-16+i*10;
      const pillar=add(new THREE.CylinderGeometry(.27,.35,6,8),ink,sign*26,3,z,'DojoPillar');
      add(new THREE.BoxGeometry(.9,.32,.9),gold,sign*26,6.05,z,'PillarCap');
    }
    const banner=add(new THREE.BoxGeometry(.12,3,2.6),sign===1?red:gold,sign*26,5,-6,'ArenaBanner');
    banner.receiveShadow=false;
  }
  for(const z of [-25,25]){
    add(new THREE.BoxGeometry(54,.9,.8),ink,0,.6,z,'LowBoundaryWall');
    add(new THREE.BoxGeometry(54,.11,.95),gold,0,1.11,z,'WallTrim');
  }
  for(const x of [-25,25]){
    add(new THREE.BoxGeometry(.9,.9,52),ink,x,.6,0,'SideBoundaryWall');
  }
  // Four lamps frame the arena without obstructing camera or movement.
  for(const x of [-22,22])for(const z of [-21,21]){
    add(new THREE.CylinderGeometry(.17,.24,4.0,10),ink,x,2,z,'TrainingLanternPost');
    const glow=add(new THREE.OctahedronGeometry(.60),gold,x,4.35,z,'TrainingLantern');
    glow.castShadow=false;
  }
  return placed;
}

export function createCombatSystem(THREE,scene,player,opponentVisual=null,enemyMotion=null) {
  const hud=document.getElementById('combatHUD');
  if(!hud)throw Error('Combat HUD missing');
  const refs={
    hp:document.getElementById('playerHealthFill'),stamina:document.getElementById('playerStaminaFill'),
    enemyHP:document.getElementById('enemyHealthFill'),enemyName:document.getElementById('enemyName'),
    round:document.getElementById('combatRound'),combo:document.getElementById('combatCombo'),
    status:document.getElementById('combatStatus')
  };
  const fighter=new THREE.Group();fighter.name='Opponent_TrainingRival';scene.add(fighter);
  function mat(color){return new THREE.MeshStandardMaterial({color,roughness:.80,metalness:0});}
  const skin=mat(0xd7ae92),shirt=mat(0x9f3d49),pants=mat(0x273347),boots=mat(0x182238),headband=mat(0x273d61),steel=mat(0xb6bcca),hair=mat(0x171c2b);
  function box(n,w,h,d,m,x,y,z){
    const item=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
    item.name=n;item.position.set(x,y,z);item.castShadow=true;fighter.add(item);return item;
  }
  function sphere(n,r,m,x,y,z,sx=1,sy=1,sz=1) {
    const o=new THREE.Mesh(new THREE.SphereGeometry(r,18,12),m);
    o.name=n;o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;fighter.add(o);return o;
  }
  box('RivalTorso',.84,1.15,.48,shirt,0,2.66,0);
  sphere('RivalHead',.35,skin,0,3.49,.02,1,.95,.88);
  sphere('RivalHair',.37,hair,0,3.71,-.08,1,.38,1);
  box('RivalForeheadBand',.65,.14,.15,headband,0,3.62,.27);
  box('RivalForeheadMetal',.25,.105,.03,steel,0,3.62,.35);
  box('RivalBelt',.85,.14,.5,headband,0,2.07,0);
  const poseParts={};
  for(const side of [-1,1]){
    const label=side===-1?'R':'L';
    const upper=box(label+'Arm',.22,.84,.24,shirt,side*.55,2.82,0);
    const lower=box(label+'Forearm',.20,.65,.21,skin,side*.56,2.25,.07);
    const leg=box(label+'Leg',.30,1.15,.34,pants,side*.23,1.39,0);
    const shin=box(label+'Shin',.28,.64,.32,boots,side*.23,.57,.04);
    box(label+'Shoe',.34,.17,.52,boots,side*.23,.13,.22);
    poseParts[label]={upper,lower,leg,shin};
  }
  let rivalMixer=null,rivalActions=null,rivalState='';
  if(opponentVisual && enemyMotion?.walkData && enemyMotion?.createReferenceClips){
    // Remove every primitive dummy piece. Use the high-detail skinned ninja,
    // its own skeleton and its own mixer instead.
    for(const child of [...fighter.children])fighter.remove(child);
    fighter.add(opponentVisual);
    const rivalRig=enemyMotion.createReferenceClips(THREE,opponentVisual,enemyMotion.walkData);
    const clips=[...rivalRig.clips,...(enemyMotion.createCombatClips||createCombatClips)(THREE,opponentVisual)];
    rivalMixer=new THREE.AnimationMixer(opponentVisual);
    rivalActions=Object.fromEntries(clips.map(clip=>[clip.name,rivalMixer.clipAction(clip)]));
    for(const name of ['Light','Cross','Heavy','Kick','Sweep','Dodge','Slip','Parry','Hit']){
      rivalActions[name].setLoop(THREE.LoopOnce,1);
    }
    rivalActions.Ready.play();rivalState='Ready';
  }
  const healthMax=100,enemyBase=85;
  const state={health:healthMax,stamina:100,enemyHealth:enemyBase,enemyMax:enemyBase,
    round:1,combo:0,wins:0,guard:false,active:false,cooldown:0,attackTime:0,attackType:null,hitApplied:false,
    dodgeTimer:0,stagger:0,enemyAttack:0,enemyWindup:0,enemyStun:0,enemyGuard:0,
    spawnTimer:0,messageTimer:0,message:'MOVE INTO RANGE · START THE FIGHT',
    enemySide:1,hits:0,damageDealt:0,defeated:false,attacksStarted:0,enemyHits:0,
    buffered:null,comboStep:0,comboTimer:0,attackLength:0,
    evadeDir:1,counterWindow:0,guardAge:0,impactPause:0,enemyEvade:0};
  fighter.position.set(2.0,0,7.8);
  const vec=(a,b)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const events=[];const available=['Light','Heavy','Kick','Dodge','Sweep','Slip','Parry'];
  const duration={Light:.30,Cross:.32,Heavy:.49,Kick:.55,Sweep:.52,Dodge:.36,Slip:.34,Parry:.33};
  const staminaCost={Light:7,Cross:9,Heavy:18,Kick:19,Sweep:22,Dodge:15,Slip:13,Parry:9};
  const contactFrame={Light:.12,Cross:.14,Heavy:.23,Kick:.24,Sweep:.25,Parry:.14};
  const range={Light:4.3,Cross:4.45,Heavy:4.55,Kick:4.75,Sweep:4.4,Parry:4.2};
  const power={Light:11,Cross:14,Heavy:19,Kick:22,Sweep:16,Parry:10};
  const stumble={Light:.14,Cross:.20,Heavy:.28,Kick:.36,Sweep:.40,Parry:.45};
  const impactMaterial=new THREE.MeshBasicMaterial({color:0xffda76,transparent:true,opacity:.95,depthWrite:false});
  const fx=[];
  function effect(position,power) {
    for(let i=0;i<7;i++){
      const o=new THREE.Mesh(new THREE.SphereGeometry(.07+power*.002,6,4),impactMaterial.clone());
      o.position.copy(position);
      o.userData.velocity=new THREE.Vector3(Math.cos(i*2.399)*6,(i%3+1)*1.3,Math.sin(i*2.399)*6);
      o.userData.life=.28;
      scene.add(o);fx.push(o);
    }
  }
  function announce(text,time=1.3) {state.message=text;state.messageTimer=time;}
  function ui(){
    refs.hp.style.width=state.health+'%';
    refs.stamina.style.width=state.stamina+'%';
    refs.enemyHP.style.width=100*state.enemyHealth/state.enemyMax+'%';
    refs.enemyName.textContent='SHADOW RIVAL · LV '+state.round;
    refs.round.textContent='ROUND '+state.round+' · WINS '+state.wins;
    refs.combo.textContent=state.combo>1?'COMBO ×'+state.combo:'';
    refs.status.textContent=state.message;
    document.getElementById('game').dataset.combatHealth=String(Math.round(state.health));
    document.getElementById('game').dataset.combatEnemyHealth=String(Math.round(state.enemyHealth));
    document.getElementById('game').dataset.combatRound=String(state.round);
    document.getElementById('game').dataset.combatAttack=state.attackType||'none';
    const data=document.getElementById('game').dataset;
    data.combatLastAction=state.lastAction||'none';
    data.combatAttacksStarted=String(state.attacksStarted);
    data.combatHits=String(state.hits);
    data.combatEnemyDistance=vec(player,fighter).toFixed(2);
    data.combatPlayerPosition=player.position.x.toFixed(2)+','+player.position.z.toFixed(2);
    data.combatEnemyPosition=fighter.position.x.toFixed(2)+','+fighter.position.z.toFixed(2);
    data.combatMessage=state.message;
    data.combatChainHistory=(state.clipHistory||[]).join(',');
  }
  function beginAttack(request) {
    const type=request==='Light'?(state.comboStep%2?'Cross':'Light'):
      request==='Dodge' && state.enemyWindup>.01&&state.enemyWindup<.38?'Slip':
      request==='Heavy' && state.comboStep>=3?'Sweep':request;
    const cost=staminaCost[type];
    if(!duration[type]||state.stamina<cost){
      announce('NOT ENOUGH STAMINA',.55);return false;
    }
    state.stamina-=cost;
    state.attackType=type;
    state.attackTime=duration[type];state.attackLength=duration[type];
    state.hitApplied=false;state.buffered=null;
    state.cooldown=.05;
    state.attacksStarted++;
    state.lastAction=type;
    state.clipHistory=[...(state.clipHistory||[]),type].slice(-12);
    if(!['Dodge','Slip'].includes(type)) {
      state.comboStep++;state.comboTimer=1.10;
    } else {
      state.dodgeTimer=duration[type]+.04;
      state.evadeDir=state.evadeDir===1?-1:1;
    }
    if(type==='Parry')state.counterWindow=.4;
    announce(({Light:'LEAD JAB',Cross:'REAR CROSS',Heavy:'HOOK STRIKE',
      Kick:'ROUNDHOUSE',Sweep:'LOW SWEEP',Dodge:'SIDE STEP',
      Slip:'SHOULDER SLIP',Parry:'COUNTER!'}[type]||type),.38);
    return true;
  }
  function queue(type) {
    if(type==='GuardOn'){
      if(!state.guard)state.guardAge=0;
      state.guard=true;return true;
    }
    if(type==='GuardOff'){state.guard=false;state.guardAge=0;return true;}
    if(!state.active||state.health<=0||state.enemyHealth<=0||state.stagger>0)return false;
    if(!available.includes(type))return false;
    // A queued next strike starts as the current strike recovers, preserving a
    // full jab/cross/kick string with no forced idle pose between inputs.
    if(state.attackTime>0){
      if(!['Dodge','Slip'].includes(type)){
        // Store exactly one follow-up through anticipation, contact and recovery.
        state.buffered=type;return true;
      }
      if(['Dodge','Slip'].includes(type)&&state.attackTime<.16){
        state.attackTime=0;state.attackType=null;state.cooldown=0;
      }else return false;
    }
    if(state.cooldown>.04)return false;
    return beginAttack(type);
  }
  function begin(){state.active=true;hud.hidden=false;announce('DEFEAT THE SHADOW RIVAL',2);ui();}
  function pause(){state.active=false;state.guard=false;}
  function resetRound(){
    state.enemyMax=enemyBase+Math.min(100,(state.round-1)*15);
    state.enemyHealth=state.enemyMax;state.enemyStun=0;state.enemyAttack=0;state.enemyWindup=0;
    state.enemyGuard=0;state.combo=0;state.stagger=0;state.attackTime=0;state.attackType=null;
    state.health=clamp(state.health+25,0,healthMax);
    state.stamina=100;state.defeated=false;
    fighter.position.set(state.round%2?2:-2,0,9);
    announce('ROUND '+state.round+' · FIGHT!',2);
  }
  function resetMatch(){
    Object.assign(state,{health:100,stamina:100,round:1,wins:0,combo:0,enemyHealth:enemyBase,enemyMax:enemyBase,
      cooldown:0,attackTime:0,attackType:null,hitApplied:false,dodgeTimer:0,stagger:0,enemyAttack:0,enemyWindup:0,
      enemyStun:0,enemyGuard:0,spawnTimer:0,defeated:false,hits:0,enemyHits:0,damageDealt:0});
    fighter.position.set(2.0,0,7.8);announce('FIGHT!',1.5);ui();
  }
  function tick(dt,active,facing,moving){
    state.active=active;
    const dtSafe=Math.min(.10,Math.max(0,dt)); // Keep 3D impacts in time with animation on mobile.
    for(let i=fx.length-1;i>=0;i--){
      const o=fx[i];o.userData.life-=dtSafe;
      o.position.addScaledVector(o.userData.velocity,dtSafe);
      o.userData.velocity.y-=15*dtSafe;
      o.material.opacity=clamp(o.userData.life/.28,0,1);
      if(o.userData.life<=0){scene.remove(o);o.geometry.dispose();o.material.dispose();fx.splice(i,1);}
    }
    if(!active){ui();return null;}
    state.cooldown=Math.max(0,state.cooldown-dtSafe);
    state.stagger=Math.max(0,state.stagger-dtSafe);
    state.dodgeTimer=Math.max(0,state.dodgeTimer-dtSafe);
    state.enemyStun=Math.max(0,state.enemyStun-dtSafe);
    state.enemyGuard=Math.max(0,state.enemyGuard-dtSafe);
    state.enemyEvade=Math.max(0,state.enemyEvade-dtSafe);
    state.counterWindow=Math.max(0,state.counterWindow-dtSafe);
    state.impactPause=Math.max(0,state.impactPause-dtSafe);
    state.comboTimer=Math.max(0,state.comboTimer-dtSafe);
    if(state.comboTimer===0&&state.attackTime===0)state.comboStep=0;
    if(state.guard)state.guardAge+=dtSafe;
    else state.guardAge=0;
    state.messageTimer=Math.max(0,state.messageTimer-dtSafe);
    state.stamina=clamp(state.stamina+(state.guard?7:21)*dtSafe,0,100);
    if(state.guard)state.stamina=Math.max(0,state.stamina-9*dtSafe);
    if(state.guard&&state.stamina<=0){state.guard=false;announce('GUARD BROKEN',1);}
    if(state.messageTimer===0&&state.enemyHealth>0&&state.health>0)state.message='J LIGHT · K HEAVY · I KICK · L GUARD · Q DODGE';
    const distance=vec(player,fighter);
    const dx=fighter.position.x-player.position.x,dz=fighter.position.z-player.position.z;
    const directionLen=Math.max(.0001,Math.hypot(dx,dz));
    const fxDir=Math.sin(facing),fzDir=Math.cos(facing);
    const facingScore=(dx*fxDir+dz*fzDir)/directionLen;
    // Short forward weight transfers tie full-body swing animation to actual
    // footwork. No teleporting: every lunge translates over several frames.
    const attacking=['Light','Cross','Heavy','Kick','Sweep','Parry'].includes(state.attackType);
    if(attacking&&state.attackLength>0&&distance>1.95){
      const phase=(state.attackLength-state.attackTime)/state.attackLength;
      if(phase<.44){
        const rush={Light:2.8,Cross:4.0,Heavy:3.1,Kick:3.6,Sweep:2.4,Parry:1.4}[state.attackType];
        const forwardStep=rush*Math.sin(Math.PI*Math.min(1,phase/.44))*dtSafe;
        player.position.x+=dx/directionLen*forwardStep;
        player.position.z+=dz/directionLen*forwardStep;
      }
    }
    // A short windup precedes the hitbox, and one contact resolves per strike.
    if(state.attackTime>0){
      const type=state.attackType,old=state.attackTime;
      state.attackTime=Math.max(0,old-dtSafe);
      const frame=contactFrame[type];
      if(frame!==undefined&&!state.hitApplied &&
         old>=state.attackLength-frame &&
         state.attackTime<state.attackLength-frame){
        state.hitApplied=true;
        if(distance<=range[type]&&facingScore>-.12&&state.enemyHealth>0&&state.enemyEvade<=0){
          const guarded=state.enemyGuard>0,counter=state.counterWindow>0;
          const damage=Math.max(2,Math.round((power[type]+(counter?9:0))*(guarded?.32:1)));
          state.enemyHealth=Math.max(0,state.enemyHealth-damage);
          state.damageDealt+=damage;state.hits++;state.combo++;
          state.enemyStun=stumble[type]+(counter?.16:0);
          state.enemyWindup=0;state.impactPause=.055;state.counterWindow=0;
          const push=type==='Light'?.18:type==='Cross'?.25:.52;
          fighter.position.x+=dx/directionLen*push;
          fighter.position.z+=dz/directionLen*push;
          effect(new THREE.Vector3(fighter.position.x,2.8,fighter.position.z),damage);
          announce((guarded?'BLOCKED':counter?'COUNTER HIT':'HIT')+' '+damage+' · CHAIN '+state.combo,.75);
          if(state.enemyHealth===0){state.wins++;state.spawnTimer=2.4;announce('K.O.! · ROUND WON',2.2);}
        }else if(state.enemyEvade>0) {
          announce('RIVAL EVADED · TRACK THEIR STEP',.7);state.combo=0;
        }else{state.combo=0;announce('WHIFF · GET CLOSER',.65);}
      }
      // Move the collider through a real, short lateral evade, not just a pose.
      if(['Dodge','Slip'].includes(type)){
        const shift=dtSafe*(type==='Slip'?8.0:10.6);
        player.position.x+=dz/directionLen*state.evadeDir*shift;
        player.position.z-=dx/directionLen*state.evadeDir*shift;
        const radius=Math.hypot(player.position.x,player.position.z);
        if(radius>20){player.position.x*=20/radius;player.position.z*=20/radius;}
      }
      if(state.attackTime<=0){
        state.attackType=null;
        if(state.buffered){
          const buffered=state.buffered;state.buffered=null;state.cooldown=0;
          beginAttack(buffered);
        }
      }
    }
    if(state.enemyHealth===0){
      state.spawnTimer-=dtSafe;
      fighter.rotation.z=.28*Math.sin(Math.max(0,state.spawnTimer)*4);
      if(state.spawnTimer<=0){state.round++;resetRound();fighter.rotation.z=0;}
    }else if(state.health>0){
      const x=player.position.x-fighter.position.x,z=player.position.z-fighter.position.z;
      const len=Math.max(.001,Math.hypot(x,z));
      fighter.rotation.y=Math.atan2(x,z);
      if(state.enemyStun<=0){
        if(distance>3.45){
          const speed=2.1+Math.min(1.4,state.round*.11);
          fighter.position.x+=x/len*speed*dtSafe;
          fighter.position.z+=z/len*speed*dtSafe;
        }else{
          fighter.position.x+=z/len*.36*dtSafe;
          fighter.position.z-=x/len*.36*dtSafe;
        }
        state.enemyAttack-=dtSafe;
        if(state.enemyAttack<=0&&distance<4.2){
          state.enemyAttack=1.18+Math.random()*.65-Math.min(.30,state.round*.02);
          state.enemyWindup=.36;announce('INCOMING · SLIP OR GUARD',.43);
          state.enemyGuard=.13;
        }
        if(state.enemyWindup>0){
          state.enemyWindup-=dtSafe;
          if(state.enemyWindup<=0&&distance<4.5){
            if(state.dodgeTimer>.04){
              announce('PERFECT EVADE · COUNTER NOW',.8);
              state.counterWindow=.55;
            }else{
              const blocked=state.guard&&state.stamina>3;
              if(blocked&&state.guardAge<.32){
                state.counterWindow=.58;
                announce('PERFECT PARRY · COUNTER NOW',.8);
                state.enemyStun=.36;
              }
              const damage=blocked?2:8+Math.min(12,state.round*2);
              state.health=Math.max(0,state.health-damage);
              state.enemyHits++;state.combo=0;
              if(blocked){state.stamina=Math.max(0,state.stamina-12);announce('GUARDED · '+damage,.7);}
              else{state.stagger=.30;announce('YOU TOOK '+damage+' DAMAGE',.8);}
              if(state.health===0){state.defeated=true;state.spawnTimer=3.2;announce('DEFEATED · RESTARTING MATCH',2.6);}
            }
          }
        }
      }
    }
    if(state.defeated){state.spawnTimer-=dtSafe;if(state.spawnTimer<=0)resetMatch();}
    const seconds=performance.now()*.001;
    if(rivalMixer){
      let next='Ready';
      if(state.enemyHealth<=0||state.enemyStun>0)next='Hit';
      else if(state.enemyEvade>0)next='Slip';
      else if(state.enemyWindup>0)next='Cross';
      else if(distance>3.45)next='Walk';
      if(next!==rivalState){
        rivalActions[rivalState]?.fadeOut(.15);
        rivalActions[next].reset().fadeIn(.15).play();
        rivalState=next;
      }
      rivalMixer.update(dtSafe);
    }
    if(!rivalMixer)for(const [name,part] of Object.entries(poseParts)){
      const side=name==='L'?1:-1;
      part.upper.rotation.x=.15+Math.sin(seconds*2+side)*.16+(state.enemyWindup>0?-.95:0);
      part.lower.rotation.x=-.48+(state.enemyWindup>0?-.52:0);
      part.leg.rotation.x=distance>3.45?Math.sin(seconds*7+side*Math.PI)*.22:0;
      part.shin.rotation.x=distance>3.45?Math.max(0,Math.sin(seconds*7+side*Math.PI))*.18:0;
    }
    ui();
    if(state.health<=0)return 'Hit';
    if(state.stagger>0)return 'Hit';
    if(state.attackType)return state.attackType;
    if(state.guard)return 'Guard';
    if(!moving && distance<13)return 'Ready';
    return null;
  }
  ui();
  return {state,fighter,begin,pause,resetMatch,queue,tick,arenaRadius:22};
}

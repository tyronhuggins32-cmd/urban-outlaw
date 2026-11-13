/* Fail-closed visual approval gate for the independent hand-sculpted V5 outfit. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

const dir=path.resolve(__dirname,'../art/v5');
const contract=JSON.parse(fs.readFileSync(path.join(dir,'approval-contract.json'),'utf8'));
const candidate=path.join(dir,'candidates/v5-clothes-rigged.glb');
const source=path.join(dir,'source/clothes-sculpt.glb');
const angles=['front','side','back','three-quarter'];
const actions=['guard','jab','kick','ninja-run'];
const expectedImages=[...angles,...actions].map(name=>path.join(dir,'proofs',name+'.png'));
const required=[
  {name:'source DCC sculpt',file:source},
  {name:'rigged candidate GLB',file:candidate},
  ...expectedImages.map(file=>({name:'comparison image',file}))
];
const failed=required.filter(x=>!fs.existsSync(x.file))
  .map(x=>x.name+': '+path.relative(process.cwd(),x.file)+' absent');

if(contract.state!=='APPROVED')failed.push('approval state is '+contract.state);
if(contract.release_policy!=='DO_NOT_MERGE_OR_DEPLOY_UNLESS_ALL_ACCEPTANCE_CRITERIA_PASS')
  failed.push('unsafe release policy');
if(contract.targets.verification.explicit_approval!==true)
  failed.push('reference sheet visual inspection has not approved all criteria');
if(contract.last_baseline.status!=='REJECTED')
  failed.push('prior 8.2 baseline was not marked as failing');

const signoff=path.join(dir,'visual-signoff.json');
if(fs.existsSync(signoff)){
  const data=JSON.parse(fs.readFileSync(signoff,'utf8'));
  const requiredKeys=contract.targets.verification.mandatory_manual_checks;
  const missing=requiredKeys.filter(k=>data.checks?.[k]!==true);
  if(missing.length)failed.push(...missing.map(k=>'visual discrepancy not signed off: '+k));
  if(data.model_sha!==contract.verification?.model_sha)
    failed.push('signoff does not match current candidate model SHA');
}else failed.push('visual-signoff.json absent');

if(fs.existsSync(candidate)){
 const stat=fs.statSync(candidate);
 if(stat.size<200000)failed.push('candidate garment file too small to represent fully sculpted outfit');
}
if(failed.length){
  console.error('\nV5 REFERENCE APPROVAL: REJECTED. Live game must stay unchanged.\n');
  for(const reason of failed)console.error(' - '+reason);
  process.exitCode=1;
}else{
  console.log('V5 REFERENCE APPROVAL: PASSED; authorized to request main-branch integration');
}

#!/usr/bin/env node
/*
 * Reference-lock V5 shirt gate.
 * --audit (default): print every check and current evidence, without
 *                  pretending the model passed visual approval.
 * --require-pass:   fail CI unless signed, hash-matched review has passed
 *                  ALL criteria and all original screenshot proofs exist.
 *
 * A successfully exported GLB or skinned mesh is NEVER sufficient for release.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../art/v5');
const criteria=JSON.parse(fs.readFileSync(path.join(root,'shirt-approval-criteria.json'),'utf8'));
const review=JSON.parse(fs.readFileSync(path.join(root,'shirt-latest-audit.json'),'utf8'));
const strict=process.argv.includes('--require-pass');
const validStatuses=new Set(['PASS','FAIL','UNVERIFIED']);
const violations=[];
const failure=(reason)=>violations.push(reason);
const ids=criteria.rules.map(r=>r.id);
if(new Set(ids).size!==ids.length)failure('Duplicate approval criterion');
if(criteria.release_rule!=='ALL_BLOCKERS_PASS_OR_DO_NOT_DEPLOY')failure('Release rule changed');
if(ids.length<20)failure('Reference approval criteria unexpectedly reduced');
for(const id of Object.keys(review.checks||{}))if(!ids.includes(id))failure('Unknown check: '+id);
for(const rule of criteria.rules){
 const item=review.checks?.[rule.id];
 if(!item){failure('Missing check '+rule.id);continue;}
 if(!validStatuses.has(item.status))failure('Invalid '+rule.id+' state: '+item.status);
 if(!item.finding||!item.required_change||!item.evidence)
  failure('Missing evidence/finding/correction for '+rule.id);
}
const count=Object.values(review.checks||{}).reduce((map,c)=>{
  map[c.status]=(map[c.status]||0)+1;return map;},{PASS:0,FAIL:0,UNVERIFIED:0});
const report={
  status:review.status,criteria:ids.length,
  passed:count.PASS,failed:count.FAIL,unverified:count.UNVERIFIED,
  candidate:review.candidate?.name,candidate_sha256:review.candidate?.sha256,
  live_release_permitted:false
};
if(review.status==='APPROVED'&&(count.FAIL||count.UNVERIFIED))
 failure('Approved review still contains FAILED or UNVERIFIED checks');
if(review.candidate?.sha256?.length!==64)failure('Candidate SHA-256 invalid');
const refSha=review.reference_sha256||{};
for(const view of ['front','back']){
  if(refSha[view]!==criteria.reference?.[view]?.sha256)
    failure('Reference close-up SHA mismatch for '+view);
}
console.log('SHIRT VISUAL AUDIT',JSON.stringify(report,null,2));
for(const rule of criteria.rules){
 const status=review.checks?.[rule.id]?.status||'MISSING';
 console.log('  '+String(status).padEnd(11)+' '+rule.id+'  '+rule.criterion);
}
if(strict){
  if(review.status!=='APPROVED')failure('Current visual review status is '+review.status);
  if(count.FAIL||count.UNVERIFIED)failure('There are '+count.FAIL+' failed and '+count.UNVERIFIED+' unverified criteria');
  const model=path.join(root,'generated/v5-shirt-candidate.glb');
  const approved=path.join(root,'shirt-release-signoff.json');
  if(!fs.existsSync(model))failure('Candidate GLB not staged for exact-hash inspection');
  const shaFile=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  if(fs.existsSync(model)&&shaFile(model)!==review.candidate.sha256)
    failure('Visual review is stale: current GLB hash differs from signed candidate');
  for(const view of ['front','back']){
    const referencePath=path.join(root,'references',criteria.reference[view].filename);
    if(!fs.existsSync(referencePath)){
      failure('Source screenshot missing in reference staging: '+criteria.reference[view].filename);
    }else if(shaFile(referencePath)!==criteria.reference[view].sha256){
      failure('Source screenshot content differs from the user-supplied close-up: '+view);
    }
  }
  for(const file of criteria.proofs_required){
    if(!fs.existsSync(path.join(root,'generated',file)))
      failure('Missing actual render proof: '+file);
  }
  if(!fs.existsSync(approved)){
    failure('No explicit release signoff for this candidate and every criterion');
  }else{
    const sign=JSON.parse(fs.readFileSync(approved,'utf8'));
    if(!sign.approver||typeof sign.approver!=='string'||sign.approver.trim().length<3)
      failure('No accountable visual reviewer');
    if(!sign.approved_at||Number.isNaN(Date.parse(sign.approved_at)))
      failure('No valid release review date');
    if(sign.candidate_sha256!==review.candidate.sha256)
      failure('Release signoff is for a different GLB');
    if(sign.reference_front_sha256!==refSha.front||sign.reference_back_sha256!==refSha.back)
      failure('Release signoff uses different reference images');
    if(sign.decision!=='APPROVED')failure('Release reviewer did not approve candidate');
    for(const id of ids){
      const evidence=sign.checks?.[id];
      if(!evidence||evidence.status!=='PASS'||!evidence.proof||evidence.proof.length<5)
        failure('Release signoff missing direct passing evidence for '+id);
    }
  }
  if(!violations.length)report.live_release_permitted=true;
}
if(violations.length){
  console.error('\nGATE ERRORS:\n'+violations.map(x=>' - '+x).join('\n'));
  process.exitCode=1;
}else{
 console.log(strict?'RELEASE GATE: PASS':'AUDIT FORMAT: VALID (NOT A RELEASE APPROVAL)');
}

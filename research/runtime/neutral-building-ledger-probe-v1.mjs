import assert from "node:assert/strict";
export const tasks=Array.from({length:8},(_,taskIndex)=>({taskIndex,orientation:Math.floor(taskIndex/4),rubble:Math.floor(taskIndex/2)%2===1,repeat:taskIndex%2,seed:3100300000+Math.floor(taskIndex/4)}));
export function fixtureMap(template,rubble){
 assert.equal(typeof rubble,"boolean");
 assert.ok(!template.includes("[Structures]"));assert.ok(!template.includes("[GAPOWR]"));
 return template.replace("Name=No name","Name=Neutral Ledger Technical "+Number(rubble))+
  "\n[Structures]\n0=Neutral,GAPOWR,256,50,50,0,None,0,0,1,0,0,0,0,0,0,0\n\n[GAPOWR]\nStrength=100\nCrewed=no\nExplodes=no\nLeaveRubble="+(rubble?"yes":"no")+"\n";
}
export function rejectCompetitiveKeys(value){
 if(!value||typeof value!=="object")return;
 for(const [k,v]of Object.entries(value)){assert.ok(!/winner|score|defeat|terminal|ranking|winrate|losses|draws/i.test(k),"Prohibited competitive key "+k);rejectCompetitiveKeys(v);}
}
export function probeChecks({updates,earlyFinish,attacks,destroyEvents,boundaries,task,targetId,initialOwner,attackerName,destroyType,unspawnType}){
 const b=boundaries[0];
 return {fixedHorizon:updates===6000,noUnexpectedFinish:!earlyFinish,scriptedAttack:attacks>0,oneDestruction:destroyEvents===1&&boundaries.length===1,
  attackerEstablished:!!b?.attackerBuildingEstablished,attributed:!!b?.events.some(e=>e.type===destroyType&&e.attackerPlayerName===attackerName),
  unspawnObserved:!!b?.events.some(e=>e.type===unspawnType),
  excludedFromOwned:b?.targetInOwned===false,excludedFromCandidate:!!b&&!b.post.live.some(r=>r.id===targetId),
  worldLifecycle:!!b&&(task.rubble?b.targetInWorld&&b.targetHealth===0&&b.ownerTag===initialOwner:!b.targetInWorld),
  candidateRecognized:b?.strictAttributionRecognized===true,legacyAsExpected:b?.legacyAttributionRecognized===!task.rubble};
}

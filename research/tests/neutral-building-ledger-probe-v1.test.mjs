import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {PROBE_RELATIVE_ROOT,tasks,fixtureMap,rejectCompetitiveKeys,probeChecks,scriptedOrders,compactTechnicalError} from "../runtime/neutral-building-ledger-probe-v1.mjs";
test("exact eight-task balanced crossed design with paired deterministic repeats",()=>{
 assert.equal(tasks.length,8);assert.equal(new Set(tasks.map(t=>t.taskIndex)).size,8);
 for(let i=0;i<8;i+=2){assert.deepEqual({...tasks[i],taskIndex:0,repeat:0},{...tasks[i+1],taskIndex:0,repeat:0});}
 assert.equal(tasks.filter(t=>t.rubble).length,4);assert.equal(tasks.filter(t=>t.orientation===1).length,4);
});
test("fixture changes only declared rules and adds one known neutral target",()=>{
 const template="[Basic]\nName=No name\n[Map]\nSize=0,0,50,50\n";
 for(const rubble of [false,true]){const f=fixtureMap(template,rubble);assert.equal(f.split("0=Neutral,GAPOWR").length,2);assert.ok(f.includes("LeaveRubble="+(rubble?"yes":"no")));assert.ok(f.includes("Size=0,0,50,50"));}
 assert.throws(()=>fixtureMap(template+"[Structures]",true));assert.throws(()=>fixtureMap(template+"[GAPOWR]",false));
});
test("recursive audit excludes competitive labels even when nested in arrays",()=>{
 rejectCompetitiveKeys({source:"x",checks:{fixedHorizon:true},events:[{attackerPlayerName:"A"}]});
 for(const key of ["winner","score","defeated","terminalBuildingCounts","ranking","winRate","losses","draws"])
  assert.throws(()=>rejectCompetitiveKeys({a:[{[key]:0}]}));
});
const setup=rubble=>({updates:6000,earlyFinish:false,attacks:1,destroyEvents:1,task:{rubble},targetId:2,initialOwner:"Neutral",attackerName:"A",destroyType:3,unspawnType:2,boundaries:[{attackerBuildingEstablished:true,events:[{type:3,attackerPlayerName:"A"},{type:2}],targetInOwned:false,post:{live:[{id:1}]},targetInWorld:rubble,targetHealth:rubble?0:null,ownerTag:rubble?"Neutral":null,strictAttributionRecognized:true,legacyAttributionRecognized:!rubble}]});
test("rubble and no-rubble require opposite legacy behavior but same strict attribution",()=>{
 for(const rubble of [false,true])assert.ok(Object.values(probeChecks(setup(rubble))).every(Boolean));
});
test("missing actions, early finish, repeated events, stale membership and wrong attribution fail",()=>{
 const variants=[
  x=>{x.attacks=0;},x=>{x.updates=5999;},x=>{x.earlyFinish=true;},x=>{x.destroyEvents=2;},
  x=>{x.boundaries[0].targetInOwned=true;},x=>{x.boundaries[0].post.live.push({id:2});},
  x=>{x.boundaries[0].events[0].attackerPlayerName="Other";},x=>{x.boundaries[0].ownerTag="Other";},
  x=>{x.boundaries[0].legacyAttributionRecognized=true;},x=>{x.boundaries=[];},
 ];
 for(const mutate of variants){const x=setup(true);mutate(x);assert.ok(Object.values(probeChecks(x)).some(v=>v===false));}
});

test("program and Slurm use the same new immutable amendment root",()=>{
 const program=fs.readFileSync(new URL("../scripts/neutral-building-ledger-probe-v1.mjs",import.meta.url),"utf8");
 const shell=fs.readFileSync(new URL("../slurm/neutral_building_ledger_probe_v1.sbatch",import.meta.url),"utf8");
 assert.ok(program.includes("path.join(project,PROBE_RELATIVE_ROOT)"));
 assert.equal(shell.match(/^PROBE=(.+)$/m)[1],"/nfs/roberts/project/pi_jss233/zc362/chrono_divide/"+PROBE_RELATIVE_ROOT);
});

test("no-target deployment uses DeploySelected, never the targeted Deploy overload",()=>{
 const orders={Deploy:9,DeploySelected:10,ForceAttack:3,Stop:11,Move:0},types={Vehicle:7,Infantry:3};
 const own=[{id:1,rules:{name:"AMCV",type:7}},{id:2,rules:{name:"MTNK",type:7}}];
 const base={tick:0,own,targetId:5,target:{hitPoints:100},targetVisible:true,types,orders};
 assert.deepEqual(scriptedOrders(base),[{ids:[1],type:10}]);
 assert.deepEqual(scriptedOrders({...base,tick:119}),[]);
 assert.deepEqual(scriptedOrders({...base,tick:120}),[]);
 assert.deepEqual(scriptedOrders({...base,tick:300}),[{ids:[2],type:3,targetId:5}]);
 assert.deepEqual(scriptedOrders({...base,tick:300,target:{hitPoints:0}}),[{ids:[2],type:11}]);
 assert.deepEqual(scriptedOrders({...base,tick:300,targetId:null}),[]);
});
test("technical errors retain bounded stack frames and explicit simulation progress",()=>{
 const e={message:"read obj",stack:"TypeError: read obj\n"+"x".repeat(900000)+"\n    at f (a.js:1:2)\n    at g (b.js:3:4)"};
 const r=compactTechnicalError(e,{phase:"game-update",completedUpdates:0});
 assert.equal(r.frames.length,2);assert.equal(r.progress.completedUpdates,0);assert.ok(JSON.stringify(r).length<500);
});

test("scout to the fixed fixture position before force-attacking a visible target",()=>{
 const orders={DeploySelected:10,ForceAttack:3,Stop:11,Move:0},types={Vehicle:7,Infantry:3};
 const base={tick:180,own:[{id:2,rules:{name:"MTNK",type:7}}],targetId:5,target:{hitPoints:100},targetVisible:false,types,orders};
 assert.deepEqual(scriptedOrders(base),[{ids:[2],type:0,rx:50,ry:50}]);
 assert.deepEqual(scriptedOrders({...base,tick:300}),[{ids:[2],type:0,rx:50,ry:50}]);
 assert.deepEqual(scriptedOrders({...base,tick:300,targetVisible:true}),[{ids:[2],type:3,targetId:5}]);
 assert.deepEqual(scriptedOrders({...base,tick:180,targetVisible:true}),[]);
 assert.deepEqual(scriptedOrders({...base,tick:300,target:null}),[{ids:[2],type:11}]);
});

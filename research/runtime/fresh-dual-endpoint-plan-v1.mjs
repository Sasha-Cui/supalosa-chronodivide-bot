import assert from "node:assert/strict";
import crypto from "node:crypto";
export const ROOT_RELATIVE="research-evidence/fresh-dual-endpoint-v1";
export const COUNTRIES=["Americans","Alliance","French","Germans","British","Africans","Arabs","Confederation","Russians"];
export const SEED_RANGE={minimum:3765000000,maximumExclusive:3770000000};
export const BASES={central:3765000000,peak:3766000000,transfer:3767000000,advanced:3768000000,canary:3769000000};
export const CENSUS_SHA256="5715eef27a8dc0b4b24f3ea2909c83ef2d15c3ea546a7c16b9b3a61b1583d1c5";
export const ALLOCATION_SHA256="5a838bd9cb3edf06df288914ad5cea60b61983f29d183a1efdeb5a3c90e3295e";
export const PROTOCOL_SHA256="eb328eb5b1e01c1732323f4fd54f2b2c4820fbe302f78cdc96d754ae5a2b0190";
export const SEED_AMENDMENT_SHA256="9aee128121a0851fc1b648d942907b193640def8ffea6e30084c1867b6321658";
export const HFO={id:"hfo-le",label:"HFO LE",fileName:"cd_chrono_4_heck_freezes_over_le.map",sha256:"e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d",startCount:4,family:"hfo-reference"};
export const PEAK={id:"peak",label:"Peak of Perfection",fileName:"cd_2_peak_of_perfection.map",sha256:"440715dc154ac10b4b922159824140d40c48990311c6838345b66958f3b3a442",startCount:2,family:"peak-reference"};
const OPPOSITE={"39,82":"151,119","151,119":"39,82","88,34":"88,157","88,157":"88,34","37,73":"118,73","118,73":"37,73"};
export const hash=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
export const ARMS={central:["deployed"],peak:["deployed","strategy_both"],transfer:["deployed"],advanced:["deployed","supalosa_reference"]};
export const opponentFor=cohort=>cohort==="advanced"?"ra2web_advanced":"pinned_supalosa";
export function parseStarts(bytes,expectedCount){
 let inside=false;const starts=new Map;
 for(const raw of bytes.toString("latin1").split(/\r?\n/)){
  const line=raw.replace(/;.*/,"").trim();if(line.startsWith("[")){inside=line.toLowerCase()==="[waypoints]";continue;}
  if(!inside)continue;const m=/^(\d+)\s*=\s*(\d+)$/.exec(line);if(!m||+m[1]>=8)continue;
  const index=+m[1],v=+m[2],y=Math.floor(v/1000),x=v-y*1000;
  assert.ok(!starts.has(index));starts.set(index,x+","+y);
 }
 assert.equal(starts.size,expectedCount);const ordered=Array.from({length:expectedCount},(_,i)=>{assert.ok(starts.has(i));return starts.get(i);});
 assert.equal(new Set(ordered).size,expectedCount);return ordered;
}
export function rejectOutcomeKeys(value){
 if(!value||typeof value!=="object")return;
 for(const [key,child]of Object.entries(value)){assert.ok(!/winner|defeat|score|terminal|winrate|losses|draws|ranking/i.test(key),"Prohibited outcome key "+key);rejectOutcomeKeys(child);}
}
const cleanMap=m=>({id:m.id,label:m.label,fileName:m.fileName,sha256:m.sha256,startCount:m.startCount,family:m.family});
export function buildPlan(census,allocation,hfoStarts,peakStarts){
 assert.equal(census.complete,true);assert.equal(census.passed,true);assert.equal(census.outcomeFree,true);
 assert.equal(allocation.complete,true);assert.equal(allocation.passed,true);assert.equal(allocation.outcomeFree,true);
 assert.equal(census.maps.length,13);assert.equal(allocation.plan.maps.length,13);assert.equal(allocation.plan.screenCount,900);
 assert.equal(allocation.censusSha256,CENSUS_SHA256);
 assert.deepEqual([...hfoStarts].sort(),["39,82","151,119","88,34","88,157"].sort());
 assert.deepEqual([...peakStarts].sort(),["37,73","118,73"].sort());
 const maps=[{...HFO,starts:hfoStarts},{...PEAK,starts:peakStarts}],cases=[],blocks=[],games=[];
 const addBlock=(cohort,map,repeats,seedBase,opponentIndex)=>{
  const blockIndex=blocks.length,caseIndices=[];let pairIndex=0;
  for(let countryOrdinal=0;countryOrdinal<9;countryOrdinal++)for(let start=0;start<map.startCount;start++)for(let repeat=0;repeat<repeats;repeat++){
   const opposing=opponentIndex(countryOrdinal,start);assert.ok(Number.isSafeInteger(opposing)&&opposing>=0&&opposing<map.startCount&&opposing!==start);
   const seed=seedBase+pairIndex,pairId=cohort+":"+map.id+":"+countryOrdinal+":"+start+":"+repeat;
   for(const slot of [0,1]){
    const caseIndex=cases.length;caseIndices.push(caseIndex);
    cases.push({caseIndex,caseId:"fresh-dual-v1-"+String(caseIndex).padStart(4,"0"),blockIndex,cohort,mapId:map.id,
     countryOrdinal,country:COUNTRIES[countryOrdinal],candidateStartOrdinal:start,opponentStartOrdinal:opposing,
     candidateStart:map.starts[start],opponentStart:map.starts[opposing],candidateSlot:slot,repeatIndex:repeat,pairIndex,pairId,requestedEngineSeed:seed});
   }
   pairIndex++;
  }
  blocks.push({blockIndex,cohort,mapId:map.id,caseIndices,caseCount:caseIndices.length});
 };
 addBlock("central",maps[0],10,BASES.central,(_,i)=>hfoStarts.indexOf(OPPOSITE[hfoStarts[i]]));
 addBlock("peak",maps[1],5,BASES.peak,(_,i)=>peakStarts.indexOf(OPPOSITE[peakStarts[i]]));
 for(let mapIndex=0;mapIndex<13;mapIndex++){
  const entry=census.maps[mapIndex],a=allocation.plan.maps[mapIndex],m=cleanMap(entry.map);
  assert.equal(a.mapIndex,mapIndex);assert.equal(a.mapId,m.id);assert.equal(a.mapSha256,m.sha256);assert.equal(a.screenIndices.length,18*m.startCount);
  const starts=Array.from({length:m.startCount},(_,i)=>{
   const positions=[...new Set(entry.cases.filter(c=>c.candidateStartOrdinal===i).map(c=>c.candidateStart))];assert.equal(positions.length,1);return positions[0];
  });
  const selected=a.screenIndices.map(i=>entry.cases[i]);assert.equal(new Set(a.screenIndices).size,a.screenIndices.length);
  const pairs=new Map;
  for(let c=0;c<9;c++)for(let s=0;s<m.startCount;s++){
   const rows=selected.filter(x=>x.countryOrdinal===c&&x.candidateStartOrdinal===s);assert.equal(rows.length,2);
   assert.deepEqual(rows.map(x=>x.candidateSlot).sort(),[0,1]);assert.ok(rows.every(x=>x.country===COUNTRIES[c]));
   assert.equal(rows[0].opponentStartOrdinal,rows[1].opponentStartOrdinal);
   assert.ok(rows.every(x=>x.opponentStart===starts[x.opponentStartOrdinal]));pairs.set(c+":"+s,rows[0].opponentStartOrdinal);
  }
  const map={...m,starts};maps.push(map);addBlock("transfer",map,1,BASES.transfer+mapIndex*10000,(c,s)=>pairs.get(c+":"+s));
 }
 addBlock("advanced",maps[0],5,BASES.advanced,(_,i)=>hfoStarts.indexOf(OPPOSITE[hfoStarts[i]]));
 for(const cohort of ["central","peak","transfer","advanced"])for(const arm of ARMS[cohort])for(const c of cases.filter(c=>c.cohort===cohort)){
  games.push({gameIndex:games.length,caseIndex:c.caseIndex,cohort,mapId:c.mapId,candidateArm:arm,opponent:opponentFor(cohort)});
 }
 const canaries=[
  {cohort:"central",mapId:HFO.id,candidateArm:"deployed",opponent:"pinned_supalosa",start:"39,82",opposing:"151,119"},
  {cohort:"peak",mapId:PEAK.id,candidateArm:"strategy_both",opponent:"pinned_supalosa",start:"118,73",opposing:"37,73"},
  {cohort:"advanced",mapId:HFO.id,candidateArm:"deployed",opponent:"ra2web_advanced",start:"39,82",opposing:"151,119"},
  {cohort:"advanced",mapId:HFO.id,candidateArm:"supalosa_reference",opponent:"ra2web_advanced",start:"39,82",opposing:"151,119"},
 ].map((c,canaryIndex)=>{
  const map=maps.find(m=>m.id===c.mapId);return {canaryIndex,mapId:c.mapId,candidateArm:c.candidateArm,opponent:c.opponent,country:"Americans",countryOrdinal:0,
   candidateSlot:0,candidateStart:c.start,opponentStart:c.opposing,candidateStartOrdinal:map.starts.indexOf(c.start),opponentStartOrdinal:map.starts.indexOf(c.opposing),
   requestedEngineSeed:BASES.canary+canaryIndex,modes:["v5_reference","dual"],maxUpdates:6000};
 });
 const seeds=[...new Set([...cases,...canaries].map(c=>c.requestedEngineSeed))].sort((a,b)=>a-b);
 const plan={kind:"fresh-dual-endpoint-plan-v1",outcomeFree:true,protocolSha256:PROTOCOL_SHA256,seedAmendmentSha256:SEED_AMENDMENT_SHA256,
  censusSha256:CENSUS_SHA256,allocationSha256:ALLOCATION_SHA256,seedRange:SEED_RANGE,countries:COUNTRIES,maps,blocks,cases,games,canaries,uniqueSeeds:seeds,
  counts:{maps:15,blocks:16,cases:2160,games:2700,canaryConfigurations:4,canaryGames:8,uniqueSeeds:1084}};
 validatePlan(plan);return plan;
}
export function validatePlan(p){
 rejectOutcomeKeys(p);assert.equal(p.kind,"fresh-dual-endpoint-plan-v1");assert.equal(p.outcomeFree,true);
 assert.equal(p.protocolSha256,PROTOCOL_SHA256);assert.equal(p.seedAmendmentSha256,SEED_AMENDMENT_SHA256);assert.deepEqual(p.seedRange,SEED_RANGE);assert.deepEqual(p.countries,COUNTRIES);
 assert.equal(p.cases.length,2160);assert.equal(p.games.length,2700);assert.equal(p.maps.length,15);assert.equal(p.blocks.length,16);assert.equal(p.canaries.length,4);
 assert.equal(new Set(p.maps.map(m=>m.id)).size,15);assert.equal(new Set(p.cases.map(c=>c.caseId)).size,2160);
 const pairs=new Map,seedPairs=new Map;
 for(const [i,c]of p.cases.entries()){
  assert.equal(c.caseIndex,i);assert.equal(c.country,COUNTRIES[c.countryOrdinal]);assert.ok([0,1].includes(c.candidateSlot));assert.notEqual(c.candidateStartOrdinal,c.opponentStartOrdinal);
  const m=p.maps.find(m=>m.id===c.mapId);assert.equal(c.candidateStart,m.starts[c.candidateStartOrdinal]);assert.equal(c.opponentStart,m.starts[c.opponentStartOrdinal]);
  const group=pairs.get(c.pairId)??[];group.push(c);pairs.set(c.pairId,group);
 }
 assert.equal(pairs.size,1080);
 for(const [id,rows]of pairs){
  assert.equal(rows.length,2);assert.deepEqual(rows.map(c=>c.candidateSlot),[0,1]);assert.equal(rows[0].requestedEngineSeed,rows[1].requestedEngineSeed);
  assert.equal(rows[0].opponentStartOrdinal,rows[1].opponentStartOrdinal);assert.ok(!seedPairs.has(rows[0].requestedEngineSeed));seedPairs.set(rows[0].requestedEngineSeed,id);
 }
 assert.equal(new Set(p.canaries.map(c=>c.requestedEngineSeed)).size,4);assert.ok(p.canaries.every(c=>!seedPairs.has(c.requestedEngineSeed)));
 const all=[...new Set([...p.cases,...p.canaries].map(c=>c.requestedEngineSeed))].sort((a,b)=>a-b);assert.equal(all.length,1084);assert.deepEqual(p.uniqueSeeds,all);
 assert.ok(all.every(s=>Number.isSafeInteger(s)&&s>=SEED_RANGE.minimum&&s<SEED_RANGE.maximumExclusive));
 for(const [i,block]of p.blocks.entries()){
  assert.equal(block.blockIndex,i);const map=p.maps.find(m=>m.id===block.mapId),repeats={central:10,peak:5,transfer:1,advanced:5}[block.cohort];
  const transferIndex=p.maps.slice(2).findIndex(m=>m.id===map.id),base=BASES[block.cohort]+(block.cohort==="transfer"?transferIndex*10000:0);
  assert.equal(block.caseCount,18*map.startCount*repeats);assert.equal(block.caseIndices.length,block.caseCount);
  let at=0;
  for(let country=0;country<9;country++)for(let start=0;start<map.startCount;start++)for(let repeat=0;repeat<repeats;repeat++)for(const slot of [0,1]){
   const c=p.cases[block.caseIndices[at++]];assert.equal(c.blockIndex,i);assert.equal(c.cohort,block.cohort);assert.equal(c.mapId,block.mapId);
   assert.equal(c.countryOrdinal,country);assert.equal(c.candidateStartOrdinal,start);assert.equal(c.repeatIndex,repeat);assert.equal(c.candidateSlot,slot);
   assert.equal(c.pairIndex,(country*map.startCount+start)*repeats+repeat);assert.equal(c.requestedEngineSeed,base+c.pairIndex);
   assert.equal(c.pairId,block.cohort+":"+map.id+":"+country+":"+start+":"+repeat);
   assert.equal(c.caseId,"fresh-dual-v1-"+String(c.caseIndex).padStart(4,"0"));
   if(block.cohort!=="transfer")assert.equal(c.opponentStart,OPPOSITE[c.candidateStart]);
  }
 }
 for(const [i,c]of p.canaries.entries()){
  assert.equal(c.canaryIndex,i);assert.equal(c.requestedEngineSeed,BASES.canary+i);assert.equal(c.country,"Americans");assert.equal(c.countryOrdinal,0);assert.equal(c.candidateSlot,0);
  assert.deepEqual(c.modes,["v5_reference","dual"]);assert.equal(c.maxUpdates,6000);
  const map=p.maps.find(m=>m.id===c.mapId);assert.equal(c.candidateStart,map.starts[c.candidateStartOrdinal]);assert.equal(c.opponentStart,map.starts[c.opponentStartOrdinal]);
  assert.equal(c.candidateStart,i===1?"118,73":"39,82");assert.equal(c.opponentStart,i===1?"37,73":"151,119");
  assert.equal(c.candidateArm,i===1?"strategy_both":i===3?"supalosa_reference":"deployed");assert.equal(c.opponent,i<2?"pinned_supalosa":"ra2web_advanced");
 }
 const partition=p.blocks.flatMap(b=>b.caseIndices).sort((a,b)=>a-b);assert.deepEqual(partition,p.cases.map(c=>c.caseIndex));
 const expectedCounts={central:[720,720],peak:[180,360],transfer:[900,900],advanced:[360,720]};
 for(const [cohort,[nc,ng]]of Object.entries(expectedCounts)){
  assert.equal(p.cases.filter(c=>c.cohort===cohort).length,nc);assert.equal(p.games.filter(g=>g.cohort===cohort).length,ng);
 }
 for(const [i,g]of p.games.entries()){assert.equal(g.gameIndex,i);const c=p.cases[g.caseIndex];assert.equal(g.cohort,c.cohort);assert.equal(g.mapId,c.mapId);assert.equal(g.opponent,opponentFor(g.cohort));assert.ok(ARMS[g.cohort].includes(g.candidateArm));}
 for(const c of p.cases)assert.deepEqual(p.games.filter(g=>g.caseIndex===c.caseIndex).map(g=>g.candidateArm),ARMS[c.cohort]);
 return true;
}

// Engine-free pre-S1 baseline. The capture command is single-source/single-use.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {SupalosaBot} from '../../packages/chronodivide-bot/dist/bot/bot.js';
import {Countries} from '../../packages/chronodivide-bot/dist/bot/logic/common/utils.js';
import {referenceD1Traces} from './unified-intent-d1-golden.mjs';
export const S1_GOLDEN_SOURCE='f19009edc8a11254e1f7d09a6b317e73dd9c8490';
export const S1_GOLDEN_URL=new URL('../fixtures/strategic-s1-prechange.json',import.meta.url);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export function syntheticS1BotTrace(observe=false){
 const calls=[],snapshots=[];let tick=0;const actions=Object.fromEntries(['quitGame','queueForProduction','orderUnits','setGlobalDebugText'].map(method=>[method,(...args)=>{calls.push({tick,method,args});return method+'-result';}]));
 const game={getCurrentTick:()=>tick,getVisibleUnits:()=>tick===12?[]:[1],getPlayerData:()=>({credits:10000}),getTickRate:()=>15};
 const mission={getUniqueName:()=> 'golden-mission',getPriority:()=>10,isActive:()=>true,getUnitIds:()=>[3,1,2]};
 const missions={getMissions:()=>[mission],getRequestedUnitTypes:()=>({MTNK:{priority:10,specificLocation:null}}),onAiUpdate:()=>{calls.push({tick,event:'mission-update'});actions.queueForProduction(0,'MTNK',1);}};
 const strategy={onAiUpdate:()=>{calls.push({tick,event:'strategy-update'});return strategy;}};
 const bot=new SupalosaBot('OD1Candidate',Countries.USA,[],false,strategy);
 bot.tickRatio=3;bot.missionController=missions;bot.matchAwareness={getThreatCache:()=>({}),onAiUpdate:()=>calls.push({tick,event:'awareness-update'})};bot.queueController={onAiUpdate:()=>actions.orderUnits([1],0,10,11)};
 Object.defineProperty(bot,'context',{value:{game,player:{name:'OD1Candidate',actions,production:{}}}});Object.defineProperty(bot,'gameApi',{value:game});bot.getDebugMode=()=>false;
 for(tick of [1,2,3,6,12,89,90,91]){if(observe)snapshots.push(bot.getResearchMissionSnapshot());bot.onGameTick(game);if(observe)snapshots.push(bot.getResearchMissionSnapshot());}
 return {behavior:{calls,lastAttackTick:bot.tickOfLastAttackOrder,debugMessages:bot._debugMessages,globalDebugText:bot._globalDebugText},snapshots};
}
export function referenceS1Traces(){return {inheritedPolicy:syntheticS1BotTrace().behavior,originalActionBoundaryAndDefaults:referenceD1Traces()};}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 assert.deepEqual(process.argv.slice(2),['--capture-prechange']);const repo=fileURLToPath(new URL('../../',import.meta.url)),git=(...a)=>execFileSync('git',a,{cwd:repo});assert.equal(git('rev-parse','HEAD').toString().trim(),S1_GOLDEN_SOURCE);
 const sourcePaths=['packages/chronodivide-bot/src/bot/bot.ts','packages/chronodivide-bot/src/bot/logic/mission/missionController.ts','packages/chronodivide-bot/src/bot/logic/mission/mission.ts','packages/chronodivide-bot/src/bot/strongBot.ts'];const sources=Object.fromEntries(sourcePaths.map(p=>{const b=fs.readFileSync(repo+p);assert.deepEqual(b,git('show',S1_GOLDEN_SOURCE+':'+p));return [p,hash(b)];}));
 const compiled=['packages/chronodivide-bot/dist/bot/bot.js','packages/chronodivide-bot/dist/bot/strongBot.js'].map(p=>({path:p,sha256:hash(fs.readFileSync(repo+p))}));
 const value={kind:'strategic-s1-prechange-golden-v1',sourceCommit:S1_GOLDEN_SOURCE,generatorSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),sources,compiled,syntheticOnly:true,gameInitializations:0,advancingEpisodes:0,expected:referenceS1Traces()},data=JSON.stringify(value,null,2)+'\n';fs.writeFileSync(S1_GOLDEN_URL,data,{flag:'wx'});assert.equal(fs.readFileSync(S1_GOLDEN_URL,'utf8'),data);console.log(JSON.stringify({path:fileURLToPath(S1_GOLDEN_URL),bytes:Buffer.byteLength(data),sha256:hash(data)}));
}

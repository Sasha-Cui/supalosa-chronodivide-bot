import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {ROOT_RELATIVE,CENSUS_SHA256,ALLOCATION_SHA256,PROTOCOL_SHA256,SEED_AMENDMENT_SHA256,HFO,PEAK,hash,parseStarts,buildPlan} from "./fresh-dual-endpoint-plan-v1.mjs";
export const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."),PROJECT=path.dirname(REPO),ROOT=path.join(PROJECT,ROOT_RELATIVE);
export const DRIVER=path.join(REPO,"packages/chronodivide-bot-driver");
export const ASSETS=path.join(PROJECT,"private-assets/ra2/runtimes/hfo-literal-snow-regular-e0b18958");
export const read=p=>fs.readFileSync(p);
export const json=p=>JSON.parse(read(p));
export const FILES={
 protocol:path.join(REPO,"research/protocols/maps/2026-09-03-fresh-dual-endpoint-remeasurement-v1.md"),
 amendment:path.join(REPO,"research/protocols/maps/2026-09-03-fresh-dual-endpoint-seed-amendment-a1.md"),
 census:path.join(PROJECT,"research-evidence/multimap-v2/explicit-census-amendment-2/finalizer/multimap-selection.json"),
 allocation:path.join(PROJECT,"research-evidence/multimap-v2/screen-amendment-3/allocation/allocation.json"),
 core:path.join(REPO,"research/runtime/fresh-dual-endpoint-plan-v1.mjs"),inputs:fileURLToPath(import.meta.url),
 loader:path.join(REPO,"research/runtime/explicit-start-loader-v1.mjs"),transform:path.join(REPO,"research/runtime/explicit-start-transform-v1.mjs"),
 assetReference:path.join(PROJECT,"research-evidence/live-building-ledger/combatant-owned-gate-v1-callback-a1/manifest.json"),
 seedHelper:path.join(DRIVER,"dist/benchmark/seededOfflineGame.js"),package:path.join(DRIVER,"package.json"),lockfile:path.join(DRIVER,"pnpm-lock.yaml"),
};
export function loadPlanInputs(){
 for(const [key,sha]of [["protocol",PROTOCOL_SHA256],["amendment",SEED_AMENDMENT_SHA256],["census",CENSUS_SHA256],["allocation",ALLOCATION_SHA256]])assert.equal(hash(read(FILES[key])),sha);
 const census=json(FILES.census),allocation=json(FILES.allocation);
 assert.equal(String(allocation.schedulerJobId),"24602339");assert.equal(allocation.schedulerAccount,"pi_jss233");
 const hfo=read(path.join(ASSETS,HFO.fileName)),peak=read(path.join(ASSETS,PEAK.fileName));assert.equal(hash(hfo),HFO.sha256);assert.equal(hash(peak),PEAK.sha256);
 const plan=buildPlan(census,allocation,parseStarts(hfo,HFO.startCount),parseStarts(peak,PEAK.startCount));
 for(const map of plan.maps){
  assert.equal(path.basename(map.fileName),map.fileName);const bytes=read(path.join(ASSETS,map.fileName));
  assert.equal(hash(bytes),map.sha256);assert.deepEqual(parseStarts(bytes,map.startCount),map.starts);
 }
 const require=createRequire(path.join(DRIVER,"package.json")),runtime=fs.realpathSync(require.resolve("@chronodivide/game-api"));
 assert.equal(hash(read(runtime)),"dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d");
 assert.equal(hash(read(FILES.assetReference)),"b5416fccaef433d6d07376c49c51b987b78a11eacf6a7be2020d4ce7c43f1e0f");
 const assetEntries=json(FILES.assetReference).assetEntries.map(({name,sha256})=>({name,sha256}));
 for(const e of assetEntries){const p=path.join(ASSETS,e.name);assert.ok(fs.lstatSync(p).isFile());assert.equal(hash(read(p)),e.sha256);}
 const fileHashes=Object.fromEntries(Object.entries({...FILES,runtime}).map(([k,p])=>[k,hash(read(p))]));
 return {plan,census,allocation,runtime,fileHashes,assetEntries};
}

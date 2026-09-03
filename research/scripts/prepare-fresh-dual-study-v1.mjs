import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {hash} from "../runtime/fresh-dual-endpoint-plan-v1.mjs";
import {REPO,ROOT,ASSETS,loadPlanInputs} from "../runtime/fresh-dual-inputs-v1.mjs";
const git=(...a)=>execFileSync("git",a,{cwd:REPO,encoding:"utf8"}).trim();
assert.equal(git("branch","--show-current"),"main");assert.equal(git("status","--porcelain"),"");
const sourceCommit=git("rev-parse","HEAD");assert.equal(sourceCommit,git("rev-parse","fork/main"));
assert.ok(!fs.existsSync(ROOT),"Preserve existing study root");
const {plan,runtime,fileHashes,assetEntries}=loadPlanInputs();
const artifact={kind:"fresh-dual-endpoint-prepared-plan-v1",complete:true,outcomeFree:true,sourceCommit,
 programSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),fileHashes,runtime,assets:ASSETS,assetEntries,plan,
 planSha256:hash(JSON.stringify(plan)),simulationAuthorized:false,seedAuditRequired:true,policyRuntimeFreezeRequiredBeforeCompetitiveUse:true};
fs.mkdirSync(ROOT,{recursive:true,mode:0o700});
const file=path.join(ROOT,"plan.json");fs.writeFileSync(file,JSON.stringify(artifact,null,2)+"\n",{flag:"wx",mode:0o600});
fs.writeFileSync(path.join(ROOT,"plan.sha256"),hash(fs.readFileSync(file))+"  "+file+"\n",{flag:"wx",mode:0o600});
console.log(JSON.stringify({prepared:true,sourceCommit,planFileSha256:hash(fs.readFileSync(file)),planSha256:artifact.planSha256,counts:plan.counts,seedMinimum:plan.uniqueSeeds[0],seedMaximum:plan.uniqueSeeds.at(-1)}));

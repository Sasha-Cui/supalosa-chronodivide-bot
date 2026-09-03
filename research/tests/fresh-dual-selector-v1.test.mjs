import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {ROOT_RELATIVE} from "../runtime/fresh-dual-endpoint-plan-v1.mjs";
const source=fs.readFileSync(new URL("../scripts/fresh-dual-selector-v1.mjs",import.meta.url),"utf8");
test("selector source has no update calls and checks zero update ticks",()=>{
 assert.ok(!/\bgame\s*\.\s*update\s*\(/.test(source));assert.ok(source.includes("assert.equal(game.getCurrentTick(),0)"));
 assert.ok(source.includes("class Passive extends Bot{onGameStart(api){this.api=api;}}"));
});
test("selection fails closed without the complete exact-plan reservation audit",()=>{
 for(const s of ["AUDIT_SHA256","audit.passed,true","audit.planFileSha256,planFileSha256","audit.exactPlannedSeeds,plan.uniqueSeeds","COMPLETE_FRESH_DUAL_SEED_AUDIT_V1"])assert.ok(source.includes(s));
 assert.ok(source.includes("competitiveRunAuthorized:false"));
});
test("both Slurm entrypoints use the canonical root and CPU-only fail-closed source guards",()=>{
 for(const name of ["fresh_dual_seed_audit_v1.sbatch","fresh_dual_selector_v1.sbatch"]){
  const shell=fs.readFileSync(new URL("../slurm/"+name,import.meta.url),"utf8");
  assert.equal(shell.match(/^STUDY=(.+)$/m)[1],"/nfs/roberts/project/pi_jss233/zc362/chrono_divide/"+ROOT_RELATIVE);
  for(const s of ["#SBATCH --account=pi_jss233","#SBATCH --partition=day","#SBATCH --no-requeue","SOURCE_COMMIT","PLAN_FILE_SHA256","SCRIPT_SHA256"])assert.ok(shell.includes(s));
 }
});

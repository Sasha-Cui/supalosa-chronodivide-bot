#!/usr/bin/env node
// Internal empirical report; this does not write or update the paper.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const PROJECT=path.dirname(REPO),STUDY=path.join(PROJECT,"research-evidence/unified-intent-arbiter-v2/od1");
const OUT=path.join(REPO,"research/results/2026-09-22-v2-od1-a1");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const load=(relative,digest)=>{const b=fs.readFileSync(path.join(STUDY,relative));if(sha(b)!==digest)throw Error("Input hash drift: "+relative);return JSON.parse(b);};
const aggregate=load("execution-a1/finalizer/record.json","809956a766dff0f4f6b80d27ac9fffd3dc45f3acd498c96264c129ecb0c398f0");
const audit=load("independent-audit-v1/output/audit.json","7ea6954787f20e430f2fcb327b65dac892ee01935ca25ae74964ba800c876fd4");
const actions=load("independent-audit-v1/output/actions.json","0e03ed206f1868a58d45fee5a08225d475ef547e82d5a9c9844860c5d228f03b");
const a=aggregate.analysis,pop=a.v6.populations;
if(!audit.complete||!audit.passed||audit.counts.ledgers!==1800||a.decision.broadPositiveDevelopmentSignal!==false)throw Error("Unexpected audited study contract");
for(const dir of ["visual_figures","visual_tables","data"])fs.mkdirSync(path.join(OUT,dir),{recursive:true});
const files=[];
const write=(name,data)=>{const f=path.join(OUT,name);fs.writeFileSync(f,data);files.push({file:name,bytes:Buffer.byteLength(data),sha256:sha(data)});};
const ood=f=>"https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs/"+f.split("/").map(encodeURIComponent).join("/");
const link=(label,relative)=>"["+label+"]("+ood(path.join(OUT,relative))+")";
const ext=(label,relative)=>"["+label+"]("+ood(path.join(STUDY,relative))+")";
const csv=(name,rows)=>{const keys=Object.keys(rows[0]);const cell=v=>'"'+String(v??"").replaceAll('"','""')+'"';write("visual_tables/"+name,keys.map(cell).join(",")+"\n"+rows.map(r=>keys.map(k=>cell(typeof r[k]==="object"?JSON.stringify(r[k]):r[k])).join(",")).join("\n")+"\n");};
const percent=x=>(x*100).toFixed(2)+"%";
const pp=x=>(x>0?"+":"")+(100*x).toFixed(2);
const wdl=p=>p.W+"/"+p.D+"/"+p.L;
const bold=(s,on)=>on?"**"+s+"**":s;
const table=(head,rows)=>"| "+head.join(" | ")+" |\n| "+head.map(()=>"---").join(" | ")+" |\n"+rows.map(r=>"| "+r.join(" | ")+" |").join("\n");
const populations=Object.entries(pop).map(([id,p])=>({population:id,cases:p.cases,disabledW:p.arms.disabled.W,disabledD:p.arms.disabled.D,disabledL:p.arms.disabled.L,
    v2W:p.arms.separated_lanes_v2.W,v2D:p.arms.separated_lanes_v2.D,v2L:p.arms.separated_lanes_v2.L,disabledScore:p.arms.disabled.score,v2Score:p.arms.separated_lanes_v2.score,
    pairedScore:p.pairedScore,pairedWin:p.pairedLiteralWin,scoreLower90:a.bounds[id].score.lower90,winLower90:a.bounds[id].literalWin.lower90}));
csv("populations_full_audit.csv",populations);
const strata=a.v6.strata.map(s=>({stratum:s.id,opponent:s.opponent,map:s.mapId,pairs:s.cases,
    disabledW:s.arms.disabled.W,disabledD:s.arms.disabled.D,disabledL:s.arms.disabled.L,
    v2W:s.arms.separated_lanes_v2.W,v2D:s.arms.separated_lanes_v2.D,v2L:s.arms.separated_lanes_v2.L,disabledScore:s.arms.disabled.score,v2Score:s.arms.separated_lanes_v2.score,
    pairedScore:s.pairedScore,pairedWin:s.pairedLiteralWin,disabledStatuses:s.arms.disabled.statuses,v2Statuses:s.arms.separated_lanes_v2.statuses}));
csv("strata_full_audit.csv",strata);
csv("pairs_full_audit.csv",aggregate.rows.map(r=>({...r.assignment,schedulerJobId:aggregate.recordIdentities[r.assignment.caseIndex].jobId,pairedArtifactSha256:aggregate.recordIdentities[r.assignment.caseIndex].sha256,sourceCommit:aggregate.sourceCommit,disabledV5:r.arms.disabled.v5,disabledV6:r.arms.disabled.v6,v2V5:r.arms.separated_lanes_v2.v5,v2V6:r.arms.separated_lanes_v2.v6})));
csv("scheduler_full_audit.csv",aggregate.accounting);
csv("uncertainty_full_audit.csv",Object.entries(a.bounds).map(([id,b])=>({id,clusters:b.clusters,cases:b.cases,replicates:b.replicates,meanScore:b.score.mean,scoreLower90:b.score.lower90,meanLiteralWin:b.literalWin.mean,literalWinLower90:b.literalWin.lower90,scoreDigest:b.score.orderedReplicatesSha256,winDigest:b.literalWin.orderedReplicatesSha256,indexDigest:b.sampledIndicesSha256})));
const descriptive=[];
for(const opponent of ["overall","pinned_supalosa","ra2web_advanced"])for(const arm of ["disabled","separated_lanes_v2"]){
    const rs=actions.filter(r=>(opponent==="overall"||r.opponent===opponent)&&r.arm===arm),sum=k=>rs.reduce((s,r)=>s+r[k],0);
    descriptive.push({opponent,arm,n:rs.length,orders:sum("orders"),updates:sum("updates"),ordersPer900Updates:900*sum("orders")/sum("updates"),essential:sum("essential"),
        episodesAtCommandCap:arm==="disabled"?null:rs.filter(r=>r.telemetry.maxRollingCommandCalls===115).length,
        updatesWithDeferral:arm==="disabled"?null:rs.reduce((s,r)=>s+r.telemetry.updatesWithDeferral,0),
        deferredUnitIdOccurrences:arm==="disabled"?null:rs.reduce((s,r)=>s+r.telemetry.deferredUnitIds,0)});
}
csv("actions_descriptive_full_audit.csv",descriptive);
csv("gates_full_audit.csv",Object.entries(a.decision.checks).map(([gate,pass])=>({gate,pass})));
write("data/analysis.json",JSON.stringify(a,null,2)+"\n");
write("data/independent-audit.json",JSON.stringify(audit,null,2)+"\n");

// One figure exposes all strata instead of choosing favorable maps.
const requireDriver=createRequire(path.join(REPO,"packages/chronodivide-bot-driver/package.json"));
const {createCanvas}=requireDriver("canvas");
const canvas=createCanvas(1100,720),ctx=canvas.getContext("2d"),labels=[];
ctx.fillStyle="#ffffff";ctx.fillRect(0,0,1100,720);
const colors={negative:"#fee2e2",positive:"#dcfce7",neutral:"#f3f4f6",text:"#111827",muted:"#374151"};
function text(value,x,y,size=18,weight="normal",align="left"){
    ctx.font=weight+" "+size+"px sans-serif";ctx.textAlign=align;ctx.textBaseline="alphabetic";ctx.fillStyle=colors.text;
    const width=ctx.measureText(value).width,left=align==="center"?x-width/2:align==="right"?x-width:x;
    if(left<10||left+width>1090||y-size<5||y>710)throw Error("Clipped figure label: "+value);
    labels.push({text:value,left,top:y-size,width,height:size});ctx.fillText(value,x,y);
}
text("V2 arbitration: paired score change across every tested map",32,40,26,"bold");
text("Enabled minus unchanged StrongBot; percentage points; higher is better",32,72,18);
text("Pinned Supalosa",550,115,20,"bold","center");text("RA2Web Advanced",880,115,20,"bold","center");
const mapIds=["hfo-le","peak","hfo-original","hfo-golden","hfo-corners","hfo-corners-b","hfo-corners-b-golden","hfo-bvb","hfo-lvl","hfo-rvr","hfo-tvt","tour-of-egypt","south-pacific","south-pacific-2","pacific-heights"];
mapIds.forEach((map,i)=>{
    const y=130+i*33;text(map,32,y+22,18);
    for(const[opponent,x]of [["pinned_supalosa",395],["ra2web_advanced",725]]){
        const s=strata.find(r=>r.map===map&&r.opponent===opponent),fill=s?(s.pairedScore>0?colors.positive:s.pairedScore<0?colors.negative:colors.neutral):colors.neutral;
        ctx.fillStyle=fill;ctx.fillRect(x,y,310,29);
        text(s?pp(s.pairedScore)+" pp":"Not tested",x+155,y+21,18,"bold","center");
    }
});
text("36 paired cases per tested cell. Point differences only; not per-map confidence intervals.",32,658,17);
text("15 physical maps / 5 topology groups. Advanced covers HFO variants only.",32,688,17);
const figure="visual_figures/map-score-difference.png";write(figure,canvas.toBuffer("image/png"));
const luminance=hex=>{const v=hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
const contrasts=Object.fromEntries(["#ffffff",colors.negative,colors.positive,colors.neutral].map(bg=>[bg,(luminance(bg)+.05)/(luminance(colors.text)+.05)]));
if(Object.values(contrasts).some(n=>n<4.5))throw Error("Figure contrast failed");
for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j];if(a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.height&&a.top+a.height>b.top)throw Error("Overlapping figure text");}
const inputLink=ext("immutable aggregate","execution-a1/finalizer/record.json");
const populationTable=table(["Population","Pairs","Unchanged W/D/L","V2 W/D/L","Score Δ","90% lower"],Object.entries(pop).map(([id,p])=>[
    id,p.cases,bold(wdl(p.arms.disabled),p.arms.disabled.score>=p.arms.separated_lanes_v2.score),bold(wdl(p.arms.separated_lanes_v2),p.arms.separated_lanes_v2.score>=p.arms.disabled.score),pp(p.pairedScore)+" pp",pp(a.bounds[id].score.lower90)+" pp"]));
const sliced=[...strata.slice(0,5),null,...strata.slice(-5)];
const mapTable=table(["Opponent / map","Unchanged score","V2 score","Δ"],sliced.map(s=>s?[s.stratum,bold(s.disabledScore.toFixed(4),s.disabledScore>=s.v2Score),bold(s.v2Score.toFixed(4),s.v2Score>=s.disabledScore),pp(s.pairedScore)+" pp"]:["… full 25 strata linked below …","…","…","…"]));
const btable=table(["Grouping","Clusters","Score Δ","One-sided 90% lower"],Object.entries(a.bounds).map(([k,b])=>[k,b.clusters,pp(b.score.mean)+" pp",pp(b.score.lower90)+" pp"]));
const metricRows=[["Allied",a.v6.factions[0].pairedScore],["Soviet",a.v6.factions[1].pairedScore],["Slot 0",a.v6.slots[0].pairedScore],["Slot 1",a.v6.slots[1].pairedScore]];
const d=descriptive.find(x=>x.opponent==="overall"&&x.arm==="disabled"),e=descriptive.find(x=>x.opponent==="overall"&&x.arm==="separated_lanes_v2");
const transitionTable=table(["Unchanged → V2","Count"],Object.entries(pop.overall.transitions).map(([k,n])=>[k,n]));
const actionTable=table(["Descriptive measure","Unchanged","V2"],[
    ["Public order calls",d.orders.toLocaleString("en-US"),e.orders.toLocaleString("en-US")],
    ["Order calls / 900 observed updates",d.ordersPer900Updates.toFixed(2),e.ordersPer900Updates.toFixed(2)],
    ["Essential calls",d.essential.toLocaleString("en-US"),e.essential.toLocaleString("en-US")],
    ["Games reaching cap","Not applicable",e.episodesAtCommandCap+"/900"],
    ["Updates with deferral","Not applicable",e.updatesWithDeferral.toLocaleString("en-US")],
    ["Deferred unit-ID occurrences","Not applicable",e.deferredUnitIdOccurrences.toLocaleString("en-US")],
]);
const config=table(["Component","Setting / status"],[
    ["Reference","Unchanged deployed StrongBot; arbiter explicitly disabled; retained"],
    ["Challenger","V2 separated lanes; 115 order/debug calls per rolling 900 updates; rejected"],
    ["Essential lane","Uncapped and measured; no forwarded resignations"],
    ["Population","900 pairs; 9 countries; 2 slots; reciprocal first two starts"],
    ["Primary / secondary metric","Live-owned v6 / passive v5; immutable first results"],
    ["Horizon","24,000 updates; not the historical 90,000-update population"],
    ["Component-specific effects","Untested here; only the complete V2 component was compared"],
]);
const body=[
"# V2 OD1 A1 — complete, independently audited negative development result",
"Date: 2026-09-22. Internal research record, not a manuscript or a deployment approval.",
"## Executive answer",
"Reject the V2 challenger and retain unchanged StrongBot. All 900 pairs (1,800 games) completed technically, and an independent implementation reproduced both endpoints from every ledger, all summary tables, every bootstrap digest, and all frozen gates. Technical success did not translate into improved play.",
"Across 900 games per policy, literal wins fell from **308 to 216**; draws rose from 404 to 471 and losses from 188 to 213. Both opponent-specific paired scores were worse. M2 is not complete and the manuscript remains frozen.",
"## Configuration and decision",
config,
"## Primary result",
"Compare policies within each row: higher score is better; bold marks the policy with the higher score (including ties). W/D/L are wins/draws/losses, not a scalar to optimize jointly.",
populationTable,
"Full audit: "+link("population metrics","visual_tables/populations_full_audit.csv")+". Source: "+inputLink+".",
"## Map breadth",
"{{FIGURE}}",
mapTable,
"Compare policy scores within each row; higher is better and ties are bolded on both sides. This alphabetical first-five/last-five excerpt is not a favorable subset. "+link("All 25 strata, W/D/L, statuses and effects","visual_tables/strata_full_audit.csv")+".",
"Point score changes were negative in "+strata.filter(s=>s.pairedScore<0).length+" of 25 strata and positive in "+strata.filter(s=>s.pairedScore>0).length+". Favorable cells do not rescue failed pooled or safety gates; none authorizes deployment.",
"## Uncertainty and frozen gates",
btable,
"Each bound is the frozen one-sided 90% lower bound for enabled-minus-disabled paired score. These are different uncertainty groupings, not competing methods with a best number. A negative lower bound fails a positive-lower-bound gate; it is **not**, by itself, a two-sided test proving harm.",
"Bootstrap: 200,000 replicates, unbiased SHA-256 counter-mode index sampling, fixed named streams and empirical sorted index 20,000. All sampled-index and ordered-statistic hashes reproduced exactly. "+link("Full uncertainty audit","visual_tables/uncertainty_full_audit.csv")+".",
"Only catastrophic-transition safety passed among the 13 broad-development checks; the other 12 failed. Absolute Advanced eligibility also failed: V2 had more wins than losses but its pooled win lower bound was "+percent(pop.advanced.arms.separated_lanes_v2.pooledWilsonWinLower90)+", below 50%. "+link("Every gate","visual_tables/gates_full_audit.csv")+".",
"Group-specific point score changes (V2 minus reference; higher is better): "+metricRows.map(([k,v])=>k+" "+pp(v)+" pp").join("; ")+". All five leave-one-topology-out score point effects are negative. Full strata and subgroup tables are in "+link("analysis.json","data/analysis.json")+".",
"## Error decomposition and mechanism hypotheses",
transitionTable,
"121 reference wins became draws; 24 became losses. Conversely, 43 draws and 10 losses became wins. These account for the net loss of 92 wins. "+link("All 900 paired identities and v5/v6 outcomes","visual_tables/pairs_full_audit.csv")+".",
actionTable,
"Action counts are descriptive exposure measures: neither higher nor lower is inherently better, so no best value is highlighted. Different trajectory lengths and policy-induced game states affect them. Deferred unit IDs count repeated occurrences, not unique units. Disabled deferral telemetry is unavailable by design, not zero. "+link("Full action summary","visual_tables/actions_descriptive_full_audit.csv")+".",
"The cap was reached in 837/900 V2 episodes, making command gating a reasonable next hypothesis. This study does **not** separate budgeting from priority arbitration, grouping, validation, duplicate suppression or pending-intent expiry. Fewer orders alone is not evidence of why wins were lost. A fresh, prospectively defined component ablation is needed.",
"## Secondary measurement audit",
"V5 overall W/D/L: unchanged "+wdl(a.v5.populations.overall.arms.disabled)+"; V2 "+wdl(a.v5.populations.overall.arms.separated_lanes_v2)+". V6 is primary throughout; no endpoint substitution or favorable measurement choice was made. Full per-stratum endpoint/status transitions and first-result-time changes are retained in "+link("analysis.json","data/analysis.json")+".",
"## Reproducibility and integrity",
"- Frozen study source: `5d466599937d966b6dcc80fa2f4c9add7da767fd` on main. Parent protocol `63ba0a1`; prospective metadata/seed amendment `249bdd7`.",
"- Jobs: pure 26539082; selector 26539451; canary 26561442 and finalizer 26561443; smoke 26584493; comparison 27061644 and finalizer 27061645; independent audit 27089677.",
"- All 900 comparison tasks and finalizer: pi_jss233/day, one CPU each, zero restarts, successful exit. "+link("Exact scheduler identities","visual_tables/scheduler_full_audit.csv")+". Comparison plus finalizer consumed "+audit.schedulerCpuHours.toFixed(3)+" allocated CPU-hours (elapsed × one CPU, not measured process CPU time). Independent audit took 492 seconds / one CPU.",
"- Independent audit: 1,800 ledgers; "+audit.counts.ledgerRecords.toLocaleString("en-US")+" records; "+audit.counts.ledgerPlainBytes.toLocaleString("en-US")+" uncompressed bytes; "+audit.counts.ledgerGzipBytes.toLocaleString("en-US")+" compressed bytes. Maximum paired artifact "+audit.counts.maxPairBytes.toLocaleString("en-US")+" bytes; complete execution 1,816 files.",
"- A1 launched 905 zero-update initializations, 16 canary games, 2 discarded-payload smoke games and 1,800 comparison games. The failed predecessor selector's 905 zero-update calls remain preserved: 1,810 cumulative initializations. No games were selectively rerun or excluded.",
"- The 14 approved housekeeping path changes were backed up, temporarily reverse-applied, and restored byte-for-byte after all jobs and audits finished. "+ext("Preservation and restoration receipts","housekeeping-preservation-ep6e7I")+". No policy or scientific gate was changed to bypass the launch check.",
"Independent audit program imports no production endpoint, finalizer or analysis modules. It reconstructs observer decisions from retained public building/event evidence, not a fresh game-engine simulation. Raw public action sequences were not retained; their digests and counts are checksum-bound. "+ext("Independent audit source and outputs","independent-audit-v1")+".",
"## Limits and next decision",
"- Open-development evidence, not a confirmatory or unseen-map result. Only the first two starts in reciprocal orientations were tested.",
"- 25 opponent-map strata span only five topology groups. Advanced was tested on ten related HFO variants, not ten independent topologies; five-group uncertainty itself has few clusters.",
"- The 24,000-update horizon, start population and seeds differ from the historical 90,000-update HFO result. The rates must not be directly compared as if the population were unchanged.",
"- Public api_full_state observation mode; no fog-of-war parity claim. Opponent ancestry/provenance limits remain those recorded by the project errata.",
"- Preserve the full negative comparison. Do not deploy V2, select its favorable maps as a winner, extend completed games to rescue it, or begin the paper.",
"- Next: freeze a fresh component diagnostic comparing unchanged control, original V2, and the same arbitration with command-budget gating removed. Determine whether the cap explains regression before further optimizer expansion; require new technical validation and an outcome-blind population commitment.",
"## Artifact index and reconstruction",
"- Aggregate SHA-256: `809956a766dff0f4f6b80d27ac9fffd3dc45f3acd498c96264c129ecb0c398f0` — "+inputLink+".",
"- Independent audit SHA-256: `7ea6954787f20e430f2fcb327b65dac892ee01935ca25ae74964ba800c876fd4` — "+ext("audit.json","independent-audit-v1/output/audit.json")+".",
"- Source manifest SHA-256: `a595d73b1e06c01e4212add30d19083d6260836cf30b2a2d90fd37762ab99b67` — "+ext("manifest","execution-a1/manifest/record.json")+".",
"- Full raw paired artifacts: "+ext("pairs","execution-a1/pairs")+". "+link("Machine-readable analysis","data/analysis.json")+" and "+link("audit copy","data/independent-audit.json")+".",
"Rebuild from the immutable inputs with Node 20.13.1 and the project's canvas dependency:",
"```bash\ncd "+REPO+"\nnode research/scripts/build-v2-od1-result-report.mjs\nnode research/scripts/validate-v2-od1-result-report.mjs\n```",
].join("\n\n")+"\n";
const image="!["+ "All tested map-stratum paired score differences"+"]("+ood(path.join(OUT,figure))+")";
write("VISUAL_REPORT.md",body.replace("{{FIGURE}}",image));
write("REPORT.md",body.replace("{{FIGURE}}","Complete map-stratum point effects are also shown in "+link("the paired-score figure",figure)+"."));
write("figure-qa.json",JSON.stringify({dimensions:{width:1100,height:720},labels,contrastRatios:contrasts,contrastMinimum:4.5,noClippedLabels:true,noOverlappingLabels:true},null,2)+"\n");
write("artifact-index.json",JSON.stringify({inputAggregateSha256:sha(fs.readFileSync(path.join(STUDY,"execution-a1/finalizer/record.json"))),inputAuditSha256:sha(fs.readFileSync(path.join(STUDY,"independent-audit-v1/output/audit.json"))),files},null,2)+"\n");
console.log(JSON.stringify({complete:true,output:OUT,files:files.length,strata:strata.length,negativeStrata:strata.filter(s=>s.pairedScore<0).length}));

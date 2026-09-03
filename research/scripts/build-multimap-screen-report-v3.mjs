import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {analyzeMapScreen} from "../runtime/multimap-screen-analysis-v3.mjs";
import {buildScreenAllocation} from "../runtime/multimap-screen-allocation-v3.mjs";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."),project=path.dirname(repo);
const root=path.join(project,"research-evidence/multimap-v2/screen-amendment-3");
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const read=p=>fs.readFileSync(p),load=p=>JSON.parse(read(p));
const aggregatePath=path.join(root,"finalizer/screen.json"),raw=read(aggregatePath);
const aggregateSha256="8e760c72605cbe6c67fcc088cba5a3e460fecf53f28b4b614158abe050bef341";
assert.equal(hash(raw),aggregateSha256);
assert.equal(fs.readFileSync(path.join(root,"finalizer/COMPLETE"),"utf8").trim(),"COMPLETE_MULTIMAP_SCREEN_AGGREGATE_V3");
const a=JSON.parse(raw),census=load(path.join(project,"research-evidence/multimap-v2/explicit-census-amendment-2/finalizer/multimap-selection.json"));
const allocation=load(path.join(root,"allocation/allocation.json"));
assert.deepEqual(buildScreenAllocation(census),allocation.plan);
assert.equal(a.complete,true);assert.equal(a.taskCount,900);assert.equal(a.maps.length,13);
const out=path.join(repo,"research/results/2026-09-03-multimap-screen-v3");
for(const d of ["visual_figures","visual_tables"])fs.mkdirSync(path.join(out,d),{recursive:true});
const rows=[],strata=[],cellRows=[];const seen=new Set();
const score=w=>w==="candidate"?1:w==="draw"?0.5:0;
const median=v=>{if(!v.length)return null;const x=[...v].sort((a,b)=>a-b),i=Math.floor(x.length/2);return x.length%2?x[i]:(x[i-1]+x[i])/2;};
function numericCheck(s,cells){
    assert.equal(s.games,cells.length);assert.equal(s.wins,cells.filter(c=>c.winner==="candidate").length);
    assert.equal(s.losses,cells.filter(c=>c.winner==="opponent").length);
    assert.equal(s.draws,cells.filter(c=>c.winner==="draw").length);
    assert.equal(s.tickCapCount,cells.filter(c=>c.endpointStatus==="tick_cap_draw").length);
    assert.equal(s.medianLiteralWinUpdates,median(cells.filter(c=>c.winner==="candidate").map(c=>c.updates)));
}
fs.readdirSync(path.join(root,"cells"));
for(let index=0;index<a.maps.length;index++){
    const m=a.maps[index],s=m.summary;numericCheck(s,m.cells);
    assert.deepEqual(analyzeMapScreen(m.cells,m.map.startCount),{summary:m.summary,strata:m.strata,gates:m.gates,eligible:m.eligible});
    const failures=["overallPositive","factionsPositive","slotsPositive","startsNoninferior"].filter(k=>!m.gates[k]);
    if(m.gates.noninferiorCountries<8)failures.push("countries="+m.gates.noninferiorCountries+"/9");
    rows.push({map_id:m.map.id,map_name:m.map.label,family:m.map.family,file_name:m.map.fileName,map_sha256:m.map.sha256,
        ...s,nonliteral_draws:m.nonliteralTerminationDrawCount,eligible:m.eligible,failed_gates:failures.join(";"),
        source_commit:a.sourceCommit,aggregate_sha256:aggregateSha256,array_job:a.scheduler.arrayJobId,finalizer_job:a.scheduler.finalizerJobId,
        aggregate_path:aggregatePath,allocation_sha256:a.allocationSha256,amendment_sha256:a.amendmentSha256});
    for(const[type,groups]of Object.entries(m.strata))for(const[label,v]of Object.entries(groups))
        strata.push({map_id:m.map.id,stratum_type:type,stratum:label,...v,source_path:aggregatePath});
    const indices=new Set(m.allocation.screenIndices);
    for(const c of m.cells){
        assert.ok(!seen.has(c.taskIndex));seen.add(c.taskIndex);assert.ok(indices.has(c.mapCaseIndex));
        const d=path.join(root,"cells/task-"+String(c.taskIndex).padStart(3,"0"));fs.readdirSync(d);
        const bytes=read(path.join(d,"cell.json"));
        assert.equal(hash(bytes),fs.readFileSync(path.join(d,"cell.sha256"),"utf8").trim().split(/\s+/)[0]);
        assert.equal(fs.readFileSync(path.join(d,"COMPLETE"),"utf8").trim(),"COMPLETE_MULTIMAP_SCREEN_CELL_V3");
        const cell=JSON.parse(bytes),spec=census.maps[index].cases[c.mapCaseIndex];
        assert.equal(cell.sourceCommit,a.sourceCommit);assert.equal(cell.programSha256,a.programSha256);
        assert.equal(cell.allocationSha256,a.allocationSha256);assert.equal(cell.result.winner,c.winner);
        assert.equal(cell.schedulerAccount,"pi_jss233");assert.equal(String(cell.schedulerJobId),a.scheduler.taskJobIds[String(c.taskIndex)]);
        assert.deepEqual(cell.result.quitForwarded,{candidate:0,baseline:0});
        for(const[k,v]of Object.entries(spec))assert.deepEqual(cell.result[k],v);
        if(c.winner==="candidate"){assert.equal(cell.result.terminalBuildingCounts.baseline,0);assert.equal(cell.result.terminalProof.evaluation.candidatePhysicalWin,true);}
        if(c.winner==="opponent"){assert.equal(cell.result.terminalBuildingCounts.candidate,0);assert.equal(cell.result.terminalProof.evaluation.baselinePhysicalWin,true);}
        assert.deepEqual({trees:cell.provenance.source.runtimeTrees,software:cell.provenance.software,
            environment:cell.provenance.inputs.capturedEnvironment},a.runtimeIdentity);
        cellRows.push({task_index:c.taskIndex,scheduler_job_id:cell.schedulerJobId,map_id:m.map.id,map_file:m.map.fileName,
            map_sha256:m.map.sha256,map_case_index:c.mapCaseIndex,country:spec.country,country_ordinal:spec.countryOrdinal,
            candidate_slot:spec.candidateSlot,candidate_start:spec.candidateStart,opponent_start:spec.opponentStart,
            engine_seed:spec.requestedEngineSeed,repeat:spec.repeatIndex,winner:c.winner,endpoint_status:c.endpointStatus,
            updates:c.updates,candidate_buildings:cell.result.terminalBuildingCounts.candidate,
            opponent_buildings:cell.result.terminalBuildingCounts.baseline,source_commit:cell.sourceCommit,
            program_sha256:cell.programSha256,allocation_sha256:cell.allocationSha256,cell_sha256:hash(bytes),
            cell_path:path.join(d,"cell.json")});
    }
}
assert.equal(seen.size,900);
function csv(name,data){
    const keys=Object.keys(data[0]),quote=x=>'"'+String(x??"").replaceAll('"','""')+'"';
    fs.writeFileSync(path.join(out,"visual_tables",name),[keys.map(quote).join(","),...data.map(r=>keys.map(k=>quote(r[k])).join(","))].join("\n")+"\n");
}
csv("map_summary_full_audit.csv",rows);csv("strata_full_audit.csv",strata);csv("cells_full_audit.csv",cellRows);
const require=createRequire(path.join(repo,"packages/chronodivide-bot-driver/package.json"));
const {createCanvas,loadImage}=require("canvas");
const palette={background:"#ffffff",panel:"#f5f7fa",text:"#17212b",secondary:"#415063",grid:"#cbd3dd",
    win:"#1d6549",cap:"#b88318",other:"#d8bc77",loss:"#ab3437",pass:"#145434",fail:"#9d2730"};
const groups=[
    {id:"hfo-primary",title:"Primary HFO revisions",rows:rows.filter(r=>r.family==="hfo-primary")},
    {id:"hfo-controls",title:"HFO geometry controls",rows:rows.filter(r=>r.family==="hfo-secondary")},
    {id:"distinct-maps",title:"Distinct maps and revision control",rows:rows.filter(r=>r.family.startsWith("distinct"))}
];
const figureFiles=[];
function figure(group){
    const W=1260,H=190+group.rows.length*60,canvas=createCanvas(W,H),ctx=canvas.getContext("2d");
    ctx.fillStyle=palette.background;ctx.fillRect(0,0,W,H);
    const text=(s,x,y,size=16,color=palette.text,align="left")=>{ctx.font=size+"px DejaVu Sans";ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);};
    text(group.title,24,34,25);text("StrongBot vs pinned Supalosa · literal endpoint · screen, not confirmation",24,62,15,palette.secondary);
    const left=290,bw=650,top=118;
    for(const[f,label]of [[0,"0%"],[0.25,"25%"],[0.5,"50%"],[0.75,"75%"],[1,"100%"]]){
        const x=left+bw*f;ctx.strokeStyle=palette.grid;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,105);ctx.lineTo(x,top+group.rows.length*60-20);ctx.stroke();
        text(label,x,97,13,palette.secondary,"center");
    }
    text("W / D / L",1040,97,14,palette.text,"center");text("Screen gate",1180,97,14,palette.text,"center");
    for(let i=0;i<group.rows.length;i++){
        const r=group.rows[i],y=top+i*60;
        text(r.map_name,24,y+18,16);text("n = "+r.games,24,y+38,12,palette.secondary);
        let x=left;
        for(const[count,color]of [[r.wins,palette.win],[r.tickCapCount,palette.cap],
            [r.draws-r.tickCapCount,palette.other],[r.losses,palette.loss]]){
            const width=bw*count/r.games;ctx.fillStyle=color;ctx.fillRect(x,y, width,28);x+=width;
        }
        text(r.wins+" / "+r.draws+" / "+r.losses,1040,y+20,17,palette.text,"center");
        text(r.eligible?"PASS*":"FAIL",1180,y+20,16,r.eligible?palette.pass:palette.fail,"center");
    }
    const ly=H-47;
    for(const[i,[label,color]]of [["Literal win",palette.win],["Cap draw",palette.cap],["Other draw",palette.other],["Literal loss",palette.loss]].entries()){
        const x=290+i*200;ctx.fillStyle=color;ctx.fillRect(x,ly-13,18,14);text(label,x+25,ly,14);
    }
    text("* Pass authorizes fresh confirmation only; HFO controls are not independent map families.",24,H-14,12,palette.secondary);
    const file="visual_figures/"+group.id+".png";fs.writeFileSync(path.join(out,file),canvas.toBuffer("image/png"));figureFiles.push(file);
}
groups.forEach(figure);
const fmt=x=>(100*x).toFixed(1)+"%";
function table(group){
    return ["| Map | W / D / L | Win rate | 95% win lower | Gate |","|---|---:|---:|---:|---|",
        ...group.rows.map(r=>"| "+r.map_name+" | "+r.wins+" / "+r.draws+" / "+r.losses+" | "+fmt(r.winRate)+" | "+
            fmt(r.oneSided95WilsonWinLower)+" | "+(r.eligible?"Screen pass":"Fail")+" |"),
        "", "[Full map audit](visual_tables/map_summary_full_audit.csv) · [All strata](visual_tables/strata_full_audit.csv)"].join("\n");
}
const head=`# Multi-map transfer screen: complete evidence

## Executive answer

Only **HFO L v L** and **HFO R v R** passed every frozen screen gate. These are
two geometry controls within the HFO family, not two independent-map successes.
Both remain unconfirmed under the stricter fresh-case gates.

Across all 900 games, the descriptive launch total is 416 wins, 192 draws and
292 losses. It is not a family-balanced performance estimate: sample counts
and related-map representation differ. All 13 map outcomes are retained.

## Configuration contract

| Knob | Frozen setting | Status |
|---|---|---|
| Candidate | Deployed StrongBot, unchanged | Default only |
| Opponent | External Supalosa at 165b77a | Pinned baseline |
| Maps | 13 exact new files; HFO LE/Peak historical evidence separate | Complete |
| Starts | Explicit, immutable amended allocation | Validated interface |
| Countries / slots | All nine countries / both slots | Exact coverage |
| Victory | Opponent-attributed destruction of all enemy buildings | Literal |
| Cap / resignation | 90,000 updates / neither quit forwarded | Fixed |
| Adapted policies / Advanced | Not evaluated by this screen | Separate studies |

All competitive results were opened only after all 900 cells and finalizer
completed 0:0 on pi_jss233. No game was retried or excluded.
`;
const interpretation=`
## Interpretation and failure decomposition

- Primary HFO revisions show aggregate promise but fail robust coverage.
  Original HFO: 84/2/58, yet West (39,82) is 4/0/14 and only seven countries
  are noninferior. Golden: 64/7/37, with (50,121) at 1/0/17.
  Corners: 51/0/21, but West is 5/0/13. Favorable pooled records do not rescue
  these failed start gates.
- L v L passes at 26/0/10 with West only tied at 9/0/9. R v R passes at
  26/8/2. Their stricter confirmations may still fail; neither is called
  dominated or robustly confirmed here.
- Tour of Egypt is 38/1/69 and fails all principal balance gates.
- South Pacific original is 3/65/4; its two-start revision is 0/32/4.
  Pacific Heights is 16/53/3 and fails a start gate. These outcomes do not
  establish effective general land/naval or bridge play.

Of 192 draws, 97 reached the update cap and 95 were engine terminations without
the required literal physical-win certificate. They remain draws. They are
not all prolonged stalemates, and this report does not attribute them to
navigation or closeout without further prespecified diagnostics.

## Uncertainty and advancement

Win rate uses literal wins / all games, including draws in the denominator.
Score rate is (wins + 0.5 draws) / games. The table's bound is the one-sided 95%
Wilson win-probability lower bound (z = 1.644853626951), descriptive at screen
stage, not a new gate. Conditional win-time medians describe wins only.

The exact gates are: wins exceed losses overall, in both factions and slots;
every start has wins at least losses; at least eight countries are noninferior;
all technical and literal-win checks pass. A separate paired-deployed-control
gate is inapplicable to this single zero-shot head-to-head, but remains required
for later adaptation.

Only L v L and R v R may advance unchanged, on 144 uninspected confirmation
cases each. Failed maps require prospective development on amended screen
indices only. The manuscript remains frozen and Advanced remains unresolved.

## Audit and limitations

Every cell checksum/marker, scheduler identity, source/program/allocation
binding, case/seed/start identity and literal-win certificate was rechecked.
The script recomputes every map summary/gate from the complete aggregate.
All cells share the same captured runtime/software/environment identity.

The actual imported StrongBot package was also compared after completion with
the recorded root dist tree: 232 files, SHA
c2bfaf67767ef675fbce2f6c00c6164d77f93a2f58501cd9f4424175996598fc,
matching the captured candidate tree. The generic provenance game-api tree
points to the root compatibility installation; the evaluated import is separately
bound by the original/effective runtime hashes below. Do not conflate these paths.

The historical seed audit covered retained text metadata, not all off-tree
archives, log suffixes or encodings. Its exclusions remain explicit in the
prior audit report. Related HFO revisions form one family; the old HFO LE and
Peak populations are not pooled as if they shared this forced-pair design.

## Lineage and artifact index

- Array: 24603573; finalizer: 24603574; source:
  a60efffa5f321f828ce1a6b7178b4a7c31483c31.
- Screen aggregate: ${aggregateSha256}.
- Canonical allocation: ${a.allocationSha256}.
- Census: ${a.censusSha256}.
- Amendment: ${a.amendmentSha256}.
- Program: ${a.programSha256}.
- Original runtime: ${a.interfaceIdentity.originalRuntimeSha256}.
- Effective runtime: ${a.interfaceIdentity.effectiveRuntimeSha256}.
- Raw aggregate: ${aggregatePath}.
- [Map audit](visual_tables/map_summary_full_audit.csv), [stratum audit](visual_tables/strata_full_audit.csv),
  [900-cell provenance audit](visual_tables/cells_full_audit.csv).
- [Validation record](validation.json). Figure and no-image variants derive
  from the same immutable input; no figure uses partial results.

## Reproduction

Run on Bouchet inside the project checkout:

\`\`\`bash
/home/zc362/.local/share/node-v22.22.3-linux-x64/bin/node research/scripts/build-multimap-screen-report-v3.mjs
\`\`\`

The builder validates evidence, regenerates all tables and three charts, and
checks links, PNG nonblankness, figure/table placement and text contrast.
`;
const sections=withImages=>groups.map(g=>"## "+g.title+"\n\n"+(withImages?"!["+g.title+"](visual_figures/"+g.id+".png)\n\n":"")+table(g)).join("\n\n");
fs.writeFileSync(path.join(out,"VISUAL_REPORT.md"),head+"\n"+sections(true)+"\n"+interpretation);
fs.writeFileSync(path.join(out,"REPORT.md"),head+"\n"+sections(false)+"\n"+interpretation);
const visual=fs.readFileSync(path.join(out,"VISUAL_REPORT.md"),"utf8"),plain=fs.readFileSync(path.join(out,"REPORT.md"),"utf8");
assert.ok(!plain.includes("!["));
for(const f of figureFiles){assert.ok(visual.includes("]("+f+")\n\n|"));const im=await loadImage(path.join(out,f));
    const c=createCanvas(im.width,im.height),ctx=c.getContext("2d");ctx.drawImage(im,0,0);
    const data=ctx.getImageData(0,0,im.width,im.height).data;let nonwhite=0;
    for(let i=0;i<data.length;i+=4)if(data[i]<245||data[i+1]<245||data[i+2]<245)nonwhite++;
    assert.ok(nonwhite>10000);
}
for(const m of visual.matchAll(/\]\(([^)]+)\)/g))if(m[1]!=="validation.json")assert.ok(fs.existsSync(path.join(out,m[1])),m[1]);
for(const heading of ["Executive answer","Configuration contract","Interpretation","Uncertainty","Lineage","Reproduction"])assert.ok(visual.includes(heading));
function lum(hex){const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;}
const contrasts=Object.fromEntries(["text","secondary","pass","fail"].map(k=>[k,(lum(palette.background)+0.05)/(lum(palette[k])+0.05)]));
assert.ok(Object.values(contrasts).every(v=>v>=4.5));
fs.writeFileSync(path.join(out,"validation.json"),JSON.stringify({passed:true,inputSha256:aggregateSha256,
    verifiedCells:seen.size,figures:figureFiles,contrastRatios:contrasts,linkedArtifactsExist:true,noImageVariantClean:true,
    note:"Manual visual inspection is separate from these automated checks."},null,2)+"\n");
assert.ok(fs.existsSync(path.join(out,"validation.json")));
console.log(JSON.stringify({out,verifiedCells:seen.size,maps:13,eligibleMaps:a.eligibleMapIds,figures:figureFiles}));

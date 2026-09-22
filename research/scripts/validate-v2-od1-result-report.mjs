#!/usr/bin/env node
import fs from "node:fs";import path from "node:path";import crypto from "node:crypto";import {createRequire} from "node:module";import {fileURLToPath} from "node:url";
const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."),OUT=path.join(REPO,"research/results/2026-09-22-v2-od1-a1");
const hash=b=>crypto.createHash("sha256").update(b).digest("hex"),requireCheck=(b,m)=>{if(!b)throw Error(m);};
const index=JSON.parse(fs.readFileSync(path.join(OUT,"artifact-index.json")));
for(const entry of index.files){const b=fs.readFileSync(path.join(OUT,entry.file));requireCheck(b.length===entry.bytes&&hash(b)===entry.sha256,"Artifact drift "+entry.file);}
for(const name of ["REPORT.md","VISUAL_REPORT.md"]){
    const text=fs.readFileSync(path.join(OUT,name),"utf8");
    for(const section of ["Executive answer","Primary result","Map breadth","Uncertainty and frozen gates","Error decomposition","Reproducibility","Limits and next decision","Artifact index"])requireCheck(text.includes(section),"Missing "+section);
    for(const m of text.matchAll(/https:\/\/ood-bouchet\.ycrc\.yale\.edu\/pun\/sys\/dashboard\/files\/fs\/(\/[^)\s]+)/g)){
        const file=decodeURIComponent(m[1]);requireCheck(fs.existsSync(file),"Broken OOD artifact link "+file);
    }
    requireCheck(!text.includes("{{FIGURE}}"),"Placeholder left");
    if(name==="REPORT.md")requireCheck(!/!\[/.test(text),"No-image report contains image");
    else requireCheck(/!\[[^\]]+\]\([^\n]+\)\n\n\|/.test(text),"Figure must be followed by table");
}
const requireDriver=createRequire(path.join(REPO,"packages/chronodivide-bot-driver/package.json"));
const {createCanvas,loadImage}=requireDriver("canvas");
const img=await loadImage(path.join(OUT,"visual_figures/map-score-difference.png"));
requireCheck(img.width===1100&&img.height===720,"Image dimensions");
const c=createCanvas(img.width,img.height),ctx=c.getContext("2d");ctx.drawImage(img,0,0);
const data=ctx.getImageData(0,0,img.width,img.height).data;let dark=0,colored=0;
for(let i=0;i<data.length;i+=4){if(data[i]<100&&data[i+1]<100&&data[i+2]<100)dark++;if(data[i]!==data[i+1]||data[i+1]!==data[i+2])colored++;}
requireCheck(dark>1000&&colored>10000,"Figure blank or labels missing");
const qa=JSON.parse(fs.readFileSync(path.join(OUT,"figure-qa.json")));
requireCheck(qa.noClippedLabels&&qa.noOverlappingLabels&&Object.values(qa.contrastRatios).every(r=>r>=4.5),"Contrast/layout QA");
const result={complete:true,passed:true,checkedFiles:index.files.length,oodLinksExist:true,figureFollowedByTable:true,noImageReportClean:true,imageNonblank:true,darkPixels:dark,coloredPixels:colored,contrastAndGeometryPassed:true};
fs.writeFileSync(path.join(OUT,"validation.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result));

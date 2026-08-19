import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const PRIVATE_ROOT = "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/private-assets";
const HFO_MAP = "cd_chrono_4_heck_freezes_over_le.map";
const HFO_MAP_SHA256 = "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d";
const SNOW_ASSETS = ["isosnow.mix", "snow.mix", "sno.mix"] as const;
const sha256File = (p:string):string => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const requiredPath=(name:string):string=>{const v=process.env[name];if(!v)throw new Error(`${name} is required`);return path.resolve(v);};
const withinPrivate=(p:string):boolean=>p===PRIVATE_ROOT||p.startsWith(PRIVATE_ROOT+path.sep);

const main=():void=>{
 const asset=requiredPath("ISOSNOW_PATH"),runtime=requiredPath("RUNTIME_DIR"),manifestPath=requiredPath("MANIFEST_PATH");
 for(const p of [asset,runtime,manifestPath])if(!withinPrivate(p))throw new Error(`Private runtime path escaped ${PRIVATE_ROOT}: ${p}`);
 if(path.basename(asset).toLowerCase()!=="isosnow.mix")throw new Error("Asset must be named isosnow.mix");
 const stat=fs.statSync(asset);if(!stat.isFile()||stat.size<100_000)throw new Error("isosnow.mix is missing or implausibly small");
 const assetDirectory=path.dirname(asset);
 const snowAssets=SNOW_ASSETS.map(name=>{
  const assetPath=path.join(assetDirectory,name),assetStat=fs.statSync(assetPath);
  if(!assetStat.isFile()||assetStat.size<(name==="sno.mix"?1_000:100_000))throw new Error(`${name} is missing or implausibly small`);
  return{name,path:assetPath,bytes:assetStat.size,sha256:sha256File(assetPath)};
 });
 if(fs.existsSync(runtime)||fs.existsSync(manifestPath))throw new Error("Refusing to reuse private runtime or manifest output");
 const repo=execFileSync("git",["rev-parse","--show-toplevel"],{encoding:"utf8"}).trim();
 const data=path.join(repo,"packages","chronodivide-bot-driver","data"),mapPath=path.join(data,HFO_MAP);
 if(sha256File(mapPath)!==HFO_MAP_SHA256)throw new Error("HFO map bytes drifted");
 fs.mkdirSync(runtime,{recursive:true,mode:0o700});
 for(const entry of fs.readdirSync(data,{withFileTypes:true})){
  if(!entry.isFile()&&!entry.isSymbolicLink())continue;
  fs.symlinkSync(path.join(data,entry.name),path.join(runtime,entry.name));
 }
 for(const snowAsset of snowAssets)fs.symlinkSync(snowAsset.path,path.join(runtime,snowAsset.name));
 const manifest={schemaVersion:1,kind:"private-ra2-snow-runtime",generatedAt:new Date().toISOString(),releaseEligible:false,
  sourceGitCommit:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),privateRoot:PRIVATE_ROOT,
  runtimeDirectory:runtime,baseDataDirectory:data,asset:{path:asset,bytes:stat.size,sha256:sha256File(asset)},
  snowAssets,
  map:{name:HFO_MAP,path:mapPath,sha256:HFO_MAP_SHA256},runtimeEntryCount:fs.readdirSync(runtime).length};
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n",{flag:"wx",mode:0o600});
 console.log(JSON.stringify({manifestPath,manifestSha256:sha256File(manifestPath),runtimeDirectory:runtime,
  assetBytes:stat.size,assetSha256:manifest.asset.sha256}));
};
const invoked=process.argv[1]?pathToFileURL(path.resolve(process.argv[1])).href:null;
if(import.meta.url===invoked)try{main();}catch(e){console.error(e);process.exitCode=1;}

import { describe,expect,it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { buildProgressTriggeredCapabilityPolicy,progressTriggeredAirStructures,progressTriggeredAirUnit,
    progressTriggeredCapabilityPolicySha256 } from "../training/progressTriggeredCapabilityCandidate.js";
describe("progress-triggered capability reserve",()=>{
 it("uses side-correct air units and prerequisites",()=>{
  expect(progressTriggeredAirUnit(Countries.USA)).toBe("JUMPJET");
  expect(progressTriggeredAirUnit(Countries.IRAQ)).toBe("ZEP");
  expect(progressTriggeredAirStructures(Countries.USA)).toEqual(["GAAIRC","AMRADR","GATECH"]);
  expect(progressTriggeredAirStructures(Countries.IRAQ)).toEqual(["NARADR","NATECH"]);
 });
 it("freezes only disabled, air-2, and air-4 policies",()=>{
  for(const count of [0,2,4] as const){const p=buildProgressTriggeredCapabilityPolicy(count);
   expect(p.enabled).toBe(count>0);expect(p.productionPriority).toBe(180);expect(p.prerequisitePriority).toBe(170);
   expect(progressTriggeredCapabilityPolicySha256(p)).toMatch(/^[0-9a-f]{64}$/);}
 });
});

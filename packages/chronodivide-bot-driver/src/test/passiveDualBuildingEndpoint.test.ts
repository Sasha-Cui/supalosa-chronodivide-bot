import { describe, expect, it } from "vitest";
import { ApiEventType, GameApi, ObjectType } from "@chronodivide/game-api";
import { PassiveDualBuildingEndpoint } from "../training/passiveDualBuildingEndpoint.js";
const row=(id:number,owner:string,hp=100):any=>({id,owner,hitPoints:hp,rules:{type:ObjectType.Building,name:"GAPOWR"},tile:{rx:id,ry:1}});
const api=(units:any[],tick=1):GameApi=>({
 getAllUnits:(filter:any)=>units.filter(u=>!filter||filter(u.rules)).map(u=>u.id),
 getVisibleUnits:(name:string)=>units.filter(u=>u.owner===name&&u.hitPoints>0).map(u=>u.id),
 getUnitData:(id:number)=>units.find(u=>u.id===id),getCurrentTick:()=>tick,
} as unknown as GameApi);
const normal={finished:false,defeated:{candidate:false,baseline:false}};
const destroy=(id:number,player:string):any=>({type:ApiEventType.ObjectDestroy,target:id,attackerInfo:{playerName:player,objId:99,weaponName:"105mm"}});
const prime=()=>{
 const d=new PassiveDualBuildingEndpoint({candidate:"A",baseline:"B"},90000),g=api([row(1,"A"),row(2,"B")]);
 d.beginUpdate(g);d.completeUpdate(g,normal);return d;
};
describe("passive paired endpoint manager",()=>{
 it("freezes the first v6 result while v5 observes a later opposite elimination",()=>{
  const d=prime();d.beginUpdate(api([row(1,"A"),row(2,"B")]));
  d.observe(destroy(2,"A"));let r=d.completeUpdate(api([row(1,"A"),row(2,"B",0)],2),normal);
  expect(r.v6.firstResult?.winner).toBe("candidate");expect(r.v5.firstResult).toBeNull();expect(r.complete).toBe(false);
  d.beginUpdate(api([row(1,"A"),row(2,"B",0)],2));d.observe(destroy(1,"B"));r=d.completeUpdate(api([row(2,"B",0)],3),normal);
  expect(r.v5.firstResult?.winner).toBe("baseline");expect(r.v6.firstResult?.winner).toBe("candidate");
  expect(r.v6.firstResult?.tick).toBe(2);expect(r.complete).toBe(true);expect(r.failed).toBe(false);
  (r.v6.firstResult as any).winner="changed";expect(d.getState().v6.firstResult?.winner).toBe("candidate");
 });
 it("caps only unfinished observers without overwriting an earlier result",()=>{
  const d=prime();d.beginUpdate(api([row(1,"A"),row(2,"B")]));d.observe(destroy(2,"A"));
  d.completeUpdate(api([row(1,"A"),row(2,"B",0)],2),normal);
  expect(()=>d.capAt(89999)).toThrow("exact");expect(d.getState().v5.firstResult).toBeNull();
  const r=d.capAt(90000);expect(r.v5.firstResult?.status).toBe("tick_cap_draw");expect(r.v6.firstResult?.winner).toBe("candidate");
 });
 it("preserves both versioned cap identities when neither observer finishes",()=>{
  const d=prime(),r=d.capAt(90000);expect(r.v5.firstResult?.endpointVersion).toBe(5);expect(r.v6.firstResult?.endpointVersion).toBe(6);
  expect(r.v5.firstResult?.winner).toBe("draw");expect(r.v6.firstResult?.winner).toBe("draw");
 });
 it("fails closed on native finish without evidence",()=>{
  const d=prime(),g=api([row(1,"A"),row(2,"B")]);d.beginUpdate(g);const r=d.completeUpdate(g,{...normal,finished:true});
  expect(r.failed).toBe(true);expect(r.complete).toBe(true);expect(r.v5.firstResult).toBeNull();expect(r.v6.firstResult).toBeNull();
 });
 it("guards update sequencing and does not advance any game itself",()=>{
  const d=prime(),g=api([row(1,"A"),row(2,"B")]);expect(()=>d.completeUpdate(g,normal)).toThrow("not begun");
  d.beginUpdate(g);expect(()=>d.beginUpdate(g)).toThrow("already began");expect(()=>d.capAt(90000)).toThrow("open");
  d.completeUpdate(g,normal);d.capAt(90000);expect(()=>d.beginUpdate(g)).toThrow("already completed");
 });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {elementalBarrierAbsorption} from "../module/systems/elemental-damage.mjs";
import Ruleset from "../module/systems/ruleset.mjs";
import { absorbShieldDamage } from "../module/systems/legacy2-shield.mjs";
let health;
try { health = await import("../module/applications/actor/jj/legacy2-hit-points.mjs"); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; health = {}; }
const use = name => { assert.equal(typeof health[name], "function", name + " must implement temporary HP totals"); return health[name]; };
const hp = (value=20, temp=0, max=20) => ({value, temp, max, effectiveMax:max, tempmax:0, damage:max-value});
const totalField = "jj2HitPointsTotal";

test("typing 30 into 20 maximum stores 20 normal HP and 10 native temporary HP", () => {
  const current = hp(), before = structuredClone(current);
  assert.deepEqual(use("prepareHitPointsTotalUpdate")(current, 30), {value:20,temp:10});
  assert.deepEqual(current, before);
});
test("lowering the displayed total consumes temporary HP before normal HP", () => {
  const update = use("prepareHitPointsTotalUpdate");
  assert.deepEqual(update(hp(20,10),24), {value:20,temp:4});
  assert.deepEqual(update(hp(20,10),18), {value:18,temp:0});
  assert.deepEqual(update(hp(20,10),0), {value:0,temp:0});
});
test("an existing temporary buffer is not converted to healing when wounded HP changes", () => {
  const update = use("prepareHitPointsTotalUpdate");
  assert.deepEqual(update(hp(8,5),18), {value:13,temp:5});
  assert.deepEqual(update(hp(8,5),30), {value:20,temp:10});
  assert.deepEqual(update(hp(8,5),11), {value:8,temp:3});
});
test("effective maximum, including zero, controls the split and bounds both visual bars", () => {
  const presentation = use("hitPointsPresentation"), update = use("prepareHitPointsTotalUpdate");
  const current = {...hp(),effectiveMax:12,value:12};
  assert.deepEqual(update(current,20), {value:12,temp:8});
  const shown = presentation({...current,temp:8});
  assert.equal(shown.total,20);assert.equal(shown.max,12);assert.equal(shown.value,12);assert.equal(shown.temp,8);
  assert.equal(shown.pct,100);assert.equal(shown.tempPct,100*8/12);
  const zero = {...hp(0,7),effectiveMax:0};
  assert.deepEqual(update({...zero,temp:0},7), {value:0,temp:7});
  assert.equal(presentation(zero).pct,0);assert.equal(presentation(zero).tempPct,100);
  assert.equal(presentation(hp(20,50)).tempPct,100);assert.equal(presentation(hp(20,50)).tempMax,50);
});
test("unchanged, empty or non-finite totals do not generate health updates", () => {
  const update = use("prepareHitPointsTotalUpdate");
  for (const value of [25,"",null,undefined,NaN,Infinity,"not a number"]) assert.deepEqual(update(hp(20,5),value), {});
});
test("unrelated form edits remove the presentation field without overwriting HP", () => {
  const actor = {isOwner:true,system:{attributes:{hp:hp(20,5)}}};
  const data = {name:"Novo nome",[totalField]:30,system:{energy:{total:9}}};
  use("processHitPointsTotalForm")(actor,data,{changedField:"name",initialTotal:25});
  assert.deepEqual(data,{name:"Novo nome",system:{energy:{total:9}}});
  assert.equal(actor.system.attributes.hp.temp,5);
});
test("editing the total writes only native normal and temporary HP fields", () => {
  const actor = {isOwner:true,system:{attributes:{hp:hp()}}};
  const data = {[totalField]:30,system:{attributes:{hp:{temp:0}}}};
  use("processHitPointsTotalForm")(actor,data,{changedField:totalField,initialTotal:20});
  assert.deepEqual(data,{system:{attributes:{hp:{value:20,temp:10}}}});
  assert.equal(actor.system.attributes.hp.value,20);assert.equal(actor.system.attributes.hp.temp,0);
});
test("manual saves preserve a newer damage update when the total input was not edited", () => {
  const actor = {isOwner:true,system:{attributes:{hp:hp(12)}}}, data = {[totalField]:20,name:"Nome"};
  use("processHitPointsTotalForm")(actor,data,{initialTotal:20});
  assert.deepEqual(data,{name:"Nome"});
});
test("native temporary HP edits are not replaced by the combined header value", () => {
  const actor = {isOwner:true,system:{attributes:{hp:hp()}}};
  const data = {[totalField]:20,system:{attributes:{hp:{temp:7}}}};
  use("processHitPointsTotalForm")(actor,data,{changedField:"system.attributes.hp.temp",initialTotal:20});
  assert.deepEqual(data,{system:{attributes:{hp:{temp:7}}}});
  const forbidden = {[totalField]:30};
  health.processHitPointsTotalForm({...actor,isOwner:false},forbidden,{changedField:totalField,initialTotal:20});
  assert.deepEqual(forbidden,{});
});
test("the shared native form processor converts the header total before document validation", () => {
  use("processHitPointsTotalForm");
  const source=readFileSync(new URL("../module/applications/actor/api/base-actor-sheet.mjs",import.meta.url),"utf8");
  const method=source.match(/  _processFormData\(event, form, formData\) \{([\s\S]*?)\r?\n  \}/)[1];
  class Parent { _processFormData(_event,_form,formData) { return structuredClone(formData.object); } }
  const Sheet=new Function("Parent","processHitPointsTotalForm","HIT_POINTS_TOTAL_FIELD", "return class extends Parent { _processFormData(event,form,formData){"+method+"}}")
    (Parent,health.processHitPointsTotalForm,totalField);
  const sheet=Object.assign(new Sheet(),{actor:{isOwner:true,system:{attributes:{hp:hp()}}}});
  const form={querySelectorAll:()=>[],querySelector:()=>({dataset:{hpTotal:"20"}})};
  const result=sheet._processFormData({type:"change",target:{name:totalField}},form,{object:{[totalField]:30}});
  assert.deepEqual(result,{system:{attributes:{hp:{value:20,temp:10}}}});
});

globalThis.game={settings:{get:()=>"2.0"}};
globalThis.Hooks={on(){},call:()=>true,callAll(){}};
globalThis.ChatMessage={create:async()=>{},getSpeaker:()=>({})};
globalThis.ui={notifications:{info(){},warn(){}}};
Number.isNumeric??=value=>typeof value==="number";
Math.clamp??=(value,min,max)=>Math.min(max,Math.max(min,value));
const actorSource=readFileSync(new URL("../module/documents/actor/actor.mjs",import.meta.url),"utf8");
const damageBody=actorSource.match(/async applyDamage\(damages, options=\{\}\) \{([\s\S]*?)\n  \}/)[1];
const nativeDamage=new Function("Ruleset","absorbShieldDamage","elementalBarrierAbsorption","return async function(damages,options={}){"+damageBody+"}")(Ruleset, absorbShieldDamage, elementalBarrierAbsorption);
const {applyDamageToActor}=await import("../module/applications/actor/jj/damage-application.mjs");
function damageActor(type) {
  const actor={type,name:"Cultivador",system:{attributes:{hp:hp()},armorPoints:{value:0},legacy2:{wounds:{value:0}},_source:{attributes:{hp:{tempmax:0}}}},
    getFlag:()=>undefined,calculateDamage:damages => Object.assign(structuredClone(damages), { amount: damages.reduce((sum,part) => sum + part.value,0), temp: 0, tempMax: 0 }),
    async update(patch){for(const [key,value] of Object.entries(patch)){const parts=key.split("."),last=parts.pop();parts.reduce((obj,part)=>obj[part],this)[last]=value;}}};
  Object.assign(actor.system.attributes.hp,use("prepareHitPointsTotalUpdate")(actor.system.attributes.hp,30));
  return actor;
}
for(const type of ["character","npc"]) for(const route of ["native","custom"]) test(route+"/"+type+": excess HP survives updates and absorbs damage before normal HP",async()=>{
  const actor=damageActor(type),apply=amount=>route==="native"?nativeDamage.call(actor,[{value:amount}]):applyDamageToActor(actor,amount);
  await apply(6);assert.equal(actor.system.attributes.hp.value,20);assert.equal(actor.system.attributes.hp.temp,4);
  await apply(8);assert.equal(actor.system.attributes.hp.value,16);assert.equal(actor.system.attributes.hp.temp,0);
});

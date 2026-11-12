import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import Ruleset from "../module/systems/ruleset.mjs";
import { applyNumericResistances } from "../module/systems/legacy2-resistances.mjs";
import {prepareElementalDamage, elementalBarrierAbsorption} from "../module/systems/elemental-damage.mjs";

let version = "2.0";
globalThis.game = { settings: { get: () => version } };
globalThis.CONFIG = { DND5E: { damageTypes: { slashing: { isPhysical: true }, force: {}, fire: {} },
  healingTypes: { healing: {}, temphp: {}, maximum: {} } } };
globalThis.foundry = { utils: { deepClone: structuredClone } };
globalThis.Hooks = { on() {}, call: () => true, callAll() {} };
globalThis.ChatMessage = { create: async () => {}, getSpeaker: () => ({}) };
globalThis.ui = { notifications: { info() {} } };
Number.isNumeric ??= n => typeof n === "number" && Number.isFinite(n);
Math.clamp ??= (n, min, max) => Math.min(max, Math.max(min, n));
const { applyDamageToActor } = await import("../module/applications/actor/jj/damage-application.mjs");
const { absorbShieldDamage } = await import("../module/systems/legacy2-shield.mjs").catch(() => ({}));
const source = readFileSync(new URL("../module/data/actor/character.mjs", import.meta.url), "utf8");
const armorPreparation = new Function("Ruleset", source.match(/    \/\/ Pontos de Armadura \(Foco Defensivo\)[\s\S]*?\r?\n  }/)[0].replace(/\r?\n  }$/, ""));

const actorSource = readFileSync(new URL("../module/documents/actor/actor.mjs", import.meta.url), "utf8");
const methods = actorSource.slice(actorSource.indexOf("  async applyDamage(damages, options={})"), actorSource.indexOf("  async applyTempHP("));
const NativeActor = new Function("Ruleset", "applyNumericResistances", "absorbShieldDamage", "simplifyBonus", "prepareElementalDamage", "elementalBarrierAbsorption",
  `return class { getRollData(){return {}} ${methods} }`)(Ruleset, applyNumericResistances, absorbShieldDamage, Number, prepareElementalDamage, elementalBarrierAbsorption);
function actor(shield = 20, temp = 0) {
  const a = new NativeActor();
  a.name = "Alvo";
  a.system = { armorPoints: { value: shield }, legacy2: {}, traits: {},
    attributes: { hp: { value: 100, temp, tempmax: 0, damage: 0 } },
    _source: { attributes: { hp: { tempmax: 0 } } } };
  a.getFlag = () => null;
  a.update = async data => {
    for (const [key, value] of Object.entries(data)) {
      const parts = key.split("."), last = parts.pop();
      parts.reduce((obj, part) => obj[part] ??= {}, a)[last] = value;
    }
  };
  return a;
}


function realmActor(rank,shield=0,temp=0){const a=actor(shield,temp);a.type='character';a.system.cultivation={rank};return a;}
for(const route of ['native','custom']){
 const apply=(a,parts,sourceActor)=>route==='native'?a.applyDamage(parts,{originatingMessage:{getAssociatedActor:()=>sourceActor}}):applyDamageToActor(a,parts.reduce((s,p)=>s+p.value,0),{damages:parts,sourceActor});
 test(route+': vantagem de reino precede resistência, PV temporários e vida',async()=>{
  const target=realmActor(3,0,2);target.system.legacy2.resistances={fire:{value:3}};
  await apply(target,[{type:'fire',value:10}],realmActor(5));
  assert.equal(target.system.attributes.hp.temp,0);assert.equal(target.system.attributes.hp.value,89);
 });
 test(route+': imunidade imperial não consome escudo, vida temporária ou defesa pendente',async()=>{
  const target=realmActor(8,20,3);target.getFlag=(_scope,key)=>key==='explosaoDefensivaPendente'?{reducao:10}:null;
  const writes=[];const original=target.update;target.update=async data=>{writes.push(data);return original(data);};
  await apply(target,[{type:'fire',value:50}],realmActor(4));
  assert.equal(target.system.armorPoints.value,20);assert.equal(target.system.attributes.hp.temp,3);assert.equal(target.system.attributes.hp.value,100);
  assert(writes.every(update=>!Object.hasOwn(update,'flags.Immortals-system.-=explosaoDefensivaPendente')));
 });
 test(route+': PdN sem reino não é presumido Mortal',async()=>{
  const target=realmActor(8);await apply(target,[{type:'fire',value:10}],{type:'npc',system:{details:{cr:1}}});
  assert.equal(target.system.attributes.hp.value,90);
 });
}
test('native: multiplicador de metade inclui o bônus e cura continua intacta',async()=>{
 const target=realmActor(3);const source=realmActor(5);
 const result=target.calculateDamage([{type:'fire',value:10}],{multiplier:0.5,sourceActor:source});assert.equal(result.amount,8);
 assert.equal(target.calculateDamage([{type:'healing',value:10}],{sourceActor:source,only:'healing'}).amount,-10);
});
test('custom: dano direto na vida atravessa a imunidade imperial',async()=>{const a=realmActor(8);await applyDamageToActor(a,10,{sourceActor:realmActor(1),diretoNaVida:true});assert.equal(a.system.attributes.hp.value,90);});

test('native: converter dano em cura não concede bônus nem bloqueia recuperação por reino',()=>{
 const a=realmActor(3);assert.equal(a.calculateDamage([{type:'fire',value:10}],{sourceActor:realmActor(5),multiplier:-1}).amount,-10);
 const b=realmActor(8);assert.equal(b.calculateDamage([{type:'fire',value:10}],{sourceActor:realmActor(4),multiplier:-1}).amount,-10);
});

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



function soulActor(level=3){const a=actor(20,5);a.type='character';a.flags={};a.system.cultivation={rank:1,soulCultivation:level};a.system.legacy2.wounds={value:0,soul:0};a.system.attributes.hp.max=100;a.system.attributes.hp.effectiveMax=100;return a;}
for(const route of ['native','custom']){
 const apply=(target,parts,sourceActor)=>route==='native'?target.applyDamage(parts,{sourceActor}):applyDamageToActor(target,parts.reduce((sum,part)=>sum+part.value,0),{damages:parts,sourceActor});
 test(route+': Alma consome apenas a reserva espiritual e o excedente vira Feridas',async()=>{const a=soulActor(3);await apply(a,[{type:'soul',value:40}]);
 assert.equal(a.flags['Immortals-system'].soulBarrierSpent,30);assert.equal(a.system.legacy2.wounds.value,10);assert.equal(a.system.legacy2.wounds.soul,10);
 assert.equal(a.system.armorPoints.value,20);assert.equal(a.system.attributes.hp.temp,5);assert.equal(a.system.attributes.hp.value,95);});
 test(route+': dano misto mantém Escudo e PV temporários comuns fora da parcela de Alma',async()=>{const a=soulActor(3);await apply(a,[{type:'soul',value:40},{type:'fire',value:10}]);
 assert.equal(a.system.legacy2.wounds.value,10);assert.equal(a.system.armorPoints.value,15);assert.equal(a.system.attributes.hp.temp,5);assert.equal(a.system.attributes.hp.value,95);});
 test(route+': resistência espiritual e Penetração são aplicadas antes da reserva',async()=>{const a=soulActor(4),source=soulActor(5);source.uuid='Actor.source';
 await apply(a,[{type:'soul',value:50}],source);assert.equal(a.flags['Immortals-system'].soulBarrierSpent,40);assert.equal(a.system.legacy2.wounds.value,5);assert.equal(a.system.attributes.hp.value,98);});
 test(route+': PdNs preservam o tratamento atual até sua regra própria',async()=>{const a=soulActor(3);a.type='npc';a.flags={'Immortals-system':{soulCultivation:3}};
 await apply(a,[{type:'soul',value:40}]);assert.equal(a.system.armorPoints.value,0);assert.equal(a.system.legacy2.wounds.value,0);assert.equal(a.flags['Immortals-system'].soulBarrierSpent,undefined);});
}

for(const route of ['native','custom']){
 test(route+': Espírito de Batalha acrescenta dano Psíquico uma vez no ataque',async()=>{const target=soulActor(0),source=soulActor(4);source.uuid='Actor.source';target.system.armorPoints.value=0;target.system.attributes.hp.temp=0;
 if(route==='native')await target.applyDamage([{type:'fire',value:10}],{sourceActor:source,isAttack:true});else await applyDamageToActor(target,10,{damages:[{type:'fire',value:10}],sourceActor:source,isAttack:true});
 assert.equal(target.system.attributes.hp.value,84);assert.equal(target.system.legacy2.wounds.value,0);});
 test(route+': Psíquico pelo Avatar reduz máximo e vida apenas de quem não tem cultivo da alma',async()=>{const target=soulActor(0);target.system.armorPoints.value=0;target.system.attributes.hp.temp=0;
 if(route==='native')await target.applyDamage([{type:'psychic',value:10}],{avatarChannel:true});else await applyDamageToActor(target,10,{damages:[{type:'psychic',value:10}],avatarChannel:true});
 assert.equal(target.system.attributes.hp.value,90);assert.equal(target.system.attributes.hp.tempmax,-10);assert.equal(target.flags['Immortals-system'].soulAvatarHpLoss,10);});
}

for(const route of ['native','custom'])test(route+': perder máximo pelo Avatar preserva bônus de máximo vindos de efeitos',async()=>{
 const a=soulActor(0);a.system.armorPoints.value=0;a.system.attributes.hp.temp=0;a.system.attributes.hp.tempmax=5;a.system.attributes.hp.value=105;a.system.attributes.hp.effectiveMax=105;
 if(route==='native')await a.applyDamage([{type:'psychic',value:5}],{avatarChannel:true});else await applyDamageToActor(a,5,{damages:[{type:'psychic',value:5}],avatarChannel:true});
 assert.equal(a.system.attributes.hp.value,100);assert.equal(a.system.attributes.hp.tempmax,-5);
});

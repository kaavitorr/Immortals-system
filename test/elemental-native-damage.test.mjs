import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import Ruleset from "../module/systems/ruleset.mjs";
import {applyNumericResistances} from "../module/systems/legacy2-resistances.mjs";
import {absorbShieldDamage} from "../module/systems/legacy2-shield.mjs";
import {prepareElementalDamage, elementalBarrierAbsorption, elementalDamageSnapshot} from "../module/systems/elemental-damage.mjs";
let version = "2.0";
globalThis.game = {settings: {get: () => version}};
globalThis.CONFIG = {DND5E: {damageTypes: {slashing: {isPhysical: true}, fire: {}, cold: {}, lightning: {}, psychic: {}, soul: {}, force: {}},
  healingTypes: {healing: {}, temphp: {}, maximum: {}}}};
globalThis.foundry = {utils: {deepClone: structuredClone}};
globalThis.Hooks = {on() {}, call: () => true, callAll() {}};
globalThis.ui = {notifications: {info() {},warn() {}}};
Number.isNumeric ??= value => typeof value === "number" && Number.isFinite(value);
Math.clamp ??= (value, min, max) => Math.min(max, Math.max(min, value));
const source = readFileSync(new URL("../module/documents/actor/actor.mjs", import.meta.url), "utf8");
const methods = source.slice(source.indexOf("  async applyDamage(damages, options={})"), source.indexOf("  async applyTempHP("));
const NativeActor = new Function("Ruleset", "applyNumericResistances", "absorbShieldDamage", "simplifyBonus", "prepareElementalDamage", "elementalBarrierAbsorption",
  "return class { getRollData(){return {}} " + methods + " }")
  (Ruleset, applyNumericResistances, absorbShieldDamage, Number, prepareElementalDamage, elementalBarrierAbsorption);
const scope = "Immortals-system";
function actor({type = "character", barrier = 0, armor = 0, temp = 0, hp = 100, soul = 0, flags = {}, abilities = {}} = {}) {
  const target = new NativeActor(); Object.assign(target, {type, name: "Alvo", flags: {[scope]: {elementalState: {barrier: {value: barrier}}, ...flags}}, writes: []});
  target.system = {abilities: {con: {value: 5}, wis: {value: 4}}, elementAbilities: abilities,
    cultivation: {rank: 1, soulCultivation: soul}, armorPoints: {value: armor}, legacy2: {wounds: {value: 0, soul: 0}}, traits: {},
    attributes: {hp: {value: hp, max: 100, effectiveMax: 100, temp, tempmax: 0, damage: 100 - hp}},
    _source: {attributes: {hp: {tempmax: 0}}}};
  target.getFlag = (namespace, key) => target.flags?.[namespace]?.[key];
  target.update = async updates => { target.writes.push(structuredClone(updates));
    for (const [path, value] of Object.entries(updates)) { const parts = path.split("."), last = parts.pop(); let node = target;
      for (const part of parts) node = node[part] ??= {};
      if (last.startsWith("-=")) delete node[last.slice(2)]; else node[last] = structuredClone(value);
    }
    target.system.attributes.hp.damage = target.system.attributes.hp.max - target.system.attributes.hp.value;
  };
  return target;
}
const message = (sourceActor, activity = {type: "attack", item: {type: "weapon"}}, snapshot) => ({
  getAssociatedActor: () => sourceActor, getAssociatedActivity: () => activity,
  flags: {[scope]: {elementalSnapshot: snapshot}}
});
const total = (parts, type) => parts.filter(part => part.type === type).reduce((sum, part) => sum + part.value, 0);

test("native preview uses the source message's paid snapshot after its elemental mode changes", () => {
  const sourceActor = actor({abilities: {fogo: {qiFlamejante: 1}, gelo: {frioCongelante: 3}}});
  sourceActor.flags[scope].elementalState.damageMode = "fogo";
  const snapshot = elementalDamageSnapshot(sourceActor, {isAttack: true});
  sourceActor.flags[scope].elementalState.damageMode = "gelo";
  const target = actor(); target.system.legacy2.resistances = {fire: {value: 3}};
  const result = target.calculateDamage([{type: "slashing", value: 10}], {origin: message(sourceActor, undefined, snapshot)});
  assert.equal(total(result, "slashing"), 5); assert.equal(total(result, "fire"), 4); assert.equal(total(result, "cold"), 0);
  assert.equal(result.amount, 9); assert.equal(target.writes.length, 0);
});

test("native conversion groups all resulting same-type portions before applying numeric resistance", () => {
  const sourceActor = actor({abilities: {fogo: {qiFlamejante: 1}}}); sourceActor.flags[scope].elementalState.damageMode = "fogo";
  const target = actor(); target.system.legacy2.resistances = {fire: {value: 3}};
  const input = [{type: "slashing", value: 7, properties: new Set(["magic"])}, {type: "slashing", value: 5}];
  const result = target.calculateDamage(input, {originatingMessage: message(sourceActor)});
  assert.equal(total(result, "slashing"), 6); assert.equal(total(result, "fire"), 5); assert.equal(result.amount, 11);
  assert.deepEqual(input.map(part => part.value), [7,5]); assert(result[0].properties.has("magic"));
});

test("native previews preserve aggregate array properties while replacing typed portions", () => {
  const sourceActor = actor({abilities: {gelo: {frioCongelante: 2}}}); sourceActor.flags[scope].elementalState.damageMode = "gelo";
  const previous = Hooks.call;
  Hooks.call = (event, _actor, parts) => { if (event === "dnd5e.preCalculateDamage") { parts.temp = 3; parts.tempMax = 4; } return true; };
  try {
    const result = actor().calculateDamage([{type: "slashing", value: 10}, {type: "temphp", value: 5}, {type: "maximum", value: 2}], {originatingMessage: message(sourceActor)});
    assert.equal(total(result, "cold"), 10); assert.equal(result.amount, 10); assert.equal(result.temp, 8); assert.equal(result.tempMax, 6);
  } finally { Hooks.call = previous; }
});

test("native healing, negative multipliers and direct damage cannot receive elemental conversions or flat bonuses", async () => {
  const sourceActor = actor({abilities: {fogo: {qiFlamejante: 3}}}); sourceActor.flags[scope].elementalState.damageMode = "fogo";
  const target = actor({barrier: 10, hp: 70}), origin = message(sourceActor); origin.system = {isHealing: true};
  const healing = target.calculateDamage([{type: "healing", value: 10}], {origin});
  assert.equal(healing.amount, -10); assert.equal(total(healing, "fire"), 0);
  const inverse = target.calculateDamage([{type: "slashing", value: 10}], {originatingMessage: message(sourceActor), multiplier: -1});
  assert.equal(inverse.amount, -10); assert.equal(total(inverse, "fire"), 0);
  await target.applyDamage([{type: "slashing", value: 10}], {originatingMessage: message(sourceActor), direct: true});
  assert.equal(target.system.attributes.hp.value, 60); assert.equal(target.flags[scope].elementalState.barrier.value, 10);
});

test("native associated activities distinguish attacks from save-based techniques", () => {
  const sourceActor = actor({abilities: {fogo: {qiFlamejante: 3}}}), target = actor();
  const attack = target.calculateDamage([{type: "slashing", value: 10}], {originatingMessage: message(sourceActor, {type: "attack", item: {type: "spell"}})});
  const save = target.calculateDamage([{type: "slashing", value: 10}], {originatingMessage: message(sourceActor, {type: "save", item: {type: "spell"}})});
  assert.equal(attack.amount, 15); assert.equal(save.amount, 10);
});

test("finite native barriers persist only their remainder across hits before armor, temporary life and HP", async () => {
  const target = actor({barrier: 12, armor: 2, temp: 3});
  target.calculateDamage([{type: "fire", value: 10}]); assert.equal(target.flags[scope].elementalState.barrier.value, 12); assert.equal(target.writes.length, 0);
  await target.applyDamage([{type: "fire", value: 10}]);
  assert.equal(target.flags[scope].elementalState.barrier.value, 2); assert.equal(target.system.armorPoints.value, 2); assert.equal(target.system.attributes.hp.temp, 3);
  await target.applyDamage([{type: "fire", value: 10}]);
  assert.equal(target.flags[scope].elementalState.barrier.value, 0); assert.equal(target.system.armorPoints.value, 0); assert.equal(target.system.attributes.hp.temp, 0); assert.equal(target.system.attributes.hp.value, 99);
  assert.equal(target.writes.length, 2); assert.equal(target.flags[scope].reducaoDano, undefined);
  assert.equal(target.writes[1]["flags.Immortals-system.elementalState.barrier.value"], 0);
  assert.equal(target.writes[1]["system.attributes.hp.value"], 99);
});

test("pending reductions partition mixed NPC Soul damage before a barrier without erasing its old HP treatment", async () => {
  const target = actor({type: "npc", barrier: 100, flags: {explosaoDefensivaPendente: {reducao: 5}}});
  await target.applyDamage([{type: "soul", value: 10}, {type: "fire", value: 10}]);
  assert.equal(target.flags[scope].elementalState.barrier.value, 93); assert.equal(target.system.attributes.hp.value, 92);
  assert.equal(target.system.legacy2.wounds.soul, 0); assert.equal(target.flags[scope].explosaoDefensivaPendente, undefined);
  assert.equal(target.writes.length, 1); assert.equal(target.writes[0]["flags.Immortals-system.-=explosaoDefensivaPendente"], null);
});

test("pure Soul damage never consumes the ordinary elemental barrier for PCs or NPCs", async () => {
  const pc = actor({barrier: 20, soul: 3}), npc = actor({type: "npc", barrier: 20});
  await pc.applyDamage([{type: "soul", value: 10}]); await npc.applyDamage([{type: "soul", value: 10}]);
  assert.equal(pc.flags[scope].elementalState.barrier.value, 20); assert.equal(npc.flags[scope].elementalState.barrier.value, 20);
  assert.equal(pc.flags[scope].soulBarrierSpent, 10); assert.equal(npc.system.attributes.hp.value, 90);
});

test("persistent pending reduction stays separate from the exhausted finite barrier", async () => {
  const target = actor({barrier: 5, flags: {reducaoDano: {valor: 3, persistente: true}}});
  await target.applyDamage([{type: "fire", value: 10}]); await target.applyDamage([{type: "fire", value: 10}]);
  assert.equal(target.flags[scope].elementalState.barrier.value, 0); assert.deepEqual(target.flags[scope].reducaoDano, {valor: 3, persistente: true});
  assert.equal(target.system.attributes.hp.value, 91); assert.equal(target.writes.length, 2);
});

test("a canceled native HP write cannot consume barrier points in a separate update", async () => {
  const target = actor({barrier: 5}), previous = Hooks.call;
  Hooks.call = event => event !== "dnd5e.preApplyDamage";
  try { await target.applyDamage([{type: "fire", value: 10}]); }
  finally { Hooks.call = previous; }
  assert.equal(target.writes.length, 0); assert.equal(target.flags[scope].elementalState.barrier.value, 5); assert.equal(target.system.attributes.hp.value, 100);
});

test("the 1.0 native damage route does not activate elemental conversion or barriers", async () => {
  version = "1.0";
  try { const sourceActor = actor({abilities: {fogo: {qiFlamejante: 3}}}); sourceActor.flags[scope].elementalState.damageMode = "fogo";
    const target = actor({barrier: 20}); await target.applyDamage([{type: "slashing", value: 10}], {originatingMessage: message(sourceActor)});
    assert.equal(target.system.attributes.hp.value, 90); assert.equal(target.flags[scope].elementalState.barrier.value, 20);
  } finally { version = "2.0"; }
});

test('bubble loses raw integrity before recipient resistance, and preview cannot consume it',async()=>{const victim=actor({flags:{elementalConstructs:{bubble:{version:1,id:'bubble',kind:'bubble',active:true,hp:{value:25,max:25},expiresAt:null,receipts:[],targetUuids:['Actor.target']}}}});victim.system.legacy2.resistances={fire:{value:10}};const preview=victim.calculateDamage([{type:'fire',value:40}],{});assert.equal(preview.amount,5);assert.equal(victim.flags[scope].elementalConstructs.bubble.hp.value,25);await victim.applyDamage([{type:'fire',value:40}],{receipt:'bubble-hit'});assert.equal(victim.system.attributes.hp.value,95);assert.equal(victim.flags[scope].elementalConstructs.bubble.hp.value,0);await victim.applyDamage([{type:'fire',value:40}],{receipt:'bubble-hit'});assert.equal(victim.system.attributes.hp.value,95);});

test('external Soul damage meets Bubble integrity before the Soul ward or wounds',async()=>{const victim=actor({soul:3,flags:{elementalConstructs:{bubble:{id:'bubble',kind:'bubble',active:true,hp:{value:25,max:25},expiresAt:null,receipts:[]}}}});await victim.applyDamage([{type:'soul',value:30}],{receipt:'soul-bubble'});assert.equal(victim.flags[scope].elementalConstructs.bubble.hp.value,0);assert.equal(victim.flags[scope].soulBarrierSpent,5);assert.equal(victim.system.legacy2.wounds.value,0);assert.equal(victim.system.attributes.hp.value,100);});

test('a token-scoped Bubble never protects a different linked token and unknown token context is refused',async()=>{const flags={elementalConstructs:{bubble:{id:'bubble',kind:'bubble',active:true,hp:{value:25,max:25},expiresAt:null,receipts:[],targetUuids:['Scene.s.Token.one']}}};const outside=actor({flags:structuredClone(flags)});await outside.applyDamage([{type:'fire',value:40}],{targetTokenUuid:'Scene.s.Token.two'});assert.equal(outside.flags[scope].elementalConstructs.bubble.hp.value,25);assert.equal(outside.system.attributes.hp.value,60);const inside=actor({flags:structuredClone(flags)});await inside.applyDamage([{type:'fire',value:40}],{targetTokenUuid:'Scene.s.Token.one'});assert.equal(inside.system.attributes.hp.value,85);const unknown=actor({flags:structuredClone(flags)});await unknown.applyDamage([{type:'fire',value:40}],{});assert.equal(unknown.system.attributes.hp.value,100);assert.equal(unknown.flags[scope].elementalConstructs.bubble.hp.value,25);});
test('native damage honors shared prison references and outgoing isolation even without local construct records',async()=>{const owner={uuid:'Actor.jailer',flags:{[scope]:{elementalConstructs:{prison:{id:'prison',kind:'icePrison',active:true,geometryOnly:true,hp:{value:2000,max:2000},expiresAt:null,targetUuids:['Actor.captive'],blocksExternalAttacks:true,blocksOutgoing:true,receipts:[]}}}}};globalThis.fromUuidSync=id=>id===owner.uuid?owner:null;const captive=actor({flags:{elementalConstructRefs:{prison:{id:'prison',kind:'icePrison',ownerActorUuid:owner.uuid,recordId:'prison'}}}});captive.uuid='Actor.captive';const outside=actor();outside.uuid='Actor.outside';await captive.applyDamage([{type:'fire',value:30}],{sourceActor:outside});assert.equal(captive.system.attributes.hp.value,100);await outside.applyDamage([{type:'fire',value:30}],{sourceActor:captive});assert.equal(outside.system.attributes.hp.value,100);});

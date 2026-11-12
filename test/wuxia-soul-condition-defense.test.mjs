import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import Ruleset from "../module/systems/ruleset.mjs";
import { applyLegacy2TestRoll } from "../module/applications/dice/legacy2-test-roll.mjs";

globalThis.Hooks = { on() {}, callAll() {} };
globalThis.game = { settings: { get: (_scope, key) => key === "regraSalvaguarda" ? true : "2.0" }, user: {} };
globalThis.CONFIG = {
  DND5E: { abilities: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map(key => [key, { label: key }])) },
  statusEffects: { frightened: { id: "frightened" } }
};
globalThis.foundry = { utils: { deepClone: structuredClone, mergeObject: (left, right = {}) => ({ ...left, ...right }),
  setProperty: (object, key, value) => { object[key] = value; } } };
const chats = [];
globalThis.ChatMessage = { create: async message => { chats.push(message); }, getSpeaker: () => ({}) };
const { registrarGatilhoDano, aplicarCondicaoPorDano } = await import("../module/systems/condicoes-dano.mjs");

// Execute the native actor methods; replace only the external dice/dialog boundary.
const actorSource = readFileSync(new URL("../module/documents/actor/actor.mjs", import.meta.url), "utf8");
const actorMethods = actorSource.slice(actorSource.indexOf("  async rollSavingThrow(config={}, dialog={}, message={})"), actorSource.indexOf("  async rollDeathSave("));
const NativeActor = new Function("Ruleset", "D20RollModificationField", "_loc", `return class {${actorMethods}}`)(Ruleset,
  { combineFields: () => ({ bonus: 0 }) }, (_key, data) => data.ability);
const basicSource = readFileSync(new URL("../module/dice/basic-roll.mjs", import.meta.url), "utf8");
const constructBody = basicSource.match(/  static constructParts\(parts, data=\{\}\) \{([\s\S]*?)\r?\n  }/)[1];
const constructParts = new Function("parts", "data={}", constructBody);

function fixture({ level = 4, cancel = false, selectedAbility } = {}) {
  const effects = [], records = [];
  chats.length = 0;
  const actor = Object.assign(new NativeActor(), {
    type: "character", id: "soul-defender", name: "Defensor", items: [], effects, flags: {}, statuses: new Set(),
    system: {
      cultivation: { soulCultivation: level },
      abilities: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map(key => [key, { value: 4 }])),
      legacy2: { alternativeSaves: { fortitude: 1, vontade: 1, reflexo: 1 } },
      attributes: { hp: { value: 50, max: 50 }, ac: { cover: 0 } }
    },
    getFlag: () => undefined, getRollData: () => ({ roll: {} }), addConditionRollReduction() {},
    async createEmbeddedDocuments(type, rows) { assert.equal(type, "ActiveEffect"); effects.push(...rows); return rows; }
  });
  CONFIG.Dice = { D20Roll: {
    ADV_MODE: { NORMAL: 0, ADVANTAGE: 1, DISADVANTAGE: -1 }, constructParts,
    mergeConfigs: (config, extra = {}) => ({ ...config, ...extra }),
    async build(process, dialog, message) {
      records.push({ process, dialog, message });
      if (cancel) return [];
      const roll = process.rolls[0];
      applyLegacy2TestRoll(roll, process, selectedAbility ? new Map([["ability", selectedAbility]]) : undefined);
      roll.total = 8 + roll.parts.reduce((sum, part) => sum + Number(roll.data[part.slice(1)] || 0), 0);
      records[0].roll = roll;
      return [roll];
    }
  } };
  async function apply(type) {
    registrarGatilhoDano(actor, { tipos: [type], atacante: { name: "Atacante", system: { abilities: { str: { value: 3 } } } } });
    return aplicarCondicaoPorDano(actor, { tiposAplicados: [type] });
  }
  return { actor, effects, records, apply };
}

for (const type of ["psychic", "soul"]) {
  test(`${type}: automatic condition save includes Soul 4 defense through the native save contract`, async () => {
    const f = fixture();
    assert.equal(await f.apply(type), false);
    assert.equal(f.records.length, 1);
    assert.equal(f.records[0].process.ability, "wis");
    assert.equal(f.records[0].roll.data.soulDefense, 1);
    assert.equal(f.records[0].roll.parts.filter(part => part === "@soulDefense").length, 1);
    assert.equal(f.records[0].roll.total, 13);
    assert.match(f.records[0].message.data.flavor, /CD 13/);
    assert.equal(f.effects.length, 0);
  });

  test(`${type}: Soul 3 does not receive the conditional defense`, async () => {
    const f = fixture({ level: 3 });
    assert.equal(await f.apply(type), true);
    assert.equal(f.records[0].roll.data.soulDefense, 0);
    assert.equal(f.records[0].roll.total, 12);
    assert.equal(f.effects.length, 1);
  });
}

for (const type of ["fire", "necrotic"]) {
  test(`${type}: nonmental damage does not gain Soul defense from its saving-throw category`, async () => {
    const f = fixture();
    assert.equal(await f.apply(type), true);
    assert.equal(f.records[0].roll.data.soulDefense, 0);
    assert.equal(f.records[0].roll.total, 12);
    assert.equal(f.effects.length, 1);
  });
}

for (const [selectedAbility, expectedBonus, expectedApplied] of [["con", 1, false], ["dex", 0, true]]) {
  test(`soul: changing the native save to ${selectedAbility} keeps defense limited to Fortitude/Will`, async () => {
    const f = fixture({ selectedAbility });
    assert.equal(await f.apply("soul"), expectedApplied);
    assert.equal(f.records[0].roll.data.soulDefense, expectedBonus);
    assert.equal(f.effects.length, expectedApplied ? 1 : 0);
  });
}

for (const type of ["psychic", "soul", "fire"]) {
  test(`${type}: cancelling the native saving throw applies no condition or failure feedback`, async () => {
    const f = fixture({ cancel: true });
    assert.equal(await f.apply(type), false);
    assert.equal(f.records.length, 1);
    assert.equal(f.effects.length, 0);
    assert.equal(chats.length, 0);
  });
}

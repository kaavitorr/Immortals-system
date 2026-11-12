import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs/promises";
import {applyLegacy2TestRoll, testRollChoices} from "../module/applications/dice/legacy2-test-roll.mjs";
let training = {};
try { training = await import("../module/systems/elemental-training-roll.mjs"); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }
globalThis.game = {settings: {get: () => "2.0"}, user: {targets: new Set()}};
globalThis.CONFIG = {Dice: {D20Roll: {ADV_MODE: {NORMAL: 0, ADVANTAGE: 1, DISADVANTAGE: -1}}}};
const actor = (rank = 3) => ({type: "character", documentName: "Actor", system: {
  abilities: {con: {value: 11, mod: 0}, int: {value: 18, mod: 4}}, legacy2: {skills: {arc: rank}}},
  statuses: new Set(["jj-hipotermico"]), flags: {"Immortals-system": {halflingLucky: true, reliableTalent: true}}});
const process = subject => ({subject, skill: "arc", ability: "int", hookNames: ["skill", "abilityCheck", "d20Test"],
  advantage: true, disadvantage: true, halflingLucky: true, reliableTalent: true,
  legacy2: {elementalTraining: true, vantagens: 6, desvantagens: 4, mindSoul: true}});
const injected = () => ({parts: ["@mod", "@legacyRank", "@legacyAdv", "@extraBonus", "@ruleBonus", "@situational", "@soulDefense", "1d20rr1=1", "100"],
  data: {abilityId: "int", mod: 99, legacyRank: 99, legacyAdv: 6, extraBonus: "10d20", ruleBonus: 20, situational: "1d4", soulDefense: 3},
  options: {advantageMode: 1, advantage: true, disadvantage: true, halflingLucky: true, reliableTalent: true, elvenAccuracy: true,
    minimum: 20, maximum: 20, fixed: 20, reroll: true, rerolls: [1], rerollOnce: true, rerollAll: true, maximize: true, minimize: true,
    autoSuccess: true, forceSuccess: true, bonus: 100, extraBonus: 100, ruleBonus: 100, situational: "100", configured: true, target: 25,
    flavor: "Treinamento", rollMode: "gmroll"}});
const pure = (roll, p) => { assert.equal(typeof training.elementalTrainingRollConfig, "function"); return training.elementalTrainingRollConfig(roll, p); };
function freeze(value) { if (value && typeof value === "object") { Object.freeze(value); for (const child of Object.values(value)) freeze(child); } return value; }

test("special training checks use full Constitution and the proficiency ladder only", () => {
  for (const [rank, bonus] of [[0,-4], [1,0], [2,1], [3,2], [4,3]]) {
    const result = pure(injected(), process(actor(rank)));
    assert.equal(result.data.mod, 11); assert.equal(result.data.legacyRank, bonus); assert.equal(result.data.abilityId, "con");
    assert.deepEqual(result.parts, bonus === 0 ? ["@mod"] : ["@mod", "@legacyRank"]);
    assert.equal(result.data.roll.ability, "con"); assert.equal(result.data.roll.skill, "arc");
    assert.equal(result.parts.reduce((sum, part) => sum + result.data[part.slice(1)], 0), 11 + bonus);
  }
});

test("manual parts, injected bonuses, automatic minimums and reroll options are removed", () => {
  const result = pure(injected(), process(actor()));
  for (const key of ["legacyAdv", "extraBonus", "ruleBonus", "situational", "soulDefense"]) assert.equal(result.data[key], undefined);
  for (const key of ["minimum", "maximum", "fixed", "reroll", "rerolls", "rerollOnce", "rerollAll", "maximize", "minimize", "autoSuccess", "forceSuccess", "bonus", "extraBonus", "ruleBonus", "situational"]) assert.equal(result.options[key], undefined, key);
  for (const key of ["advantage", "disadvantage", "halflingLucky", "reliableTalent", "elvenAccuracy", "configured"]) assert.equal(result.options[key], false, key);
  assert.equal(result.options.advantageMode, 0); assert.equal(result.situational, false);
  assert.equal(result.options.target, 25); assert.equal(result.options.flavor, "Treinamento"); assert.equal(result.options.rollMode, "gmroll");
  assert.deepEqual(result.options.jj2TestParts, ["@mod", "@legacyRank"]);
});

test("pure rebuilding leaves the actor, process and incoming roll untouched", () => {
  const subject = freeze(actor()), p = freeze(process(subject)), roll = freeze(injected());
  const before = structuredClone({subject, p, roll}); const result = pure(roll, p);
  assert.notEqual(result, roll); assert.deepEqual({subject, p, roll}, before);
});

test("only explicit elemental arc training enters the restricted helper", () => {
  assert.equal(typeof training.isElementalTrainingCheck, "function");
  const subject = actor(); assert(training.isElementalTrainingCheck(process(subject)));
  for (const p of [{...process(subject), skill: "ath"}, {...process(subject), legacy2: {}},
    {...process(subject), legacy2: {elementalTraining: "true"}}, {...process(subject), subject: {item: {}, system: subject.system}}]) {
    const roll = injected(); assert.equal(training.isElementalTrainingCheck(p), false); assert.equal(pure(roll, p), roll);
  }
});

test("special checks bypass automatic condition and soul calculations before reading their inputs", () => {
  const subject = actor(); subject.statuses = {has() { throw Error("Automatic conditions must not run"); }};
  const p = process(subject), result = applyLegacy2TestRoll(injected(), p, new Map([["ability", "int"], ["jj2Test.vantagens", "6"]]));
  assert.equal(result.data.mod, 11); assert.equal(result.data.legacyRank, 2); assert.deepEqual(result.parts, ["@mod", "@legacyRank"]);
  assert.deepEqual(testRollChoices(p, new Map([["jj2Test.vantagens", "6"]]), injected()), {vantagens: 0, desvantagens: 0});
});

test("regular arc checks and other skills keep their ordinary manual bonuses", () => {
  for (const overrides of [{legacy2: {vantagens: 2, desvantagens: 0}}, {skill: "ath"}]) {
    const p = {...process(actor()), ...overrides}, roll = injected();
    const result = applyLegacy2TestRoll(roll, p);
    assert(result.parts.includes("@extraBonus")); assert(result.parts.includes("@ruleBonus")); assert(result.parts.includes("@situational"));
    assert.equal(result.data.mod, 99); assert.equal(result.options.minimum, 20); assert.equal(result.options.halflingLucky, true);
    assert.notDeepEqual(testRollChoices(p), {vantagens: 0, desvantagens: 0});
  }
});

test("the special branch remains idempotent when the native factory prepares it again", () => {
  const p = process(actor()), once = applyLegacy2TestRoll(injected(), p), twice = applyLegacy2TestRoll(once, p);
  assert.deepEqual(twice, once); assert.deepEqual(twice.parts, ["@mod", "@legacyRank"]);
});

test("the native D20 factory cannot restore process luck or reliable talent after rebuilding", async () => {
  globalThis.ElementalTrainingBasicRoll = class {};
  globalThis.CONFIG.Dice.D20Die = class { formula = "1d20"; };
  let source = await fs.readFile(new URL("../module/dice/d20-roll.mjs", import.meta.url), "utf8");
  source = source.replace(/import D20RollConfigurationDialog[^;]+;/, "const D20RollConfigurationDialog = class {};")
    .replace(/import \{ areKeysPressed \}[^;]+;/, "const areKeysPressed = () => false;")
    .replace(/import BasicRoll[^;]+;/, "const BasicRoll = globalThis.ElementalTrainingBasicRoll;");
  source = source.replace(/from "(\.\.[^"]+)"/g, (_, relative) => "from " + JSON.stringify(new URL(relative, new URL("../module/dice/d20-roll.mjs", import.meta.url)).href));
  const {default: D20Roll} = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
  globalThis.CONFIG.Dice.D20Roll = D20Roll;
  class Capture { constructor(formula, data, options) { Object.assign(this, {formula, data, options}); } }
  const result = D20Roll.fromConfig.call(Capture, injected(), process(actor()));
  assert.equal(result.formula, "1d20 + @mod + @legacyRank"); assert.equal(result.data.mod, 11); assert.equal(result.data.legacyRank, 2);
  assert.equal(result.options.halflingLucky, false); assert.equal(result.options.reliableTalent, false);
  assert.equal(result.options.minimum, undefined); assert.equal(result.options.advantageMode, 0);
});

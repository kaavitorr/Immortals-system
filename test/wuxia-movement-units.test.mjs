import {prepareBeastEssenceProfiles} from "../module/systems/beast-essence-profiles.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import Ruleset from "../module/systems/ruleset.mjs";
import { buildLegacy2Context } from "../module/applications/actor/jj/legacy2-sheet.mjs";

const read = file => readFileSync(new URL(file, import.meta.url), "utf8");
const nativeBody = file => read(file).match(/  prepareEmbeddedData\(\) \{([\s\S]*?)\n  \}/)[1];
const config = { movementTypes: { walk: {}, fly: {}, swim: {}, climb: {}, burrow: {} }, senses: {},
  movementUnits: { ft: { label: "Feet", abbreviation: "ft" }, m: { label: "Meters", abbreviation: "m" } } };
globalThis.CONFIG = { DND5E: config, JUJUTSU: {} };
globalThis.game = { settings: { get: () => "2.0" } };

test("characters and NPCs use meters even with an imperial world default or an old feet label", () => {
  for (const type of ["character", "npc"]) for (const oldUnits of [null, "ft", "m"]) {
    const body = nativeBody("../module/data/actor/" + type + ".mjs");
    const prepare = new Function("AttributesFields", "Item", "defaultUnits", "prepareNpcProfileMovement", "Ruleset", "convertLength", "CreatureTypeField", "prepareBeastEssenceProfiles",
      "return class extends class {prepareEmbeddedData(){}} {prepareEmbeddedData(){" + body + "}}")
      ({}, class {}, () => "ft", () => {}, {isV2: () => true}, n => n, class {initialize(){return {}}}, prepareBeastEssenceProfiles).prototype.prepareEmbeddedData;
    const source = { units: oldUnits, speeds: { walk: 8, fly: 12 } };
    const system = { details: {}, attributes: { movement: structuredClone(source), senses: { ranges: {} } },
      _source: { attributes: { movement: source } } };
    prepare.call(system);
    assert.equal(system.attributes.movement.units, "m", type + " movement is always metric");
    assert.equal(system.attributes.movement.speeds.walk, 8);
    assert.equal(system.attributes.movement.speeds.fly, 12);
    assert.equal(system.attributes.senses.units, "ft", "this change is specific to movement");
    assert.equal(system._source.attributes.movement.units, oldUnits, "preparation never edits saved data");
  }
});

function movementDialog(type) {
  const body = read("../module/applications/shared/movement-senses-config.mjs")
    .match(/  async _preparePartContext\(partId, context, options\) \{([\s\S]*?)\r?\n  \}/)[1];
  const source = { attributes: { [type]: { units: "ft", [type === "movement" ? "speeds" : "ranges"]: { walk: 8 } } } };
  const fields = { units: {}, speeds: { model: {} }, ranges: { model: {} } };
  const fieldsUtils = { utils: { getProperty: (object, key) => key.split(".").reduce((v, k) => v?.[k], object) } };
  const Dialog = new Function("foundry", "CONFIG", "defaultUnits", "_loc",
    "return class extends class {async _preparePartContext(id,context){return context}} {"
    + "get keyPath(){return 'attributes.'+this.options.type} get subPath(){return this.options.type==='movement'?'speeds':'ranges'}"
    + "get types(){return ['walk']} _prepareExtraFields(){return []} _prepareTravelFields(){}"
    + "async _preparePartContext(partId,context,options){" + body + "}}")
    (fieldsUtils, { DND5E: { ...config, senses: { walk: { label: "Sense" } } } }, () => "ft", key => key);
  const dialog = new Dialog();
  dialog.options = {type};
  dialog.document = {system: {isCharacter: true, _source: source, schema: {getField: () => ({fields})}}};
  return {dialog, source};
}

test("movement configuration offers only meters while preserving speeds and saved data", async () => {
  const {dialog, source} = movementDialog("movement");
  const ctx = await dialog._preparePartContext("config", {}, {});
  assert.deepEqual(ctx.unitsOptions.map(option => option.value), ["m"]);
  assert.equal(ctx.unitsOptions.blank, false);
  assert.equal(ctx.data.units, "m");
  assert.equal(ctx.types[0].value, 8);
  assert.equal(source.attributes.movement.units, "ft");
});

test("sense configuration keeps its existing unit choices", async () => {
  const {dialog} = movementDialog("senses");
  const ctx = await dialog._preparePartContext("config", {}, {});
  assert.equal(ctx.data.units, "ft");
  assert.ok(ctx.unitsOptions.some(option => option.value === "ft"));
  assert.ok(ctx.unitsOptions.some(option => option.value === "m"));
});

test("the martial overview displays meters for walking and flight without rescaling entered speeds", () => {
  const actor = {system: {
    abilities: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map(key => [key, {value: 2}])),
    details: {level: 1}, legacy2: {}, energy: {},
    attributes: {hp: {value: 10, max: 10}, movement: {units: "ft", speeds: {walk: 8, fly: 6}}}
  }, itemTypes: {}, statuses: new Set()};
  const cfg = {...config, abilities: {}};
  assert.deepEqual(buildLegacy2Context(actor, cfg, Ruleset).movement, {value: 8, unit: "m", voando: false});
  actor.statuses.add("jj-voando");
  assert.deepEqual(buildLegacy2Context(actor, cfg, Ruleset).movement, {value: 6, unit: "m", voando: true});
});

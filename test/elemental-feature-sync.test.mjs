import assert from "node:assert/strict";
import {test} from "node:test";
let sync = {};
try { sync = await import("../module/systems/elemental-feature-sync.mjs"); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }
const scope = "Immortals-system";
const clone = value => structuredClone(value);
const run = (actor, options = {}) => {
  assert.equal(typeof sync.syncElementalFeatures, "function");
  return sync.syncElementalFeatures(actor, options);
};
function source(elementId, abilityId, tier, {qiPool} = {}) {
  const activities = {managedAction001: {_id: "managedAction001", name: "Use tier " + tier,
    type: "utility", uses: {spent: 0, max: String(tier)},
    consumption: {targets: [{type: "attribute", target: "energy." + qiPool, value: String(tier)}]},
    flags: {[scope]: {elementalActivity: {elementId, abilityId, tier, key: "use"}}}}};
  if (tier > 1) activities.tierOnlyAction01 = {_id: "tierOnlyAction01", name: "Extra", type: "utility"};
  return {_id: "sourceFeature001", name: "Feature tier " + tier, img: "tier-" + tier + ".webp", type: "feat",
    folder: "reference-folder", ownership: {default: 0},
    system: {description: {value: "Tier " + tier}, uses: {spent: 0, max: String(tier * 3), recovery: []}, activities},
    effects: [{_id: "managedEffect001", name: "Effect tier " + tier, changes: [{key: "bonus", value: String(tier)}]}],
    flags: {[scope]: {elementalManaged: true, elementalContentVersion: 1, elementalAbility: {elementId, abilityId, tier}}}};
}
function patchObject(target, patch) {
  for (const [path, value] of Object.entries(patch)) {
    if (path === "_id") continue;
    const parts = path.split("."), last = parts.pop();
    let object = target;
    for (const part of parts) object = object[part] ??= {};
    if (last.startsWith("-=")) delete object[last.slice(2)];
    else if (value && !Array.isArray(value) && typeof value === "object" && object[last] && typeof object[last] === "object" && !Array.isArray(object[last])) patchObject(object[last], value);
    else object[last] = clone(value);
  }
}
function fixture({type = "character", learned = {luz: {toqueCurativo: 1}}, items = []} = {}) {
  const actor = {type, isOwner: true, system: {elementAbilities: clone(learned)}, items: [], writes: []};
  let sequence = 0;
  const item = raw => {
    const data = clone(raw); data.id = data._id ?? "owned" + ++sequence; data._id = data.id;
    data.toObject = () => clone(Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v !== "function")));
    data.createEmbeddedDocuments = async (kind, docs, options) => {
      assert.equal(kind, "ActiveEffect"); actor.writes.push({kind: "effectCreate", options});
      data.effects.push(...clone(docs)); return docs;
    };
    data.updateEmbeddedDocuments = async (kind, docs, options) => {
      assert.equal(kind, "ActiveEffect"); actor.writes.push({kind: "effectUpdate", options});
      for (const doc of docs) patchObject(data.effects.find(effect => effect._id === doc._id), doc);
      return docs;
    };
    data.deleteEmbeddedDocuments = async (kind, ids, options) => {
      assert.equal(kind, "ActiveEffect"); actor.writes.push({kind: "effectDelete", options});
      data.effects = data.effects.filter(effect => !ids.includes(effect._id)); return ids;
    };
    return data;
  };
  actor.items = items.map(item);
  actor.createEmbeddedDocuments = async (kind, docs, options) => {
    assert.equal(kind, "Item"); actor.writes.push({kind: "create", docs: clone(docs), options});
    const created = docs.map(item); actor.items.push(...created); return created;
  };
  actor.updateEmbeddedDocuments = async (kind, docs, options) => {
    assert.equal(kind, "Item"); actor.writes.push({kind: "update", docs: clone(docs), options});
    for (const doc of docs) patchObject(actor.items.find(existing => existing.id === doc._id), doc);
    return docs.map(doc => actor.items.find(existing => existing.id === doc._id));
  };
  actor.deleteEmbeddedDocuments = async (kind, ids, options) => {
    assert.equal(kind, "Item"); actor.writes.push({kind: "delete", ids, options});
    actor.items = actor.items.filter(existing => !ids.includes(existing.id)); return ids;
  };
  return {actor, item};
}
const derived = actor => actor.items.filter(item => item.flags?.[scope]?.elementalDerived === true);
const deferred = () => { let release; const promise = new Promise(resolve => { release = resolve; }); return {promise, release}; };

test("learning a known ability grants one native owned feat with derived provenance", async () => {
  const {actor} = fixture();
  assert.deepEqual(await run(actor, {factory: source}), {created: 1, updated: 0, deleted: 0});
  const feat = derived(actor)[0];
  assert.equal(feat.name, "Feature tier 1"); assert.equal(feat.type, "feat");
  assert.equal(feat.flags[scope].elementalManaged, true);
  assert.deepEqual(feat.flags[scope].elementalAbility, {elementId: "luz", abilityId: "toqueCurativo", tier: 1});
  assert.equal(feat.system.activities.managedAction001.consumption.targets[0].target, "energy.generated");
  assert.equal(feat._id === "sourceFeature001", false); assert.equal(feat.folder, undefined); assert.equal(feat.ownership, undefined);
  assert.equal(feat.effects[0]._id, "managedEffect001");
  for (const write of actor.writes) { assert.equal(write.options.render, false); assert.equal(write.options.isAdvancement, true); }
});

test("tier upgrades and downgrades refresh the same feat and remove obsolete managed activities", async () => {
  const {actor} = fixture(); await run(actor, {factory: source}); const id = derived(actor)[0].id;
  actor.system.elementAbilities.luz.toqueCurativo = 3;
  assert.deepEqual(await run(actor, {factory: source}), {created: 0, updated: 1, deleted: 0});
  let feat = derived(actor)[0]; assert.equal(feat.id, id); assert.equal(feat.img, "tier-3.webp");
  assert.equal(feat.system.description.value, "Tier 3"); assert.equal(feat.effects[0].changes[0].value, "3");
  assert.equal(feat.system.activities.managedAction001._id, "managedAction001"); assert(feat.system.activities.tierOnlyAction01);
  actor.system.elementAbilities.luz.toqueCurativo = 1; await run(actor, {factory: source}); feat = derived(actor)[0];
  assert.equal(feat.id, id); assert.equal(feat.name, "Feature tier 1");
  assert.equal(feat.system.activities.tierOnlyAction01, undefined); assert.equal(feat.effects[0].changes[0].value, "1");
});

test("unlearning deletes only derived feats, preserving manual and dragged reference copies", async () => {
  const manual = source("luz", "toqueCurativo", 3, {qiPool: "total"}); manual._id = "manualReference1";
  const unrelated = {name: "Manual feature", type: "feat", system: {description: {value: "Player notes"}}, flags: {}, effects: []};
  const {actor} = fixture({items: [manual, unrelated]});
  const manualBefore = actor.items.map(item => item.toObject());
  await run(actor, {factory: source}); assert.equal(derived(actor).length, 1); assert.equal(actor.items.length, 3);
  actor.system.elementAbilities = {};
  assert.deepEqual(await run(actor, {factory: source}), {created: 0, updated: 0, deleted: 1});
  assert.deepEqual(actor.items.map(item => item.toObject()), manualBefore);
});

test("tier refresh preserves unrelated custom activities, effects, flags and spent counters", async () => {
  const {actor} = fixture(); await run(actor, {factory: source}); const feat = derived(actor)[0];
  feat.system.activities.customActivity01 = {_id: "customActivity01", name: "My action", type: "utility"};
  feat.effects.push({_id: "customEffect0001", name: "My effect", changes: [{key: "custom", value: "9"}]});
  feat.flags.custom = {note: "Keep"}; feat.system.uses.spent = 2; feat.system.activities.managedAction001.uses.spent = 1;
  actor.system.elementAbilities.luz.toqueCurativo = 2; await run(actor, {factory: source});
  assert.equal(feat.system.activities.customActivity01.name, "My action");
  assert.equal(feat.effects.find(effect => effect._id === "customEffect0001").changes[0].value, "9");
  assert.equal(feat.flags.custom.note, "Keep"); assert.equal(feat.system.uses.spent, 2); assert.equal(feat.system.uses.max, "6");
  assert.equal(feat.system.activities.managedAction001.uses.spent, 1);
});

test("unchanged source content is idempotent and preserves player edits between tier changes", async () => {
  const {actor} = fixture(); await run(actor, {factory: source}); const feat = derived(actor)[0];
  feat.name = "Player label"; feat.system.description.value = "Player notes"; feat.system.activities.managedAction001.name = "Player action";
  const writes = actor.writes.length;
  assert.deepEqual(await run(actor, {factory: source}), {created: 0, updated: 0, deleted: 0});
  assert.equal(actor.writes.length, writes); assert.equal(feat.name, "Player label");
  assert.equal(feat.system.description.value, "Player notes"); assert.equal(feat.system.activities.managedAction001.name, "Player action");
});

test("source version changes refresh managed content and remove only its retired effects", async () => {
  const {actor} = fixture(); let revision = 1;
  const factory = (...args) => { const data = source(...args); data.flags[scope].elementalContentVersion = revision;
    if (revision === 2) { data.name = "Revised source"; data.effects = [{_id: "replacement00001", name: "New effect", changes: []}]; }
    return data; };
  await run(actor, {factory}); const feat = derived(actor)[0]; feat.effects.push({_id: "customEffect0001", name: "Custom", changes: []});
  revision = 2; assert.deepEqual(await run(actor, {factory}), {created: 0, updated: 1, deleted: 0});
  assert.equal(feat.name, "Revised source"); assert.deepEqual(feat.effects.map(effect => effect._id).sort(), ["customEffect0001", "replacement00001"]);
  const writes = actor.writes.length; await run(actor, {factory}); assert.equal(actor.writes.length, writes);
});

test("ownership, actor type and source compendium guards prevent writes", async () => {
  for (const invalid of [{isOwner: false}, {type: "vehicle"}, {pack: "reference.actors"}, {compendium: {}}, {uuid: "Compendium.reference.actors.Actor.entry"}]) {
    const {actor} = fixture(); Object.assign(actor, invalid);
    assert.deepEqual(await run(actor, {factory: () => { throw Error("Must not resolve source"); }}), {created: 0, updated: 0, deleted: 0});
    assert.equal(actor.items.length, 0); assert.equal(actor.writes.length, 0);
  }
  const {actor} = fixture({type: "npc"}); actor._stats = {compendiumSource: "Compendium.reference.actors.Actor.original"};
  await run(actor, {factory: source}); assert.equal(derived(actor).length, 1);
});

test("concurrent synchronization cannot create duplicate grants", async () => {
  const {actor} = fixture(); const gate = deferred(); let requested = false;
  const factory = async (...args) => { if (!requested) { requested = true; await gate.promise; } return source(...args); };
  const first = run(actor, {factory}), second = run(actor, {factory}), third = run(actor, {factory});
  gate.release(); await Promise.all([first, second, third]);
  assert.equal(derived(actor).length, 1); assert.equal(actor.writes.filter(write => write.kind === "create").length, 1);
});

test("a tier changed during source resolution is recomputed before creation", async () => {
  const {actor} = fixture(); const gate = deferred(), entered = deferred(); let waited = false;
  const factory = async (...args) => { if (!waited) { waited = true; entered.release(); await gate.promise; } return source(...args); };
  const pending = run(actor, {factory}); await entered.promise; actor.system.elementAbilities.luz.toqueCurativo = 2; gate.release(); await pending;
  assert.equal(derived(actor)[0].flags[scope].elementalAbility.tier, 2);
  assert.equal(actor.writes.filter(write => write.kind === "create").length, 1);
});

test("unlearning during a document write is reconciled from the new actor snapshot", async () => {
  const {actor} = fixture(); const create = actor.createEmbeddedDocuments;
  actor.createEmbeddedDocuments = async (...args) => { const created = await create(...args); actor.system.elementAbilities = {}; return created; };
  const counts = await run(actor, {factory: source}); assert.deepEqual(counts, {created: 1, updated: 0, deleted: 1});
  assert.equal(derived(actor).length, 0);
});

test("unknown and unlearned entries are ignored, while source Qi selection is forwarded", async () => {
  const {actor} = fixture({learned: {madeira: {qiDenso: 0, unknown: 3}, luz: {toqueCurativo: 2}, unknown: {missing: 1}}});
  await run(actor, {factory: source, qiPool: "total"});
  assert.equal(derived(actor).length, 1); assert.equal(derived(actor)[0].system.activities.managedAction001.consumption.targets[0].target, "energy.total");
});

test("a failed source resolution releases the actor queue for a later retry", async () => {
  const {actor} = fixture(); await assert.rejects(run(actor, {factory: () => { throw Error("Unavailable"); }}), /Unavailable/);
  await run(actor, {factory: source}); assert.equal(derived(actor).length, 1);
});

test("newly learned abilities during an unchanged source check are included before return", async () => {
  const {actor} = fixture(); await run(actor, {factory: source}); let added = false;
  const factory = async (...args) => { if (!added) { added = true; actor.system.elementAbilities.madeira = {qiVibrante: 1}; } return source(...args); };
  await run(actor, {factory}); assert.equal(derived(actor).length, 2);
  assert(derived(actor).some(feat => feat.flags[scope].elementalAbility.abilityId === "qiVibrante"));
});

test("native paid orb pools retain their available orbs when tier capacity changes", async () => {
  const {actor} = fixture({learned: {luz: {lightOrbs: 1}}});
  await run(actor); const feat = derived(actor)[0]; assert.equal(feat.system.uses.max, "3"); assert.equal(feat.system.uses.spent, 3);
  actor.system.elementAbilities.luz.lightOrbs = 3; await run(actor);
  assert.equal(feat.system.uses.max, "10"); assert.equal(feat.system.uses.spent, 10);
  feat.system.uses.spent = 8; actor.system.elementAbilities.luz.lightOrbs = 2; await run(actor);
  assert.equal(feat.system.uses.max, "6"); assert.equal(feat.system.uses.spent, 4);
});

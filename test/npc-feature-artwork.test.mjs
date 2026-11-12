import assert from "node:assert/strict";
import {test} from "node:test";
import {NPC_FEATURE_ARTWORK} from "../module/systems/npc-feature-artwork-data.mjs";
import {resolveNpcProfileArtwork, prepareNpcProfileArtworkUpdate, migrateNpcProfileCompendiumArt,
  migrateNpcProfileActorArt} from "../module/systems/npc-profile-artwork.mjs";

const PACK = "Immortals-system.pdns-immortals";
const clone = value => structuredClone(value);
const gameFor = () => ({user: {id: "gm", isGM: true}, users: {activeGM: {id: "gm"}}, packs: new Map()});
const feature = (entry, extra = {}) => ({_id: entry.id, name: entry.name, type: "feat", img: entry.previous,
  system: {description: {value: "<p>Regra preservada</p>"}, uses: {spent: 2, max: "3"},
    activities: {attack: {damage: {parts: ["2d6"]}}}},
  effects: [{_id: "keptEffect", changes: [{key: "system.bonuses", value: "2"}]}], ...extra});

test("all 327 NPC features have individual art and retain their group and identity", () => {
  assert.equal(NPC_FEATURE_ARTWORK.length, 327);
  assert.deepEqual(Object.fromEntries(["aspectos", "habilidades", "reacoes"].map(group =>
    [group, NPC_FEATURE_ARTWORK.filter(entry => entry.group === group).length])),
    {aspectos: 144, habilidades: 111, reacoes: 72});
  assert.equal(new Set(NPC_FEATURE_ARTWORK.map(entry => entry.id)).size, 327);
  assert.equal(new Set(NPC_FEATURE_ARTWORK.map(entry => entry.img)).size, 327);
  for (const entry of NPC_FEATURE_ARTWORK) {
    assert.equal(resolveNpcProfileArtwork(feature(entry))?.id, entry.id);
    assert.match(entry.img, /^systems\/Immortals-system\/assets\/wuxia\/caracteristicas-pdn-pintadas-v2\/(aspectos|habilidades|reacoes)\/[a-zA-Z0-9-]+\.webp$/u);
  }
});

test("same-name features resolve by compendium or grant provenance, never by an ambiguous name", () => {
  const entries = NPC_FEATURE_ARTWORK.filter(entry => entry.name === "Agarrador");
  assert.equal(entries.length, 2);
  assert.equal(resolveNpcProfileArtwork({type: "feat", name: "Agarrador"}), null);
  for (const entry of entries) {
    for (const reference of [
      {_stats: {compendiumSource: "Compendium." + PACK + ".Item." + entry.id}},
      {_stats: {duplicateSource: "Compendium." + PACK + "." + entry.id}},
      {flags: {core: {sourceId: "Compendium." + PACK + ".Item." + entry.id}}},
      {flags: {"Immortals-system": {npcProfileFeature: {source: "Compendium." + PACK + ".Item." + entry.id}}}},
      {flags: {"Immortals-system": {jujutsuImport: {documentId: entry.id}}}},
      {flags: {"Immortals-system": {encyclopedia: {key: entry.encyclopediaKey}}}}
    ]) {
      assert.equal(resolveNpcProfileArtwork(feature(entry, {_id: "localCopy", name: "Nome pessoal", ...reference}))?.id, entry.id);
    }
  }
  assert.equal(resolveNpcProfileArtwork({type: "weapon", _id: entries[0].id}), null);
});

test("feature artwork is an image-only idempotent update and preserves custom icons and inaccessible items", () => {
  for (const entry of NPC_FEATURE_ARTWORK) {
    const source = feature(entry), before = clone(source);
    const patch = prepareNpcProfileArtworkUpdate(source);
    assert.deepEqual(patch, {_id: entry.id, img: entry.img});
    assert.deepEqual(source, before);
    assert.deepEqual({...source, ...patch}, {...before, img: entry.img});
    assert.equal(prepareNpcProfileArtworkUpdate({...source, ...patch}), null);
    assert.equal(prepareNpcProfileArtworkUpdate({...source, img: "worlds/personal/feature.webp"}), null);
    assert.equal(prepareNpcProfileArtworkUpdate({...source, isOwner: false}), null);
    assert.equal(prepareNpcProfileArtworkUpdate({...source, actor: {type: "npc", isOwner: false}}), null);
  }
});

test("native compendium refresh installs all feature images without modifying rules or IDs", async () => {
  const records = NPC_FEATURE_ARTWORK.map(entry => feature(entry)), before = clone(records), calls = [];
  const game = gameFor();
  const pack = {collection: PACK, documentName: "Item", locked: true,
    async getDocuments(query) {
      assert(NPC_FEATURE_ARTWORK.every(entry => query._id__in.includes(entry.id)));
      return records.map(source => ({isOwner: false, toObject: () => clone(source)}));
    },
    async configure(change) {this.locked = change.locked; calls.push(change.locked);}
  };
  game.packs.set(PACK, pack);
  const Item = {implementation: {async updateDocuments(patches, options) {
    assert.deepEqual(options, {pack: PACK});
    assert(patches.every(patch => Object.keys(patch).sort().join(",") === "_id,img"));
    calls.push(patches.length);
    for (const patch of patches) Object.assign(records.find(entry => entry._id === patch._id), patch);
  }}};
  assert.equal(await migrateNpcProfileCompendiumArt({game, Item}), 327);
  assert.deepEqual(calls, [false, 327, true]);
  assert.equal(pack.locked, true);
  assert.deepEqual(records, before.map((source, i) => ({...source, img: NPC_FEATURE_ARTWORK[i].img})));
  assert.equal(await migrateNpcProfileCompendiumArt({game, Item}), 0);
  assert.deepEqual(calls, [false, 327, true]);
});

test("native grants on actors use their source identity even when duplicate names and local IDs differ", async () => {
  const entries = NPC_FEATURE_ARTWORK.filter(entry => entry.name === "Agarrador");
  const actor = {id: "native-features", uuid: "Actor.native-features", type: "npc", isOwner: true,
    items: entries.map((entry, index) => feature(entry, {_id: "local" + index,
      flags: {"Immortals-system": {npcProfileFeature: {source: "Compendium." + PACK + ".Item." + entry.id}}}})),
    async performBulkUpdate(data) {
      for (const patch of data.item) Object.assign(this.items.find(item => item._id === patch._id), patch);
    }};
  const before = clone(actor.items);
  assert.equal(await migrateNpcProfileActorArt(actor, {game: gameFor()}), 2);
  assert.deepEqual(actor.items, before.map((source, i) => ({...source, img: entries[i].img})));
  assert.equal(await migrateNpcProfileActorArt(actor, {game: gameFor()}), 0);
});

test("an unrelated user-authored feat does not inherit artwork solely because its title matches", () => {
  const entry = NPC_FEATURE_ARTWORK.find(entry => entry.name === "Absorção Rápida");
  const personal = {_id: "user-authored-feature", type: "feat", name: entry.name, img: "icons/svg/item-bag.svg"};
  assert.equal(resolveNpcProfileArtwork(personal), null);
  assert.equal(prepareNpcProfileArtworkUpdate(personal), null);
  assert.equal(resolveNpcProfileArtwork({...personal, img: entry.previous})?.id, entry.id);
  assert.equal(resolveNpcProfileArtwork({...personal, _id: entry.id})?.id, entry.id);
});

test("ready refreshes native unlinked token copies while preserving their personal icons", async () => {
  const entry = NPC_FEATURE_ARTWORK[0], handlers = new Map(), batches = [];
  const makeActor = (uuid, items, owner = true) => ({id: uuid, uuid, type: "npc", isOwner: owner, items,
    async performBulkUpdate(data) {
      batches.push({uuid, data: clone(data)});
      for (const patch of data.item) Object.assign(this.items.find(item => item._id === patch._id), patch);
    }});
  const base = makeActor("Actor.base", [feature(entry)]);
  const synthetic = makeActor("Scene.map.Token.copy.Actor.base", [
    feature(entry, {_id: "token-feature", _stats: {compendiumSource: "Compendium." + PACK + ".Item." + entry.id}}),
    feature(entry, {_id: "personal-feature", img: "worlds/custom/personal.webp"})
  ]);
  const unowned = makeActor("Scene.map.Token.unowned.Actor.base", [feature(entry)], false);
  const game = gameFor(); game.items = []; game.actors = [base];
  game.scenes = [{tokens: [
    {actorLink: true, get actor() {throw new Error("Linked tokens already use the base actor");}},
    {actorLink: false, actor: synthetic},
    {actorLink: false, actor: synthetic},
    {actorLink: false, actor: unowned},
    {actorLink: false, actor: null}
  ]}];
  const hooks = {once(name, fn) {handlers.set(name, fn);}, on() {}};
  const previous = {game: globalThis.game, Item: globalThis.Item};
  globalThis.game = game;
  globalThis.Item = {implementation: {async updateDocuments() {throw new Error("No loose world Items");}}};
  try {
    const {registerNpcProfileArtworkMigrations} = await import("../module/systems/npc-profile-artwork.mjs");
    registerNpcProfileArtworkMigrations(hooks);
    await handlers.get("ready")();
    assert.equal(base.items[0].img, entry.img);
    assert.equal(synthetic.items[0].img, entry.img);
    assert.equal(synthetic.items[1].img, "worlds/custom/personal.webp");
    assert.equal(unowned.items[0].img, entry.previous);
    assert.equal(batches.filter(batch => batch.uuid === synthetic.uuid).length, 1);
  } finally {globalThis.game = previous.game; globalThis.Item = previous.Item;}
});

test("features retain personal choices borrowed from other catalogue artwork", () => {
  const entry = NPC_FEATURE_ARTWORK[0];
  for (const img of [
    "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/espectros.webp",
    NPC_FEATURE_ARTWORK[1].img
  ]) {
    assert.equal(prepareNpcProfileArtworkUpdate(feature(entry, {img})), null);
  }
});

import assert from "node:assert/strict";
import {test} from "node:test";
import {withElementalActorLock} from "../module/systems/elemental-runtime.mjs";

const art = await import("../module/systems/npc-profile-artwork.mjs").catch(error => {
  if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
  return {};
});
const use = name => { assert.equal(typeof art[name], "function", name + " must exist"); return art[name]; };
const PACK = "Immortals-system.pdns-immortals";
const BASE = "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/";
const SPECTRE = "0r6DpcPVxac4KcDN";
const BERSERKER = "17A6o29ictUUYNBl";
const OLD = "icons/creatures/magical/spirit-undead-ghost-blue.webp";
const NEW = BASE + "taxonomias/espectros.webp";
const clone = value => structuredClone(value);
const profile = (extra = {}) => ({_id: SPECTRE, name: "Espectros", type: "taxonomy", img: OLD,
  system: {uses: {spent: 2}, pesos: {str: 2}, resistencias: {physical: {immune: true}}},
  effects: [{_id: "personalEffect", changes: []}], ...extra});
const gameFor = () => ({user: {id: "gm", isGM: true}, users: {activeGM: {id: "gm"}}, items: [], actors: [], packs: new Map()});
function fixture({locked = true, sources = [profile()], fail = false} = {}) {
  const game = gameFor(), calls = [], records = clone(sources);
  const pack = {collection: PACK, documentName: "Item", locked,
    async getDocuments(query) {
      calls.push({read: clone(query)});
      return records.map(source => ({id: source._id, isOwner: false, toObject: () => clone(source)}));
    },
    async configure(change) { calls.push({lock: change.locked}); this.locked = change.locked; }};
  const Item = {implementation: {async updateDocuments(patches, options) {
    calls.push({patches: clone(patches), options: clone(options)});
    if (fail) throw new Error("native write failed");
    const target = options?.pack ? records : game.items;
    for (const patch of patches) Object.assign(target.find(item => item._id === patch._id), patch);
  }}};
  game.packs.set(PACK, pack);
  return {game, Item, pack, records, calls};
}

// A missing or shared image mapping would leave a catalogue profile on generic art.
test("the 52 taxonomies and 87 archetypes map to distinct painted portraits", () => {
  assert.equal(art.NPC_PROFILE_ARTWORK?.length, 139);
  assert.equal(art.NPC_PROFILE_ARTWORK.filter(entry => entry.type === "taxonomy").length, 52);
  assert.equal(art.NPC_PROFILE_ARTWORK.filter(entry => entry.type === "archetype").length, 87);
  assert.equal(new Set(art.NPC_PROFILE_ARTWORK.map(entry => entry.id)).size, 139);
  assert.equal(new Set(art.NPC_PROFILE_ARTWORK.map(entry => entry.img)).size, 139);
  for (const entry of art.NPC_PROFILE_ARTWORK) {
    assert.equal(use("resolveNpcProfileArtwork")({_id: entry.id, type: entry.type})?.id, entry.id);
    assert.match(entry.img, /^systems\/Immortals-system\/assets\/wuxia\/perfis-pdn-pintados-v1\/(taxonomias|arquetipos)\/[a-z0-9-]+\.webp$/u);
  }
  assert.equal(use("resolveNpcProfileArtwork")({_id: BERSERKER, type: "archetype"}).img,
    BASE + "arquetipos/frenetico-berserker.webp");
});

test("renamed copies resolve by native compendium provenance before their current name", () => {
  const resolve = use("resolveNpcProfileArtwork");
  for (const reference of [
    {_stats: {compendiumSource: "Compendium." + PACK + ".Item." + SPECTRE}},
    {flags: {core: {sourceId: "Compendium." + PACK + "." + SPECTRE}}},
    {_stats: {duplicateSource: "Compendium." + PACK + ".Item." + SPECTRE}}
  ]) assert.equal(resolve(profile({_id: "localCopy", name: "Meu fantasma", ...reference}))?.id, SPECTRE);
  assert.equal(resolve({type: "taxonomy", name: " ESPECTROS "})?.id, SPECTRE);
  assert.equal(resolve({type: "archetype", name: "Frenetico (berserker)"})?.id, BERSERKER);
  assert.equal(resolve({_id: SPECTRE, name: "Espectros", type: "feat"}), null);
  assert.equal(resolve({_id: SPECTRE, type: "archetype"}), null);
  assert.equal(resolve({name: "Meu perfil", type: "taxonomy"}), null);
});

test("artwork patches change only img and preserve authored names, uses, statistics and effects", () => {
  const source = profile({name: "Minha assombração"}), original = clone(source);
  const patch = use("prepareNpcProfileArtworkUpdate")(source);
  assert.deepEqual(patch, {_id: SPECTRE, img: NEW});
  assert.deepEqual(source, original);
  assert.deepEqual({...source, ...patch}, {...original, img: NEW});
  assert.equal(use("prepareNpcProfileArtworkUpdate")({...source, ...patch}), null);
});

test("empty, default-document, old-profile and managed images are eligible", () => {
  const prepare = use("prepareNpcProfileArtworkUpdate");
  for (const img of [undefined, null, "", "  ", OLD, "icons/svg/item-bag.svg",
    "systems/Immortals-system/icons/svg/documents/item.svg",
    "systems/Immortals-system/icons/svg/items/taxonomy.svg",
    BASE + "taxonomias/corvideos.webp",
    BASE + "arquetipos/frenetico-berserker.webp"]) {
    assert.deepEqual(prepare(profile({img})), {_id: SPECTRE, img: NEW}, String(img));
  }
});

test("custom portraits, unknown profiles and inaccessible documents are preserved", () => {
  const prepare = use("prepareNpcProfileArtworkUpdate");
  for (const extra of [{img: "worlds/my-world/ghost.webp"}, {img: "icons/custom/ghost.webp"},
    {img: "https://example.test/ghost.webp"}, {isOwner: false}, {limited: true},
    {actor: {type: "npc", isOwner: false}}, {parent: {type: "npc", isOwner: true, limited: true}},
    {_id: "unknown", name: "Meu perfil"}, {type: "feat"}, {_id: undefined}]) {
    const source = profile(extra), original = clone(source);
    assert.equal(prepare(source), null);
    assert.deepEqual(source, original);
  }
});

test("locked compendium art is patched through the native Item API and its lock is restored", async () => {
  const setup = fixture({sources: [profile(), profile({_id: BERSERKER, type: "archetype", name: "Frenético (berserker)", img: "worlds/custom.webp"}),
    profile({_id: "unrelated", name: "Personal taxonomy"})]});
  const before = clone(setup.records);
  assert.equal(await use("migrateNpcProfileCompendiumArt")(setup), 1);
  assert.equal(setup.pack.locked, true);
  assert.deepEqual(setup.calls.slice(1), [{lock: false}, {patches: [{_id: SPECTRE, img: NEW}], options: {pack: PACK}}, {lock: true}]);
  assert.deepEqual(setup.records, before.map(source => source._id === SPECTRE ? {...source, img: NEW} : source));
  assert.equal(await use("migrateNpcProfileCompendiumArt")(setup), 0);
  assert.equal(setup.calls.filter(call => "patches" in call).length, 1);
});

test("failed native updates restore a locked pack and remain retryable", async () => {
  const setup = fixture({fail: true});
  await assert.rejects(use("migrateNpcProfileCompendiumArt")(setup), /native write failed/u);
  assert.equal(setup.pack.locked, true);
  assert.deepEqual(setup.calls.slice(1).map(call => call.lock ?? "write"), [false, "write", true]);
  await assert.rejects(use("migrateNpcProfileCompendiumArt")(setup), /native write failed/u);
  assert.equal(setup.calls.filter(call => "patches" in call).length, 2);
});

test("unlocked packs keep their lock state and current art causes no lock changes", async () => {
  const setup = fixture({locked: false});
  assert.equal(await use("migrateNpcProfileCompendiumArt")(setup), 1);
  assert.equal(setup.pack.locked, false);
  assert.equal(setup.calls.some(call => "lock" in call), false);
  const current = fixture({sources: [profile({img: NEW})]});
  assert.equal(await use("migrateNpcProfileCompendiumArt")(current), 0);
  assert.equal(current.calls.length, 1);
});

test("only the active GM can read or update the target Item pack", async () => {
  for (const change of [setup => {setup.game.user.isGM = false;},
    setup => {setup.game.users.activeGM.id = "other";},
    setup => {setup.pack.documentName = "Actor";},
    setup => {setup.game.packs.clear();}]) {
    const setup = fixture(); change(setup);
    assert.equal(await use("migrateNpcProfileCompendiumArt")(setup), 0);
    assert.deepEqual(setup.calls, []);
  }
});

test("concurrent refresh requests share one native pack update", async () => {
  const setup = fixture();
  let release, entered;
  const gate = new Promise(resolve => {release = resolve;});
  const ready = new Promise(resolve => {entered = resolve;});
  const read = setup.pack.getDocuments.bind(setup.pack);
  setup.pack.getDocuments = async query => {entered(); await gate; return read(query);};
  const first = use("migrateNpcProfileCompendiumArt")(setup);
  await ready;
  const second = use("migrateNpcProfileCompendiumArt")(setup);
  release();
  assert.deepEqual(await Promise.all([first, second]), [1, 1]);
  assert.equal(setup.calls.filter(call => "patches" in call).length, 1);
});

test("GM authority is rechecked after asynchronous reads and after unlocking", async () => {
  const afterRead = fixture(), read = afterRead.pack.getDocuments.bind(afterRead.pack);
  afterRead.pack.getDocuments = async query => {const result = await read(query); afterRead.game.users.activeGM.id = "other"; return result;};
  assert.equal(await use("migrateNpcProfileCompendiumArt")(afterRead), 0);
  assert.equal(afterRead.calls.some(call => "lock" in call || "patches" in call), false);
  const afterUnlock = fixture(), configure = afterUnlock.pack.configure.bind(afterUnlock.pack);
  afterUnlock.pack.configure = async change => {await configure(change); if (!change.locked) afterUnlock.game.users.activeGM.id = "other";};
  assert.equal(await use("migrateNpcProfileCompendiumArt")(afterUnlock), 0);
  assert.equal(afterUnlock.pack.locked, true);
  assert.equal(afterUnlock.calls.some(call => "patches" in call), false);
});

test("loose world copies update through the world API and custom or unowned items stay intact", async () => {
  const setup = fixture();
  setup.game.items = [profile({isOwner: true}), profile({_id: "custom", isOwner: true, img: "worlds/custom.webp"}),
    profile({_id: "unowned", isOwner: false}), profile({_id: "limited", isOwner: true, limited: true}),
    profile({_id: "packed", isOwner: true, pack: PACK}), profile({_id: "embedded", isOwner: true, actor: {type: "npc"}})];
  const before = clone(setup.game.items);
  assert.equal(await use("migrateWorldNpcProfileArt")(setup), 1);
  assert.deepEqual(setup.calls, [{patches: [{_id: SPECTRE, img: NEW}], options: undefined}]);
  assert.deepEqual(setup.game.items, before.map(item => item._id === SPECTRE ? {...item, img: NEW} : item));
  assert.equal(await use("migrateWorldNpcProfileArt")(setup), 0);
});

test("owned profiles use the actor transaction queue and re-read artwork before writing", async () => {
  const game = gameFor(), batches = [];
  const actor = {id: "ghost-actor", uuid: "Actor.ghost-actor", type: "npc", isOwner: true, items: [profile()],
    async performBulkUpdate(data) {batches.push(clone(data)); for (const patch of data.item) Object.assign(this.items.find(item => item._id === patch._id), patch);}};
  let release, entered;
  const gate = new Promise(resolve => {release = resolve;});
  const ready = new Promise(resolve => {entered = resolve;});
  const busy = withElementalActorLock(actor, "native-use", async () => {entered(); await gate; actor.items[0].img = "worlds/new-custom.webp"; actor.items[0].system.uses.spent = 3;});
  await ready;
  const migration = use("migrateNpcProfileActorArt")(actor, {game});
  release(); await busy;
  assert.equal(await migration, 0);
  assert.deepEqual(batches, []);
  actor.items[0].img = OLD;
  assert.equal(await use("migrateNpcProfileActorArt")(actor, {game}), 1);
  assert.deepEqual(batches, [{item: [{_id: SPECTRE, img: NEW}]}]);
  assert.equal(actor.items[0].system.uses.spent, 3);
  actor.isOwner = false;
  actor.items[0].img = OLD;
  assert.equal(await use("migrateNpcProfileActorArt")(actor, {game}), 0);
});

test("hook registration is idempotent and refreshes ready, actor imports and loose Item imports", async () => {
  const handlers = new Map(), hooks = {once(name, fn) {assert(!handlers.has(name)); handlers.set(name, fn);}, on(name, fn) {assert(!handlers.has(name)); handlers.set(name, fn);}};
  const setup = fixture();
  const actor = {id: "actor-import", type: "npc", isOwner: true, items: [profile()],
    async performBulkUpdate(data) {for (const patch of data.item) Object.assign(this.items.find(item => item._id === patch._id), patch);}};
  const previous = {game: globalThis.game, Item: globalThis.Item};
  globalThis.game = setup.game; globalThis.Item = setup.Item;
  try {
    use("registerNpcProfileArtworkMigrations")(hooks);
    use("registerNpcProfileArtworkMigrations")(hooks);
    assert.deepEqual([...handlers.keys()], ["ready", "createActor", "createItem"]);
    await handlers.get("ready")();
    assert.equal(setup.records[0].img, NEW);
    await handlers.get("createActor")(actor);
    assert.equal(actor.items[0].img, NEW);
    const imported = profile({_id: "world-import", isOwner: true});
    setup.game.items.push(imported);
    await handlers.get("createItem")(imported);
    assert.equal(imported.img, NEW);
    const embedded = profile({_id: "actor-imported-profile", actor});
    actor.items[0] = embedded;
    await handlers.get("createItem")(embedded);
    assert.equal(embedded.img, NEW);
  } finally {globalThis.game = previous.game; globalThis.Item = previous.Item;}
});

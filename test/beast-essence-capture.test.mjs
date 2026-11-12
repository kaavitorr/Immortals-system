import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBeastEssenceSnapshot, createBeastEssenceItemData } from "../module/systems/beast-essence-capture.mjs";

const scope = "Immortals-system";
const document = (id, type, name, system = {}, extra = {}) => ({
  id, uuid: `Actor.beast.Item.${id}`, type, name, img: `images/${id}.webp`, system,
  toObject() { return structuredClone({ _id: id, type, name, img: this.img, system: this.system,
    effects: this.effects ?? [], flags: this.flags ?? {}, folder: "private-folder", ownership: { gm: 3 },
    _stats: { compendiumSource: this._stats?.compendiumSource }, gmNotes: "secret-document" }); },
  ...extra
});
const attack = (id, actions, { type = "attack", area = false, parts = 1 } = {}) => ({
  _id: id, type, name: id, activation: { type: "action", value: actions, override: true },
  damage: { includeBase: false, parts: Array.from({ length: parts }, () => ({ types: ["fire"], custom: { enabled: true, formula: "@npcDamageDice + @npcPrincipal" } })) },
  description: { value: `<p>Somente ${id}.</p>`, gm: "secret-activity" },
  target: { template: { type: area ? "cone" : "" }, affects: { type: "creature", count: "1" } },
  consumption: { targets: [{ type: "attribute", target: "energy.generated", value: "2" }] }
});
/**
 * Provide native document sources without writing a Foundry world.
 * @returns {object}
 */
function fixture() {
  const passive = document("passive", "feat", "Pele Espessa", { description: { value: "<p>Pele.</p>" }, activities: {} });
  passive.uuid = "Compendium.creatures.Item.passive";
  const future = document("future", "feat", "Sentido Superior", { description: { value: "<p>Sentido.</p>" }, activities: {} });
  future.uuid = "Compendium.creatures.Item.future";
  const hidden = document("hidden", "feat", "Segredo do Narrador", {}, { visible: false, testUserPermission: () => false });
  hidden.uuid = "Compendium.creatures.Item.hidden";
  const taxonomy = document("taxonomy", "taxonomy", "Besta Mágica", {
    pesos: { str: 12 }, energiaBase: 999, proficiencias: { skills: { arc: 4 } },
    resistencias: { fire: { value: 4, immune: false } }, movimento: { walk: 12, fly: 6 }, sentidos: { darkvision: 18 },
    habilidades: [{ uuid: passive.uuid, nd: 1 }, { uuid: future.uuid, nd: 12 }, { uuid: hidden.uuid, nd: 1 }],
    equipamentos: { armas: ["Compendium.creatures.Item.claw", "Compendium.creatures.Item.sword"] }
  });
  const archetype = document("archetype", "archetype", "Guardião", { resistencias: { cold: { value: 2 } }, movimento: { ganho: 1, intervalo: 2 }, habilidades: [] });
  const mixed = document("mixed", "feat", "Instinto e Rajadas", {
    description: { value: '<p>Instinto público.</p><section class="secret"><p>secret-description</p><section>secret-nested</section></section><p>Depois.</p>', gm: "secret-description-field" },
    activities: { bite: attack("bite", 1), breath: attack("breath", 3, { area: true, parts: 2 }), quake: attack("quake", 6, { type: "save" }), forbidden: attack("forbidden", 7), reaction: { ...attack("reaction", 1), activation: { type: "reaction", value: 1 } },
      observe: { _id: "observe", type: "utility", name: "Observar", activation: { type: "action", value: 1 } } },
    advancement: { privateGrant: { type: "ItemGrant", configuration: { items: [hidden.uuid] } } }, gmNotes: "secret-system"
  }, { flags: { secretModule: { notes: "secret-flags" }, [scope]: { npcProfileFeature: { source: "private-source" }, gmNotes: "secret-system-flags" } },
    effects: [{ _id: "passiveEffect", name: "Pele", transfer: true, changes: [{ key: "system.attributes.ac.bonus", mode: 2, value: "1" }], flags: { module: { gm: "secret-effect" } } }] });
  const ordinary = document("ordinary", "feat", "Olhos Atentos", { description: { value: "<p>Percepção.</p>" }, activities: {} });
  const pureAttack = document("pureAttack", "feat", "Sopro", { activities: { blast: attack("blast", 2) } });
  const claw = document("claw", "weapon", "Garras", { type: { value: "natural" }, damage: { base: { number: 1, denomination: 6 } }, activities: { claw: attack("claw", 1) } });
  claw.uuid = "Compendium.creatures.Item.claw";
  const ownedClaw = document("ownedClaw", "weapon", "Garras", structuredClone(claw.system), { flags: { [scope]: { npcArchetypeEquipment: { source: claw.uuid, profile: taxonomy.id } } } });
  const sword = document("sword", "weapon", "Espada", { type: { value: "martialM" }, activities: { slash: attack("slash", 1) } });
  sword.uuid = "Compendium.creatures.Item.sword";
  const granted = document("granted", "feat", passive.name, structuredClone(passive.system), { flags: { [scope]: { npcProfileFeature: { source: passive.uuid } } }, _stats: { compendiumSource: passive.uuid } });
  granted.img = passive.img;
  const actor = { type: "npc", uuid: "Actor.beast", name: "Tigre <Antigo>", img: "images/beast.webp", prototypeToken: { texture: { src: "images/beast-token.webp" } },
    flags: { [scope]: { cultivationRank: 3 }, gmNotes: "secret-actor" },
    system: { legacy2: { nd: 8, taxonomia: taxonomy.id, arquetipo: archetype.id },
      abilities: { str: { value: 12 }, dex: { value: 9 }, con: { value: 12 },
        int: { value: 2 }, wis: { value: 7 }, cha: { value: 5 } },
      conceitos: { fogo: { level: 3, unlocked: true }, vento: { level: 1 }, gelo: { unlocked: true }, metal: { level: 0, unlocked: false }, notAConcept: { level: 9 } }, details: { biography: { value: "secret-biography" } } },
    items: [taxonomy, archetype, granted, mixed, ordinary, pureAttack, ownedClaw, sword, document("privateOwned", "feat", "Particular", {}, { visible: false })]
  };
  const documents = new Map([passive, future, hidden, claw, sword].map(item => [item.uuid, item]));
  return { actor, mixed, taxonomy, claw, documents,
    options: { resolve: async uuid => documents.get(uuid), config: {} } };
}
const byName = (entries, name) => entries.find(entry => entry.data?.name === name);
const definitionOf = item => item.flags[scope].beastEssenceItem.definition;
const selectionFor = snapshot => ({ growth: "earth", ability: "con", elements: ["fogo", "vento"],
  normalFeatures: [byName(snapshot.features, "Olhos Atentos").key], weakenedFeatures: [],
  normalAttacks: snapshot.attacks.filter(entry => ["bite", "breath"].includes(entry.activityId)).map(entry => entry.key),
  weakenedAttacks: snapshot.attacks.filter(entry => entry.activityId === "quake").map(entry => entry.key), id: "essence-fixture" });

test("capture preserves native profile progression and images without copying NPC base statistics", async () => {
  const { actor, options } = fixture();
  const before = structuredClone({ system: actor.system, flags: actor.flags });
  const snapshot = await buildBeastEssenceSnapshot(actor, options);
  assert.deepEqual(snapshot.highestAbilities, ["str", "con"]);
  assert.equal(snapshot.sourceRealm, 3);
  assert.equal(snapshot.sourceActorUuid, "Actor.beast");
  assert.equal(snapshot.tokenTexture, "images/beast-token.webp");
  assert.equal(snapshot.taxonomy.name, "Besta Mágica");
  assert.equal(snapshot.taxonomy.img, "images/taxonomy.webp");
  assert.deepEqual(snapshot.taxonomy.resistances, { fire: { value: 4, immune: false } });
  assert.deepEqual(snapshot.taxonomy.movement, { walk: 12, fly: 6 });
  assert.deepEqual(snapshot.taxonomy.senses, { darkvision: 18 });
  assert.deepEqual(snapshot.taxonomy.features.map(entry => [entry.data.name, entry.level]), [["Pele Espessa", 1], ["Sentido Superior", 12]]);
  assert.equal(snapshot.taxonomy.features[0].data.img, "images/passive.webp");
  for (const name of ["pesos", "energiaBase", "proficiencias"]) assert.equal(snapshot.taxonomy[name], undefined);
  assert.deepEqual(snapshot.elements, ["fogo", "vento", "gelo"]);
  assert(!snapshot.features.some(entry => entry.data.name === "Pele Espessa"));
  assert.deepEqual({ system: actor.system, flags: actor.flags }, before);
});

test("capture filters unreadable sources, tolerates missing UUIDs, and leaves unknown realm unknown", async () => {
  const { actor, taxonomy, options } = fixture();
  delete actor.flags[scope].cultivationRank;
  delete actor.system.legacy2.nd;
  taxonomy.system.habilidades.push({ uuid: "Compendium.missing.Item.missing", nd: 1 });
  const snapshot = await buildBeastEssenceSnapshot(actor, options);
  assert.equal(snapshot.sourceRealm, null);
  assert(!JSON.stringify(snapshot).includes("Segredo do Narrador"));
  assert(!snapshot.features.some(entry => entry.data.name === "Particular"));
  actor.visible = false;
  await assert.rejects(() => buildBeastEssenceSnapshot(actor, options), /permiss|acesso/i);
});

test("capture separates free natural weapons and special activities from passive feature choices", async () => {
  const { actor, options } = fixture();
  const snapshot = await buildBeastEssenceSnapshot(actor, options);
  assert.deepEqual(snapshot.naturalWeapons.map(entry => entry.data.name), ["Garras"]);
  assert.equal(snapshot.naturalWeapons[0].uuid, "Compendium.creatures.Item.claw");
  assert.deepEqual(snapshot.attacks.map(entry => entry.activityId), ["bite", "breath", "quake", "reaction", "blast"]);
  assert.equal(snapshot.attacks.find(entry => entry.activityId === "breath").area, true);
  assert.equal(snapshot.attacks.find(entry => entry.activityId === "breath").damageInstances, 2);
  assert.equal(snapshot.attacks.find(entry => entry.activityId === "bite").effectQi, 2);
  assert(!snapshot.features.some(entry => entry.data.name === "Sopro"));
  assert.deepEqual(Object.keys(byName(snapshot.features, "Instinto e Rajadas").data.system.activities), ["observe"]);
  for (const candidate of snapshot.attacks) {
    assert.deepEqual(Object.keys(candidate.data.system.activities), [candidate.activityId]);
  }
});

test("builder persists only selected candidates and emits a sanitized Portuguese material loot Item", async () => {
  const { actor, options } = fixture();
  const snapshot = await buildBeastEssenceSnapshot(actor, options);
  const selection = selectionFor(snapshot);
  const item = createBeastEssenceItemData(snapshot, selection);
  const definition = definitionOf(item);
  assert.equal(item.type, "loot");
  assert.equal(item.system.type.value, "material");
  assert.equal(item.system.quantity, 1);
  assert.equal(item.img, "images/beast.webp");
  assert.match(item.name, /Essência de Besta/);
  assert.match(item.system.description.value, /Tigre &lt;Antigo&gt;/);
  assert.match(item.system.description.value, /Terra/);
  assert.deepEqual(definition.features.map(entry => entry.data.name), ["Olhos Atentos"]);
  assert.deepEqual(definition.attacks.map(entry => entry.activityId), ["bite", "breath", "quake"]);
  assert.equal(definition.id, "essence-fixture");
  assert.equal(definition.ability, "con");
  assert.equal(definition.growth, "earth");
  assert.deepEqual(definition.normalAttacks, selection.normalAttacks);
  assert.deepEqual(definition.weakenedAttacks, selection.weakenedAttacks);
  const serialized = JSON.stringify(item);
  for (const secret of ["secret-", "private-folder", "private-source", "Particular", "Instinto público", "forbidden", "reaction", "notAConcept", "biography", "ownership", "npcProfileFeature", "advancement"]) assert(!serialized.includes(secret), `leaked ${secret}`);
  assert.equal(item.folder, undefined);
  definition.taxonomy.features[0].data.name = "Editado";
  assert.equal(snapshot.taxonomy.features[0].data.name, "Pele Espessa");
});

test("builder rejects quota, duplicate, unavailable, out-of-mode, and non-highest attribute selections", async () => {
  const { actor, options } = fixture();
  const snapshot = await buildBeastEssenceSnapshot(actor, options);
  const selection = selectionFor(snapshot);
  const features = snapshot.features.map(entry => entry.key);
  const attacks = snapshot.attacks.map(entry => entry.key);
  const six = snapshot.attacks.find(entry => entry.activityId === "quake").key;
  for (const patch of [
    { ability: "wis" }, { growth: "mythic" }, { elements: ["fogo", "vento", "gelo"] }, { elements: ["fogo", "fogo"] }, { elements: ["metal"] },
    { normalFeatures: [features[0], features[0]] }, { normalFeatures: ["foreign"] }, { weakenedFeatures: features },
    { normalAttacks: attacks.slice(0, 3) }, { normalAttacks: [six] }, { weakenedAttacks: attacks.slice(0, 2) },
    { normalAttacks: [attacks[0], attacks[0]] }, { weakenedAttacks: ["foreign"] }
  ]) {
    assert.throws(() => createBeastEssenceItemData(snapshot, { ...selection, ...patch }),
      RangeError, JSON.stringify(patch));
  }
  const tied = createBeastEssenceItemData(snapshot, { ...selection, ability: "str" });
  assert.equal(definitionOf(tied).ability, "str");
});

test("builder retains editable per-attack cost metadata without charging or mutating native consumption", async () => {
  const { actor, options } = fixture();
  const snapshot = await buildBeastEssenceSnapshot(actor, options);
  const selection = selectionFor(snapshot);
  const key = selection.normalAttacks[0];
  const data = createBeastEssenceItemData(snapshot, { ...selection,
    attackCosts: { [key]: { damageInstances: 4, effectQi: 7 } } });
  const selected = definitionOf(data).attacks.find(entry => entry.key === key);
  assert.equal(selected.damageInstances, 4);
  assert.equal(selected.effectQi, 7);
  assert.equal(selected.data.system.activities.bite.consumption.targets[0].value, "2");
  assert.equal(snapshot.attacks.find(entry => entry.key === key).damageInstances, 1);
  assert.throws(() => createBeastEssenceItemData(snapshot, { ...selection,
    attackCosts: { [key]: { damageInstances: -1 } } }), RangeError);
});

test("selected mixed features keep public text and passive effects while removing secrets and offensive shortcuts", async () => {
  const { actor, options } = fixture();
  const snapshot = await buildBeastEssenceSnapshot(actor, options);
  const selection = selectionFor(snapshot);
  selection.normalFeatures = [byName(snapshot.features, "Instinto e Rajadas").key];
  const data = definitionOf(createBeastEssenceItemData(snapshot, selection)).features[0].data;
  assert.match(data.system.description.value, /Instinto público/);
  assert.match(data.system.description.value, /Depois/);
  assert(!JSON.stringify(data).includes("secret"));
  assert.deepEqual(Object.keys(data.system.activities), ["observe"]);
  assert.equal(data.effects[0].changes[0].value, "1");
});


test("profile offensive grants use the special quota and only their linked effects survive capture", async () => {
  const { actor, taxonomy, documents, options } = fixture();
  const grant = document("profileAttack", "feat", "Aura e Rugido", {
    activities: { aura: { _id: "aura", type: "utility", effects: [{ _id: "auraEffect" }] }, roar: { ...attack("roar", 2), effects: [{ _id: "roarEffect" }] } }
  }, { effects: [
    { _id: "auraEffect", name: "Coragem", changes: [{ key: "system.bonuses.abilities.check", mode: 2, value: "1" }] },
    { _id: "roarEffect", name: "Medo", changes: [], transfer: false },
    { _id: "unrelated", name: "Não selecionado", changes: [], transfer: false }
  ] });
  grant.uuid = "Compendium.creatures.Item.roar";
  documents.set(grant.uuid, grant);
  taxonomy.system.habilidades.push({ uuid: grant.uuid, nd: 4 });
  const snapshot = await buildBeastEssenceSnapshot(actor, options);
  const passive = snapshot.taxonomy.features.find(entry => entry.uuid === grant.uuid);
  assert.equal(passive.level, 4);
  assert.deepEqual(Object.keys(passive.data.system.activities), ["aura"]);
  assert(!passive.data.effects.some(effect => effect._id === "roarEffect"));
  const special = snapshot.attacks.find(entry => entry.uuid === grant.uuid);
  assert.equal(special.activityId, "roar");
  assert.deepEqual(special.data.effects.map(effect => effect._id), ["roarEffect"]);
  assert(!snapshot.features.some(entry => entry.uuid === grant.uuid));
  actor.system.legacy2.nd = 3;
  const earlier = await buildBeastEssenceSnapshot(actor, options);
  assert(!earlier.attacks.some(entry => entry.uuid === grant.uuid));
  assert(earlier.taxonomy.features.some(entry => entry.uuid === grant.uuid && entry.level === 4));
});

test("public native descriptions remove unquoted secret HTML and private source references", async () => {
  const { actor, mixed, options } = fixture();
  mixed.system.description.value = "<p>Antes.</p><section class=secret><p>private-unquoted</p></section><p>Depois.</p>";
  const snapshot = await buildBeastEssenceSnapshot(actor, options);
  const data = byName(snapshot.features, "Instinto e Rajadas").data;
  assert.equal(data.system.description.value, "<p>Antes.</p><p>Depois.</p>");
  assert(!JSON.stringify(data).includes("private-source"));
});


test("special capture preserves clear native action timings and resolves item activation inheritance", async () => {
  const { actor, mixed, options } = fixture();
  mixed.system.activation = { type: "power", value: 2 };
  mixed.system.activities.inherited = { ...attack("inherited", 5), activation: { override: false, type: "action", value: 5 } };
  mixed.system.activities.bonus = { ...attack("bonus", 1), activation: { type: "bonus", value: 1 } };
  mixed.system.activities.legendary = { ...attack("legendary", 2), activation: { type: "legendary", value: 2 } };
  mixed.system.activities.slow = { ...attack("slow", 1), activation: { type: "minute", value: 1 } };
  const snapshot = await buildBeastEssenceSnapshot(actor, options);
  const inherited = snapshot.attacks.find(entry => entry.activityId === "inherited");
  assert.equal(inherited.actions, 2);
  assert.equal(inherited.data.system.activities.inherited.activation.type, "power");
  assert.equal(inherited.data.system.activities.inherited.activation.override, true);
  assert(snapshot.attacks.some(entry => entry.activityId === "bonus"));
  assert(snapshot.attacks.some(entry => entry.activityId === "reaction"));
  assert(!snapshot.attacks.some(entry => ["legendary", "slow"].includes(entry.activityId)));
  assert(snapshot.warnings.some(message => message.includes("legendary")));
});


test('generator exclusions cannot return through profile or owned copies in a beast essence', async () => {
 const {actor,options}=fixture();
 actor.flags[scope].npcGenerator={excludedFeatures:['Compendium.creatures.Item.passive','Compendium.creatures.Item.future'],excludedEquipment:['Compendium.creatures.Item.claw']};
 const snapshot=await buildBeastEssenceSnapshot(actor,options);
 assert.deepEqual(snapshot.taxonomy.features,[]);
 assert.deepEqual(snapshot.naturalWeapons,[]);
 assert(!snapshot.features.some(e=>e.uuid==='Compendium.creatures.Item.passive'));
 assert(!snapshot.attacks.some(e=>e.uuid==='Compendium.creatures.Item.passive'));
});

import assert from "node:assert/strict";
import {test} from "node:test";
import {buildBeastEssenceGrants, beastEssenceItemRollData} from "../module/systems/beast-essence-grants.mjs";

const SCOPE="Immortals-system";
/**
 *
 * @param name
 * @param type
 */
function native(name, type="feat") {
  return {_id: "source-item", name, type, img: "beast.webp", ownership: {default: 0}, folder: "private-folder", _stats: {compendiumSource: "Compendium.old.Item.old"},
    system: {container: "source-container", equipped: false, uses: {spent: 4, max: "5"}, advancement: [{type: "ItemGrant", value: {}}], description: {value: "<p>Native rules</p>"},
      activities: {sourceActivity: {_id: "sourceActivity", type: "utility", uses: {spent: 2, max: "3"}, activation: {type: "action", value: 2},
        consumption: {spellSlot: false, targets: [{type: "attribute", target: "energy.total", value: "8"}, {type: "itemUses", target: "", value: "1"}]},
        effects: [{_id: "sourceEffect", level: {min: 1, max: null}}], flags: {[SCOPE]: {elementalActivity: {id: "old"}, qiTalentActivity: {id: "old"}, professionProductActivity: {id: "old"}, keepActivity: {value: 7}}, anotherModule: {publicSetting: true}}}}},
    effects: [{_id: "sourceEffect", name: "Native effect", type: "base", origin: "Actor.source.Item.source-item", ownership: {default: 0},
      system: {origin: {actor: "Actor.source", item: "Actor.source.Item.source-item", activity: "Actor.source.Item.source-item.Activity.sourceActivity", message: "ChatMessage.source"}, changes: [{key: "system.attributes.movement.speeds.walk", mode: 2, value: "1"}]}, flags: {anotherModule: {keep: true}}}],
    flags: {[SCOPE]: {keepItem: {value: 3}, npcProfileFeature: {source: "Compendium.old.Item.old"}}, anotherModule: {publicSetting: true}}};
}
/**
 *
 */
function actor() {
  const entry=(key, level=0, type="feat") => ({key, uuid: `Compendium.beast.Item.${key}`, level, data: native(key, type)});
  const taxonomy=entry("taxonomy", 1); const overLevel=entry("future", 9); const archetype=entry("archetype", 2); const extra=entry("extra"); const claws=entry("claws", 0, "weapon"); const attack=entry("attack");
  const essence={version: 1, id: "integrated-a", growth: "earth", ability: "con", elements: ["terra"],
    taxonomy: {features: [taxonomy, overLevel]}, archetype: {features: [archetype, {...taxonomy, key: "duplicate-key"}]},
    naturalWeapons: [claws], features: [extra, {...taxonomy, key: "duplicate-extra"}], normalFeatures: ["extra", "duplicate-extra"], weakenedFeatures: ["extra"],
    attacks: [{...attack, key: "attack:first", actions: 2, damageInstances: 2, effectQi: 1, area: true},
      {...attack, key: "attack:second", actions: 3, damageInstances: 1, effectQi: 0, area: false}], normalAttacks: ["attack:first", "attack:second"], weakenedAttacks: ["attack:first"]};
  return {uuid: "Actor.character", type: "character", isOwner: true, items: [], system: {cultivation: {rank: 3, stage: 2}, abilities: {con: {value: 7}}},
    flags: {[SCOPE]: {beastEssence: {integrated: essence, transformation: {active: true, integrationId: essence.id, mode: "normal", grantedItemIds: []}}}}};
}
const ids=() => {let next=0; return () => `grant${String(++next).padStart(11, "0")}`;};
const grant=source => source.flags[SCOPE].beastEssenceGrant;
const allActivities=sources => sources.flatMap(source => Object.values(source.system.activities));

test("normal form grants native taxonomy, archetype, chosen features, all natural weapons and selected attacks", () => {
  const a=actor(); const before=structuredClone(a); const sources=buildBeastEssenceGrants(a, {idFactory: ids()});
  assert.deepEqual(sources.map(source => [grant(source).key, grant(source).kind]), [
    ["taxonomy", "taxonomy"], ["archetype", "archetype"], ["extra", "feature"], ["claws", "naturalWeapon"], ["attack:first", "attack"], ["attack:second", "attack"]]);
  assert(sources.every(source => grant(source).integrationId==="integrated-a"&&grant(source).mode==="normal"&&grant(source).level===8));
  assert.deepEqual(a, before);
});

test("weakened form drops archetype, honors feature selections and uses the growth ceiling", () => {
  const a=actor(); a.system.cultivation.rank=5;
  const sources=buildBeastEssenceGrants(a, {idFactory: ids()});
  assert.deepEqual(sources.map(source => grant(source).kind), ["taxonomy", "taxonomy", "feature", "naturalWeapon", "attack"]);
  assert(sources.every(source => grant(source).mode==="weakened"&&grant(source).level===12));
  assert.equal(sources.filter(source => grant(source).kind==="attack").length, 1);
});

test("inactive, mismatched and dormant transformations do not allocate or grant anything", () => {
  const allocate=() => {throw Error("Unexpected allocation");};
  for (const mutation of [a => a.flags[SCOPE].beastEssence.transformation.active=false, a => a.flags[SCOPE].beastEssence.transformation.integrationId="old", a => a.system.cultivation.rank=6]) {
    const a=actor(); mutation(a); assert.deepEqual(buildBeastEssenceGrants(a, {idFactory: allocate}), []);
  }
});

test("manual passive copies suppress duplicate effects while manual special attacks remain independent", () => {
  const a=actor(); a.items=[{id: "manual-tax", type: "feat", _stats: {compendiumSource: "Compendium.beast.Item.taxonomy"}},
    {id: "manual-claw", type: "weapon", flags: {core: {sourceId: "Compendium.beast.Item.claws"}}},
    {id: "manual-attack", type: "feat", _stats: {compendiumSource: "Compendium.beast.Item.attack"}}];
  const before=structuredClone(a.items); const sources=buildBeastEssenceGrants(a, {idFactory: ids()});
  assert.deepEqual(sources.map(source => grant(source).kind), ["archetype", "feature", "attack", "attack"]);
  assert.deepEqual(a.items, before);
});

test("managed copies do not suppress replacement grants in a reconciliation plan", () => {
  const a=actor(); a.items=[{id: "old-managed", type: "feat", _stats: {compendiumSource: "Compendium.beast.Item.taxonomy"}, flags: {[SCOPE]: {beastEssenceGrant: {integrationId: "old", key: "taxonomy"}}}}];
  assert(buildBeastEssenceGrants(a, {idFactory: ids()}).some(source => grant(source).key==="taxonomy"));
});

test("new document IDs and effect references are rebased to the target actor and temporary Item", () => {
  const sources=buildBeastEssenceGrants(actor(), {idFactory: ids()});
  const documentIds=sources.flatMap(source => [source._id, ...source.effects.map(effect => effect._id), ...Object.values(source.system.activities).map(activity => activity._id)]);
  assert.equal(new Set(documentIds).size, documentIds.length); assert(documentIds.every(id => id.startsWith("grant")));
  for (const source of sources) {
    const [activity]=Object.values(source.system.activities); const [effect]=source.effects;
    assert.equal(activity.effects[0]._id, effect._id); assert.equal(effect.origin, `Actor.character.Item.${source._id}`);
    assert.equal(effect.system.origin.actor, "Actor.character"); assert.equal(effect.system.origin.item, `Actor.character.Item.${source._id}`);
    assert.equal(effect.system.origin.activity, `Actor.character.Item.${source._id}.Activity.${activity._id}`);
    assert.equal(effect.system.origin.message, undefined);
  }
});

test("grants omit source ownership, folders, advancement and incompatible automation while preserving native content", () => {
  const sources=buildBeastEssenceGrants(actor(), {idFactory: ids()});
  for (const source of sources) {
    assert.equal(source.ownership, undefined); assert.equal(source.folder, undefined); assert.equal(source.system.advancement, undefined); assert.equal(source.system.container, null);
    assert.equal(source.system.description.value, "<p>Native rules</p>"); assert.equal(source.flags.anotherModule.publicSetting, true);
    assert.equal(source.flags[SCOPE].keepItem.value, 3);
    for (const activity of Object.values(source.system.activities)) {
      assert.equal(activity.flags[SCOPE].elementalActivity, undefined); assert.equal(activity.flags[SCOPE].qiTalentActivity, undefined); assert.equal(activity.flags[SCOPE].professionProductActivity, undefined);
      assert.equal(activity.flags[SCOPE].keepActivity.value, 7); assert.equal(activity.flags.anotherModule.publicSetting, true);
      assert.equal(activity.flags[SCOPE].beastEssenceActivity.integrationId, "integrated-a");
    }
  }
  const natural=sources.find(source => grant(source).kind==="naturalWeapon"); assert.equal(natural.system.equipped, true);
});

test("selected attack activities preserve native action budgets and mark unresolved Qi without guessing", () => {
  const attacks=buildBeastEssenceGrants(actor(), {idFactory: ids()}).filter(source => grant(source).kind==="attack");
  for (const source of attacks) {
    const [activity]=Object.values(source.system.activities); const metadata=activity.flags[SCOPE].beastEssenceActivity;
    assert.equal(metadata.kind, "attack"); assert.equal(metadata.actions, activity.activation.value); assert.equal(metadata.costPending, true);
    assert.equal(activity.activation.override, true);
    assert.equal(activity.consumption.targets.filter(target => target.target==="energy.generated").length, 1);
    assert.equal(activity.consumption.targets.find(target => target.target==="energy.generated").value, "0");
    assert(!activity.consumption.targets.some(target => target.target==="energy.total"));
    assert(activity.consumption.targets.some(target => target.type==="itemUses"));
  }
  assert.equal(attacks[0].system.activities[Object.keys(attacks[0].system.activities)[0]].flags[SCOPE].beastEssenceActivity.damageInstances, 2);
});

test("all feature and natural-weapon activities carry current-form validation metadata", () => {
  const sources=buildBeastEssenceGrants(actor(), {idFactory: ids()});
  for (const source of sources.filter(source => grant(source).kind!=="attack")) for (const activity of Object.values(source.system.activities)) {
    const meta=activity.flags[SCOPE].beastEssenceActivity;
    assert.equal(meta.kind, grant(source).kind==="naturalWeapon"?"naturalWeapon":"feature"); assert.equal(meta.key, grant(source).key);
  }
});

test("unsupported class and race sources cannot create temporary advancements", () => {
  for (const type of ["class", "race", "subclass", "taxonomy"]) {const a=actor(); a.flags[SCOPE].beastEssence.integrated.features[0].data.type=type;
    assert.throws(() => buildBeastEssenceGrants(a, {idFactory: ids()}), /feat|weapon|temporár/i);}
});

test("roll aliases use the integrated attribute and effective essence level only for matching active grants", () => {
  const a=actor(); const original=structuredClone(a.system.legacy2); const source=buildBeastEssenceGrants(a, {idFactory: ids()})[0]; const item={...source, actor: a};
  assert.deepEqual(beastEssenceItemRollData(item), {npcPrincipal: 7, npcDamageDice: "1d12", nd: 8, legacy2: {...a.system.legacy2, nd: 8}});
  assert.deepEqual(a.system.legacy2, original);
  a.system.cultivation.rank=5; assert.deepEqual(beastEssenceItemRollData(item), {npcPrincipal: 7, npcDamageDice: "3d6", nd: 12, legacy2: {...a.system.legacy2, nd: 12}});
  assert.deepEqual(beastEssenceItemRollData({actor: a, flags: {}}), {});
  item.flags[SCOPE].beastEssenceGrant.integrationId="different"; assert.deepEqual(beastEssenceItemRollData(item), {});
  item.flags[SCOPE].beastEssenceGrant.integrationId="integrated-a"; a.flags[SCOPE].beastEssence.transformation.active=false; assert.deepEqual(beastEssenceItemRollData(item), {});
});


test("a fresh integration does not inherit spent charges from the dead creature", () => {
  const a=actor(); const before=structuredClone(a); const sources=buildBeastEssenceGrants(a, {idFactory: ids()});
  for (const source of sources) {assert.equal(source.system.uses.spent, 0); assert.equal(source.system.uses.max, "5");
    for (const activity of Object.values(source.system.activities)) {assert.equal(activity.uses.spent, 0); assert.equal(activity.uses.max, "3");}}
  assert.deepEqual(a, before);
});

test("passive records sharing a stable key do not create duplicate synchronization markers", () => {
  const a=actor(); const definition=a.flags[SCOPE].beastEssence.integrated;
  definition.archetype.features.push({...definition.taxonomy.features[0], uuid: "Compendium.other.Item.another"});
  const sources=buildBeastEssenceGrants(a, {idFactory: ids()});
  assert.equal(sources.filter(source => grant(source).key==="taxonomy").length, 1);
});


test("activity source identities stay stable while embedded IDs are regenerated between builds", () => {
  const a=actor(); const idFactory=ids(); const first=buildBeastEssenceGrants(a, {idFactory}); const second=buildBeastEssenceGrants(a, {idFactory});
  for (let index=0; index<first.length; index++) {
    const oldActivity=Object.values(first[index].system.activities)[0]; const newActivity=Object.values(second[index].system.activities)[0];
    assert.notEqual(oldActivity._id, newActivity._id);
    assert.equal(oldActivity.flags[SCOPE].beastEssenceActivity.sourceActivityId, "sourceActivity");
    assert.equal(newActivity.flags[SCOPE].beastEssenceActivity.sourceActivityId, oldActivity.flags[SCOPE].beastEssenceActivity.sourceActivityId);
  }
});

test("native Collection and Map inventories both suppress manually owned passive copies", () => {
  const a=actor(); a.items=new Map([["manual", {id: "manual", type: "feat", _stats: {compendiumSource: "Compendium.beast.Item.taxonomy"}}]]);
  assert(!buildBeastEssenceGrants(a, {idFactory: ids()}).some(source => grant(source).key==="taxonomy"));
});

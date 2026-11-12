import assert from "node:assert/strict";
import {test} from "node:test";
import {withElementalActorLock} from "../module/systems/elemental-runtime.mjs";
let create; let register;
try { ({createCultivationDestinyRuntime: create, registerCultivationDestinyRuntime: register}=await import("../module/systems/cultivation-destiny-runtime.mjs")); }
catch (error) { if (error.code!=="ERR_MODULE_NOT_FOUND") throw error; }
const scope="Immortals-system";
const set=(object, key, value) => {const parts=key.split("."); let target=object; for (const part of parts.slice(0, -1))target=target[part]??={}; target[parts.at(-1)]=structuredClone(value);};
let actors=0;
/**
 * Model native item creation and actor patches without a running Foundry world.
 * @param {object} root0
 * @param {number} root0.rank
 * @param {boolean} root0.halfMonster
 * @param {Function} root0.commit
 * @returns {object}
 */
function fixture({rank=1, halfMonster=false, commit}={}) {
  assert.equal(typeof create, "function", "destiny runtime factory must exist");
  const cl={id: "class", type: "class", system: {identifier: "cultivador"}};
  const a={id: `destiny${++actors}`, uuid: `Actor.destiny${actors}`, type: "character", isOwner: true, limited: false, canUserModify: () => true, flags: {[scope]: {constitution: {primary: {id: "existing", quality: "superior"}}}}, system: {cultivation: {rank, stage: 1, points: 12}, energy: {generated: 50}, abilities: {str: {value: 4}}}, items: new Map([["class", cl]]), itemTypes: {class: [cl]}};
  if (halfMonster) a.items.set("race", {id: "race", type: "race", name: "Meio Monstro", flags: {[scope]: {species: {key: "meio-monstro"}}}});
  a.items.set("personal", {id: "personal", name: "Manual pessoal", type: "feat", flags: {}, system: {description: {value: "Edição do narrador"}}});
  const writes=[]; let ids=0; let fail=false;
  const apply=async (subject, data) => {if (fail) throw Error("write failed"); writes.push(structuredClone(data)); for (const [key, value] of Object.entries(data.actor??{}))set(subject, key, value); for (const id of data.delete??[])subject.items.delete(id); for (const source of data.create??[])subject.items.set(source._id, {...structuredClone(source), id: source._id});};
  const runtime=create({user: () => ({id: "u", isGM: true}), idFactory: () => `grant${++ids}`, commit: commit??apply});
  return {a, runtime, writes, fail() {fail=true;}};
}
const divine={key: "divine-lineage", lineageId: "phoenix", ability: "str"};
const essences=a => [...a.items.values()].filter(i => i.flags?.[scope]?.beastEssenceItem);
const grants=a => [...a.items.values()].filter(i => i.flags?.[scope]?.cultivationDestinyGrant);
const saved=a => a.flags[scope].cultivationDestiny;
const manual={name: "Passo do Sol", rank: 1, rarity: "humano", quality: "inferior", confirmedByNarrator: true};

test("explicit divine selection creates one native Supreme essence atomically while lineage powers remain sealed", async () => {
  const f=fixture(); await f.runtime.select(f.a, divine, {expectedRevision: 0});
  assert.equal(f.writes.length, 1); assert.equal(saved(f.a).key, "divine-lineage"); assert.equal(saved(f.a).revision, 1); assert.equal(grants(f.a).length, 0);
  const [item]=essences(f.a); assert.equal(item.type, "loot"); assert.equal(item.system.quantity, 1); const def=item.flags[scope].beastEssenceItem.definition;
  assert.equal(def.version, 1); assert.equal(def.name, "Phoenix"); assert.equal(def.growth, "supreme"); assert.equal(def.ability, "str"); assert.deepEqual(def.elements, ["fogo"]); assert.deepEqual(def.attacks, []); assert.deepEqual(def.features, []); assert.equal(def.sourceActorUuid, ""); assert.equal(f.a.system.cultivation.points, 12); assert.equal(f.a.system.energy.generated, 50); assert(f.a.items.has("personal"));
});
test("realm three unlocks the authored lineage once and regression only removes owned lineage grants", async () => {
  const f=fixture(); await f.runtime.select(f.a, divine); f.a.system.cultivation.rank=3; await f.runtime.sync(f.a);
  assert.equal(grants(f.a).length, 1); assert.equal(grants(f.a)[0].name, "Phoenix"); assert.match(grants(f.a)[0].system.description.value, /resistência 30/);
  const grant=grants(f.a)[0]; grant.system.description.value="Texto ajustado pelo narrador"; const count=f.writes.length; await f.runtime.sync(f.a); assert.equal(f.writes.length, count); assert.equal(grants(f.a)[0].system.description.value, "Texto ajustado pelo narrador");
  f.a.system.cultivation.rank=2; await f.runtime.sync(f.a); assert.equal(grants(f.a).length, 0); assert(f.a.items.has("personal")); assert.equal(essences(f.a).length, 1);
});
test("native Half Monster unlocks a second lineage immediately without replacing its species or granting racial weaknesses", async () => {
  const f=fixture({halfMonster: true}); await f.runtime.select(f.a, {key: "divine-lineage", lineageId: "fox", ability: "wis"});
  assert.equal(grants(f.a).length, 1); assert.equal(grants(f.a)[0].name, "Jiuweihu (Raposa de 9 Caudas)"); assert.doesNotMatch(grants(f.a)[0].system.description.value, /Fraquezas:|Dificuldade de Aprendizado/); assert.equal(f.a.items.get("race").flags[scope].species.key, "meio-monstro");
});
test("switching destinies preserves the integrated source and receipt prevents farming another essence", async () => {
  const f=fixture({rank: 3});
  await f.runtime.select(f.a, divine);
  const [item]=essences(f.a);
  f.a.flags[scope].beastEssence={integrated: structuredClone(item.flags[scope].beastEssenceItem.definition)};
  f.a.items.delete(item.id);
  await f.runtime.select(f.a, {key: "own-origin", story: "Um encontro"}); assert.equal(grants(f.a).length, 0); assert.equal(f.a.flags[scope].beastEssence.integrated.name, "Phoenix");
  await f.runtime.select(f.a, {key: "divine-lineage", lineageId: "tiger", ability: "dex"}); await f.runtime.sync(f.a); assert.equal(essences(f.a).length, 0); assert.equal(grants(f.a)[0].name, "Tigre Branco"); assert.equal(saved(f.a).essenceReceipts.length, 1);
});
test("unselected characters do not receive defaults from sync", async () => {const f=fixture(); assert.equal(await f.runtime.sync(f.a), false); assert.equal(f.writes.length, 0); assert.equal(essences(f.a).length, 0); assert.equal(saved(f.a), undefined);});
test("failed atomic selection writes do not consume a receipt or leave a grant", async () => {const f=fixture({rank: 3}); f.fail(); await assert.rejects(() => f.runtime.select(f.a, divine), /write failed/); assert.equal(saved(f.a), undefined); assert.equal(essences(f.a).length, 0); assert.equal(grants(f.a).length, 0);});
test("selection requires an explicit valid essence ability and never guesses the beast attribute", async () => {const f=fixture(); await assert.rejects(() => f.runtime.select(f.a, {key: "divine-lineage", lineageId: "phoenix"}), /atributo/i); await assert.rejects(() => f.runtime.select(f.a, {...divine, ability: "luck"}), /atributo/i); assert.equal(f.writes.length, 0);});
test("reincarnated records the starting constitution duty without overwriting existing constitution or charging resources", async () => {const f=fixture(); const before=structuredClone(f.a.flags[scope].constitution); await f.runtime.select(f.a, {key: "reincarnated"}); await f.runtime.select(f.a, {key: "own-origin"}); await f.runtime.select(f.a, {key: "reincarnated"}); assert.deepEqual(f.a.flags[scope].constitution, before); assert.equal(saved(f.a).records.filter(r => r.kind==="reincarnated-obligation").length, 1); assert.equal(f.a.system.cultivation.points, 12);});
test("Immortal Soul combat teaching is one per reached realm even after destiny switching", async () => {
  const f=fixture({rank: 3}); await f.runtime.select(f.a, {key: "immortal-soul"}); await f.runtime.record(f.a, {...manual, kind: "combat-manual"}); await assert.rejects(() => f.runtime.record(f.a, {...manual, kind: "combat-manual"}), /reino|registrad/i);
  await assert.rejects(() => f.runtime.record(f.a, {...manual, kind: "combat-manual", rank: 4}), /reino|alcanç/i);
  await f.runtime.select(f.a, {key: "own-origin"}); await f.runtime.select(f.a, {key: "immortal-soul"}); await assert.rejects(() => f.runtime.record(f.a, {...manual, kind: "combat-manual"}), /reino|registrad/i); assert.equal([...f.a.items.values()].filter(i => i.type!=="feat"&&i.type!=="class").length, 0);
});
test("Immortal Soul cultivation manuals have two lifetime deliveries capped at Divine Inferior", async () => {
  const f=fixture({rank: 5}); await f.runtime.select(f.a, {key: "immortal-soul"}); await assert.rejects(() => f.runtime.record(f.a, {...manual, kind: "cultivation-manual", rarity: "divino", quality: "comum"}), /Divino|Inferior|limite/i);
  await assert.rejects(() => f.runtime.record(f.a, {...manual, kind: "cultivation-manual", rarity: "supremo"}), /Divino|Inferior|limite/i); await assert.rejects(() => f.runtime.record(f.a, {...manual, kind: "cultivation-manual", rank: 6}), /reino|alcanç/i);
  await f.runtime.record(f.a, {...manual, kind: "cultivation-manual", rarity: "divino", rank: 5}); await f.runtime.record(f.a, {...manual, kind: "cultivation-manual", name: "Outro"}); await assert.rejects(() => f.runtime.record(f.a, {...manual, kind: "cultivation-manual", name: "Terceiro"}), /duas|2|limite/i);
  assert.equal(saved(f.a).records.filter(r => r.kind==="cultivation-manual").length, 2); assert.equal(f.a.system.energy.generated, 50);
});
test("teaching and exchange require explicit Narrator confirmation and validated classifications", async () => {const f=fixture(); await f.runtime.select(f.a, {key: "immortal-soul"}); await assert.rejects(() => f.runtime.record(f.a, {...manual, kind: "combat-manual", confirmedByNarrator: false}), /narrador|confirm/i); await assert.rejects(() => f.runtime.record(f.a, {...manual, kind: "combat-manual", quality: "mystery"}), /classifica|qualidade/i);});
test("legacy exchanges require realm three and equal declared rarity and quality but never fabricate or remove treasure", async () => {
  const f=fixture({rank: 2}); await f.runtime.select(f.a, {key: "supreme-legacy"}); const exchange={kind: "legacy-exchange", name: "Tesouro recebido", offeredName: "Tesouro oferecido", rank: 2, rarity: "terra", quality: "comum", offeredRarity: "terra", offeredQuality: "comum", confirmedByNarrator: true};
  await assert.rejects(() => f.runtime.record(f.a, exchange), /Núcleo|Rotativo|reino/i); f.a.system.cultivation.rank=3; await assert.rejects(() => f.runtime.record(f.a, {...exchange, offeredQuality: "inferior"}), /equival|mesm/i); await assert.rejects(() => f.runtime.record(f.a, {...exchange, offeredRarity: "humano"}), /equival|mesm/i);
  const items=[...f.a.items.keys()]; await f.runtime.record(f.a, exchange); assert.deepEqual([...f.a.items.keys()], items); assert.equal(saved(f.a).records.at(-1).offeredName, "Tesouro oferecido"); assert.equal(f.a.system.cultivation.points, 12);
});
test("stale revisions and ownership lost while waiting cancel all writes", async () => {
  const f=fixture(); await f.runtime.select(f.a, {key: "own-origin"}, {expectedRevision: 0}); await assert.rejects(() => f.runtime.select(f.a, divine, {expectedRevision: 0}), /revis|mudou|atualiz/i); const writes=f.writes.length;
  let release; let entered; const gate=new Promise(resolve => {release=resolve;}); const started=new Promise(resolve => {entered=resolve;}); const holder=withElementalActorLock(f.a, "hold", async () => {entered(); await gate;}); await started;
  const waiting=f.runtime.select(f.a, divine, {expectedRevision: 1});
  f.a.isOwner=false;
  release();
  await holder;
  await assert.rejects(() => waiting, /permiss/i);
  assert.equal(f.writes.length, writes);
});
test("ready and actor updates reconcile only explicitly selected actors once without issuing essence grants", async () => {
  assert.equal(typeof register, "function"); const f=fixture({rank: 3}); const empty=fixture(); await f.runtime.select(f.a, divine); const [essence]=essences(f.a); f.a.items.delete(essence.id); for (const grant of grants(f.a))f.a.items.delete(grant.id);
  const handlers={};
  const hooks={on: (event, fn) => {(handlers[event]??=[]).push(fn);}};
  const before=f.writes.length;
  register(hooks, {runtime: f.runtime, mayProcess: () => true, actors: () => [f.a, empty.a]});
  register(hooks, {runtime: f.runtime, mayProcess: () => true, actors: () => [f.a, empty.a]});
  assert.equal(handlers.ready.length, 1);
  await handlers.ready[0]();
  assert.equal(grants(f.a).length, 1);
  assert.equal(essences(f.a).length, 0);
  assert.equal(empty.writes.length, 0);
  await handlers.updateActor[0](f.a, {}, {});
  assert.equal(f.writes.length, before+1);
});

test("a personally owned authored lineage satisfies the grant without duplicating or later deleting it", async () => {const f=fixture({rank: 3}); f.a.items.set("ancestry", {id: "ancestry", name: "Phoenix", type: "feat", system: {description: {value: "Minhas alterações"}}, flags: {[scope]: {speciesLineage: true, speciesFeature: "Phoenix"}}}); await f.runtime.select(f.a, divine); assert.equal(grants(f.a).length, 0); await f.runtime.select(f.a, {key: "own-origin"}); assert.equal(f.a.items.get("ancestry").system.description.value, "Minhas alterações");});

test("destiny reconciliation never removes an imported grant owned by another actor", async () => {const f=fixture({rank: 3}); f.a.items.set("foreign", {id: "foreign", type: "feat", name: "Linhagem importada", flags: {[scope]: {cultivationDestinyGrant: {version: 1, lineageId: "tiger", actorUuid: "Actor.someoneElse"}}}}); await f.runtime.select(f.a, divine); await f.runtime.select(f.a, {key: "own-origin"}); assert(f.a.items.has("foreign"));});
test("NPCs and characters without the Cultivator class cannot select a player destiny", async () => {const f=fixture(); f.a.type="npc"; await assert.rejects(() => f.runtime.select(f.a, divine), /permiss|Cultivador|personagem/i); f.a.type="character"; f.a.itemTypes.class=[]; f.a.items.delete("class"); await assert.rejects(() => f.runtime.select(f.a, divine), /Cultivador/); assert.equal(f.writes.length, 0);});

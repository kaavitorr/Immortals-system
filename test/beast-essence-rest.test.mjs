import assert from "node:assert/strict";
import {test} from "node:test";
import {recoverInactiveBeastEssenceUses} from "../module/systems/beast-essence-rest.mjs";

const SCOPE="Immortals-system";
const clone=value => structuredClone(value);
const ids=() => {let n=0; return () => `shadow${String(++n).padStart(10, "0")}`;};
const set=(object, key, value) => {const parts=key.split("."); let target=object; for (const part of parts.slice(0, -1))target=target[part]??={}; target[parts.at(-1)]=clone(value);};
const uses=(spent, period="lr", type="recoverAll", formula="") => ({spent, max: "5", recovery: [{period, type, formula}]});
/**
 *
 */
function fixture() {
  const native={_id: "olditem", name: "Couraça da essência", type: "feat", system: {uses: uses(0), activities: {sourceActivity: {_id: "sourceActivity", type: "utility", uses: uses(0)}}}, effects: [], flags: {}};
  const essence={version: 1, id: "essence-a", growth: "earth", ability: "con", elements: [], taxonomy: {features: [{key: "couraca", uuid: "Compendium.beast.Item.couraca", level: 1, data: native}]}, archetype: null, features: [], attacks: [], naturalWeapons: [], normalFeatures: [], weakenedFeatures: [], normalAttacks: [], weakenedAttacks: []};
  const cache=[{key: "couraca", uses: uses(4), activities: [{id: "sourceActivity", uses: uses(3)}, {id: "retiredActivity", uses: uses(2)}]},
    {key: "old-form-only", uses: uses(2), activities: []}];
  const actor={uuid: "Actor.character", id: "character", type: "character", isOwner: true, items: new Map(), system: {cultivation: {rank: 3, stage: 2}, abilities: {con: {value: 7}}}, flags: {[SCOPE]: {beastEssence: {integrated: essence, transformation: {active: false}, uses: cache}}}, getRollData: () => ({npcPrincipal: -999, npcDamageDice: "99d20", nd: 99, keep: "native"}),
    update: () => {throw Error("No database writes allowed");}, createEmbeddedDocuments: () => {throw Error("No embedded writes allowed");}};
  const log=[]; const rolls=[]; let source;
  const itemFactory=(data, {parent}) => {
    assert.equal(parent, actor); source=clone(data);
    const item={_source: clone(data), flags: clone(data.flags), actor: parent, id: data._id, getRollData: options => ({...parent.getRollData(options), item: {name: data.name}}),
      update: () => {throw Error("No Item database writes allowed");}, prepareData() {this.system=clone(this._source.system); this.system.recoverUses=async recovery => {
        log.push({recovery, spent: this.system.uses.spent, activitySpent: Object.values(this.system.activities)[0].uses.spent, rollData: this.getRollData()});
        const updates={}; const nativeRolls=[];
        const plan=(pool, path) => {
          const profile=pool.recovery.find(entry => (recovery.get(entry.period)??0)>0); if (!profile) return;
          if (profile.type==="recoverAll")updates[`${path}.spent`]=0;
          else if (profile.type==="formula") {
            const roll={formula: profile.formula, total: 2, id: "native-roll"}; rolls.push(roll); nativeRolls.push(roll); updates[`${path}.spent`]=Math.max(0, pool.spent-roll.total);
          } else if (profile.type==="loseAll")updates[`${path}.spent`]=5;
        };
        plan(this.system.uses, "system.uses"); for (const [id, activity] of Object.entries(this.system.activities))plan(activity.uses, `system.activities.${id}.uses`);
        return {updates, rolls: nativeRolls, destroy: false};
      };}, updateSource(updates) {for (const [key, value] of Object.entries(updates))set(this._source, key, value); this.prepareData();}, toObject() {return clone(this._source);}};
    return item;
  };
  return {actor, itemFactory, log, rolls, get source() {return source;}};
}

test("inactive long-rest recovery delegates to native Item rules without mutating the actor or its sources", async () => {
  const f=fixture(); const before=clone({system: f.actor.system, flags: f.actor.flags}); const periods=new Map([["lr", 1]]);
  const result=await recoverInactiveBeastEssenceUses(f.actor, periods, {itemFactory: f.itemFactory, idFactory: ids()});
  assert.equal(result.changed, true); assert.equal(result.uses[0].uses.spent, 0); assert.equal(result.uses[0].activities.find(a => a.id==="sourceActivity").uses.spent, 0);
  assert.equal(f.log[0].recovery, periods); assert.equal(f.log[0].spent, 4); assert.equal(f.log[0].activitySpent, 3);
  assert.deepEqual({system: f.actor.system, flags: f.actor.flags}, before); assert.equal(f.actor.items.size, 0);
  assert.deepEqual(result.uses[1], before.flags[SCOPE].beastEssence.uses[1]);
  assert.equal(result.uses[0].activities.find(a => a.id==="retiredActivity").uses.spent, 2);
});

test("a short rest with no matching native period preserves charges and reports no change", async () => {
  const f=fixture(); const before=clone(f.actor.flags[SCOPE].beastEssence.uses);
  const result=await recoverInactiveBeastEssenceUses(f.actor, new Map([["sr", 1]]), {itemFactory: f.itemFactory, idFactory: ids()});
  assert.equal(result.changed, false); assert.deepEqual(result.uses, before); assert.deepEqual(result.rolls, []);
});

test("formula recovery preserves native rolls and virtual essence roll aliases even though the actor is inactive", async () => {
  const f=fixture(); const flags=f.actor.flags[SCOPE].beastEssence;
  flags.integrated.taxonomy.features[0].data.system.uses=uses(0, "lr", "formula", "1d4 + @npcPrincipal");
  flags.uses[0].uses=uses(4, "lr", "formula", "1d4 + @npcPrincipal");
  const result=await recoverInactiveBeastEssenceUses(f.actor, new Map([["lr", 2]]), {itemFactory: f.itemFactory, idFactory: ids()});
  assert.equal(result.uses[0].uses.spent, 2); assert.equal(result.rolls[0], f.rolls[0]);
  assert.deepEqual({...f.log[0].rollData, item: undefined}, {npcPrincipal: 7, npcDamageDice: "1d12", nd: 8, keep: "native", item: undefined, legacy2: {...f.actor.system.legacy2, nd: 8}});
  assert.equal(flags.transformation.active, false); assert.equal(f.actor.system.abilities.con.value, 7);
});

test("cache restoration follows source activity IDs after native embedded IDs are regenerated", async () => {
  const f=fixture(); const result=await recoverInactiveBeastEssenceUses(f.actor, new Map([["lr", 1]]), {itemFactory: f.itemFactory, idFactory: ids()});
  const [activity]=Object.values(f.source.system.activities);
  assert.notEqual(activity._id, "sourceActivity"); assert.equal(activity.flags[SCOPE].beastEssenceActivity.sourceActivityId, "sourceActivity");
  assert.equal(result.uses[0].activities.find(entry => entry.id==="sourceActivity").uses.spent, 0);
  assert(!result.uses[0].activities.some(entry => entry.id===activity._id));
});

test("active forms, missing integration and empty caches do not construct temporary documents", async () => {
  for (const change of [flags => flags.transformation.active=true, flags => flags.integrated=null, flags => flags.uses=[]]) {
    const f=fixture(); change(f.actor.flags[SCOPE].beastEssence);
    const result=await recoverInactiveBeastEssenceUses(f.actor, new Map([["lr", 1]]), {itemFactory: () => {throw Error("Unexpected shadow Item");}, idFactory: ids()});
    assert.equal(result, null);
  }
});

test("native lose-all recovery and authored maxima are preserved instead of blanket charge resets", async () => {
  const f=fixture(); const flags=f.actor.flags[SCOPE].beastEssence;
  flags.integrated.taxonomy.features[0].data.system.uses=uses(0, "lr", "loseAll"); flags.uses[0].uses=uses(1, "lr", "loseAll");
  const result=await recoverInactiveBeastEssenceUses(f.actor, new Map([["lr", 1]]), {itemFactory: f.itemFactory, idFactory: ids()});
  assert.equal(result.uses[0].uses.spent, 5); assert.equal(result.uses[0].uses.max, "5"); assert.equal(result.uses[0].uses.recovery[0].type, "loseAll");
});
